import {
  collection, doc, getDocs, getDoc,
  addDoc, updateDoc, deleteDoc, deleteField, setDoc,
  query, where, orderBy, limit, serverTimestamp, arrayUnion, arrayRemove, writeBatch, Timestamp
} from 'firebase/firestore/lite'
import { db, auth } from './config'

// ══ SCOPE: accesul pe imobil ═══════════════════════════════════
// AuthContext setează scope-ul la login. Administratorul vede tot;
// ceilalți utilizatori văd doar documentele cu imobilId din lista lor.
// Fiecare interogare a unui non-admin conține obligatoriu where('imobilId','==',X)
// (cerință a regulilor Firestore: regulile nu sunt filtre).
// ent = firmele emitente la care persoana are acces (câmpul acces[] de pe entitate)
let _scope = { admin: false, ids: [], ent: [] }
export const setScope = (s) => { _scope = { admin: !!s.admin, ids: s.ids || [], ent: s.ent || [] } }

const _map = (snap) => snap.docs.map(d => ({ ...d.data(), id: d.id }))

// Listează o colecție respectând scope-ul
const scoped = async (coll, constraints = [], imobilId = null) => {
  const q0 = (extra = []) => {
    const all = [...extra, ...constraints]
    return all.length ? query(collection(db, coll), ...all) : collection(db, coll)
  }
  if (_scope.admin) {
    return _map(await getDocs(q0(imobilId ? [where('imobilId', '==', imobilId)] : [])))
  }
  const ids = imobilId ? _scope.ids.filter(i => i === imobilId) : _scope.ids
  const out = new Map()
  await Promise.all(ids.map(async id => {
    const snap = await getDocs(q0([where('imobilId', '==', id)]))
    snap.docs.forEach(d => out.set(d.id, { ...d.data(), id: d.id }))
  }))
  return [...out.values()]
}

// ── Rezolvare imobilId pentru documente noi ────────────────────
const _spCache = new Map()
const imobilDinSpatiu = async (spatiuId) => {
  if (!spatiuId) return null
  if (_spCache.has(spatiuId)) return _spCache.get(spatiuId)
  const snap = await getDoc(doc(db, 'spatii', spatiuId))
  const v = snap.exists() ? (snap.data().imobilId || null) : null
  if (v) _spCache.set(spatiuId, v)
  return v
}
const cuImobil = async (data) => {
  if (data.imobilId) return data
  let id = await imobilDinSpatiu(data.spatiuId)
  if (!id && data.contorId) {
    const c = await getDoc(doc(db, 'contoare', data.contorId))
    id = c.exists() ? (c.data().imobilId || await imobilDinSpatiu(c.data().spatiuId)) : null
  }
  if (!id && data.clientId) {
    const c = await getDoc(doc(db, 'clienti', data.clientId))
    const arr = c.exists() ? (c.data().imobile || []) : []
    if (arr.length === 1) id = arr[0]
  }
  if (!id && !_scope.admin && _scope.ids.length === 1) id = _scope.ids[0]
  return id ? { ...data, imobilId: id } : data
}
// Leagă clientul de imobil (lista „imobile” de pe client) — doar adaugă, nu șterge (arhiva rămâne vizibilă)
export const legaClientDeImobil = async (clientId, imobilId) => {
  if (!clientId || !imobilId) return
  try { await updateDoc(doc(db, 'clienti', clientId), { imobile: arrayUnion(imobilId) }) }
  catch (e) { console.warn('legaClientDeImobil', e) }
}

// ── CLIENȚI ────────────────────────────────────────────────────
// Elimină recursiv câmpurile undefined — Firestore refuză addDoc/updateDoc cu undefined
const stripUndefined = (obj) => {
  const clean = {}
  Object.keys(obj).forEach(k => {
    if (obj[k] !== undefined) clean[k] = obj[k]
  })
  return clean
}

// ── ISTORIC MODIFICĂRI (audit) ─────────────────────────────────
// Scriere „best effort”: o eroare la audit nu trebuie să blocheze niciodată operația principală.
export const logAudit = async ({ actiune, tip, id, imobilId, rezumat, detalii }) => {
  try {
    const u = auth.currentUser
    if (!u) return
    await addDoc(collection(db, 'audit'), stripUndefined({
      at: serverTimestamp(), uid: u.uid, utilizator: (u.email || '').replace(/@rentis\.app$/, ''),
      actiune, tip, id, imobilId, rezumat: String(rezumat || '').slice(0, 300), detalii,
    }))
  } catch (e) { console.warn('audit', e) }
}
export const getAudit = async (n = 300) =>
  _map(await getDocs(query(collection(db, 'audit'), orderBy('at', 'desc'), limit(n))))

// ── BACKUP (doar administrator) ────────────────────────────────
const COLECTII_BACKUP = ['acces', 'audit', 'cereri_portal', 'citiri', 'clienti', 'comunicari', 'config', 'contoare', 'contracte_drafturi',
  'documente', 'emailuri', 'entitati_emitente', 'expeditori_email', 'facturari_lunare', 'imobile', 'indexuri_primite', 'istoric_spatiu',
  'note', 'note_calcul', 'portale', 'preturi_imobil', 'registru_contracte', 'serii_contracte', 'spatii', 'template_email',
  'templates_contracte', 'templates_nota', 'users']
const serializeaza = (v) => {
  if (v && typeof v.toDate === 'function') return v.toDate().toISOString()
  if (Array.isArray(v)) return v.map(serializeaza)
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, serializeaza(x)]))
  return v
}
export const exportaBackup = async (onProgress) => {
  if (!_scope.admin) throw new Error('Doar administratorul poate face backup.')
  const out = { creatLa: new Date().toISOString(), colectii: {} }
  for (const c of COLECTII_BACKUP) {
    onProgress?.(c)
    const snap = await getDocs(collection(db, c))
    // Cheile de integrare nu se exportă într-un fișier de pe calculator
    out.colectii[c] = snap.docs.filter(d => !(c === 'config' && d.id === 'fgo')).map(d => ({ id: d.id, ...serializeaza(d.data()) }))
  }
  return out
}

export const getClienti = async () => {
  const all = _map(await getDocs(collection(db, 'clienti')))
  if (_scope.admin) return all
  // Non-admin: doar clienții legați de imobilele lui (lista „imobile” de pe client)
  return all.filter(c => (c.imobile || []).some(i => _scope.ids.includes(i)))
}

export const getClient = async (id) => {
  const snap = await getDoc(doc(db, 'clienti', id))
  return snap.exists() ? { ...snap.data(), id: snap.id } : null
}

export const addClient = async (data) => {
  let imobile = Array.isArray(data.imobile) ? data.imobile : []
  if (imobile.length === 0 && !_scope.admin && _scope.ids.length === 1) imobile = [_scope.ids[0]]
  return await addDoc(collection(db, 'clienti'), {
    ...data,
    imobile,
    createdAt: serverTimestamp()
  })
}

export const updateClient = async (id, data) => {
  await updateDoc(doc(db, 'clienti', id), stripUndefined(data))
}

export const deleteClient = async (id) => {
  await deleteDoc(doc(db, 'clienti', id))
}

// ── EMAILURI TRIMISE ───────────────────────────────────────────
export const getEmailuriClient = async (clientId) => {
  return (await scoped('emailuri', [where('clientId', '==', clientId)])).sort((a, b) => (b.trimisLa?.seconds || 0) - (a.trimisLa?.seconds || 0))
}

export const saveEmail = async (emailData) => {
  return await addDoc(collection(db, 'emailuri'), {
    ...(await cuImobil(emailData)),
    trimisLa: serverTimestamp()
  })
}

// ── NOTE CONVERSAȚIE ───────────────────────────────────────────
export const getNoteClient = async (clientId) => {
  return (await scoped('note', [where('clientId', '==', clientId)])).sort((a, b) => (b.creatLa?.seconds || 0) - (a.creatLa?.seconds || 0))
}

export const addNota = async (clientId, text, autor) => {
  return await addDoc(collection(db, 'note'), {
    ...(await cuImobil({ clientId })),
    text,
    autor,
    creatLa: serverTimestamp()
  })
}

// ── CONFIGURARE FGO ────────────────────────────────────────────
export const getConfig = async () => {
  const snap = await getDoc(doc(db, 'config', 'fgo'))
  return snap.exists() ? snap.data() : {}
}

export const saveConfig = async (data) => {
  await updateDoc(doc(db, 'config', 'fgo'), data).catch(async () => {
    // doc doesn't exist yet — create it
    await setDoc(doc(db, 'config', 'fgo'), data)
  })
}

// ── IMOBILE ────────────────────────────────────────────────────
export const getImobile = async () => {
  if (_scope.admin) return _map(await getDocs(collection(db, 'imobile')))
  const rez = await Promise.all(_scope.ids.map(async id => {
    try { const s = await getDoc(doc(db, 'imobile', id)); return s.exists() ? { ...s.data(), id: s.id } : null }
    catch { return null }
  }))
  return rez.filter(Boolean)
}
export const addImobil = async (data) => {
  const ref = await addDoc(collection(db, 'imobile'), stripUndefined({ ...data, creatLa: serverTimestamp() }))
  return ref.id
}
export const updateImobil = async (id, data) =>
  updateDoc(doc(db, 'imobile', id), stripUndefined(data))
export const deleteImobil = async (id) =>
  deleteDoc(doc(db, 'imobile', id))

// ── SPAȚII ─────────────────────────────────────────────────────
export const getSpatii = async (imobilId = null) => scoped('spatii', [], imobilId)
export const addSpatiu = async (data) =>
  addDoc(collection(db, 'spatii'), stripUndefined({ ...data, creatLa: serverTimestamp() }))
export const updateSpatiu = async (id, data) =>
  updateDoc(doc(db, 'spatii', id), stripUndefined(data))
export const deleteSpatiu = async (id) =>
  deleteDoc(doc(db, 'spatii', id))

// ── CONTOARE ───────────────────────────────────────────────────
export const getContoare = async (spatiuId) => scoped('contoare', [where('spatiuId', '==', spatiuId)])
export const deleteContor = async (id) =>
  deleteDoc(doc(db, 'contoare', id))

// ── CITIRI ─────────────────────────────────────────────────────
export const getCitiri = async (contorId) => {
  return (await scoped('citiri', [where('contorId', '==', contorId)])).sort((a, b) => String(b.data || '').localeCompare(String(a.data || '')))
}

// ── USER PROFILES ──────────────────────────────────────────────
export const getUserProfile = async (uid) => {
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.exists() ? { ...snap.data(), id: snap.id } : null
}

export const getUsers = async () => {
  // Lista conturilor e vizibilă doar administratorului general
  if (!_scope.admin) return []
  const snap = await getDocs(collection(db, 'users'))
  return snap.docs.map(d => ({ ...d.data(), id: d.id }))
}

export const updateUserProfile = async (uid, data) => {
  await updateDoc(doc(db, 'users', uid), stripUndefined(data))
}

export const deleteUserProfile = async (uid) => {
  await deleteDoc(doc(db, 'users', uid))
}

// ── DOCUMENTE BIBLIOTECĂ ───────────────────────────────────────
export const getDocumente = async (entityType = null, entityId = null) => {
  const c = []
  if (entityType) c.push(where('entityType', '==', entityType))
  if (entityType && entityId) c.push(where('entityId', '==', entityId))
  // Sort client-side to avoid Firestore compound index requirement
  return (await scoped('documente', c))
    .sort((a, b) => (b.uploadatLa?.seconds || 0) - (a.uploadatLa?.seconds || 0))
}

const imobilDocument = async (data) => {
  if (data.imobilId) return data
  const t = data.entityType, id = data.entityId
  if (t === 'imobil' && id) return { ...data, imobilId: id }
  if (t === 'spatiu' && id) return cuImobil({ ...data, spatiuId: id })
  if (t === 'client' && id) return cuImobil({ ...data, clientId: id })
  return cuImobil(data)
}
export const addDocument = async (data) =>
  addDoc(collection(db, 'documente'), stripUndefined({ ...(await imobilDocument(data)), uploadatLa: serverTimestamp() }))

export const updateDocument = async (id, data) =>
  updateDoc(doc(db, 'documente', id), stripUndefined(data))

export const deleteDocument = async (id) =>
  deleteDoc(doc(db, 'documente', id))

// ── ACTIVARE / DEZACTIVARE CLIENT ─────────────────────────────
export const toggleClientActiv = async (clientId, activ, spatiuId = null) => {
  await updateDoc(doc(db, 'clienti', clientId), { activ })
  // Dacă dezactivat și are spațiu asociat → eliberează spațiul
  if (!activ && spatiuId) {
    await updateDoc(doc(db, 'spatii', spatiuId), {
      clientId: '',
      status: 'Liber'
    })
  }
}

// ── CLIENȚI PER SPAȚIU ────────────────────────────────────────
// spatiuClienti: [{ clientId, rol, activ }]
export const addClientToSpatiu = async (spatiuId, clientId, rol = 'Chiriaș principal', dataStart = '', dataFinal = '') => {
  const snap = await getDoc(doc(db, 'spatii', spatiuId))
  if (!snap.exists()) return
  const data = snap.data()
  const clienti = data.clienti || (data.clientId ? [{ clientId: data.clientId, rol: 'Chiriaș principal', activ: true }] : [])
  // Avoid duplicates
  if (clienti.find(c => c.clientId === clientId)) return
  clienti.push(stripUndefined({ clientId, rol, activ: true, dataStart, dataFinal }))
  await updateDoc(doc(db, 'spatii', spatiuId), {
    clienti,
    clientId: clienti.find(c => c.rol === 'Chiriaș principal')?.clientId || clienti[0]?.clientId || '',
    status: 'Ocupat'
  })
  await legaClientDeImobil(clientId, data.imobilId)
}

export const removeClientFromSpatiu = async (spatiuId, clientId) => {
  const snap = await getDoc(doc(db, 'spatii', spatiuId))
  if (!snap.exists()) return
  const data = snap.data()
  const clienti = (data.clienti || []).filter(c => c.clientId !== clientId)
  const principal = clienti.find(c => c.rol === 'Chiriaș principal')?.clientId || clienti[0]?.clientId || ''
  await updateDoc(doc(db, 'spatii', spatiuId), {
    clienti,
    clientId: principal,
    status: clienti.length > 0 ? 'Ocupat' : 'Liber'
  })
}

export const updateClientRolInSpatiu = async (spatiuId, clientId, rol) => {
  const snap = await getDoc(doc(db, 'spatii', spatiuId))
  if (!snap.exists()) return
  const data = snap.data()
  const clienti = (data.clienti || []).map(c => c.clientId === clientId ? { ...c, rol } : c)
  const principal = clienti.find(c => c.rol === 'Chiriaș principal')?.clientId || clienti[0]?.clientId || ''
  await updateDoc(doc(db, 'spatii', spatiuId), { clienti, clientId: principal })
}

// Editează datele de început/final ale contractului pentru un client asociat unui spațiu.
// dataStart/dataFinal sunt string-uri 'YYYY-MM-DD' sau '' dacă nu sunt setate (contract nedeterminat/necunoscut).
export const updateContractClient = async (spatiuId, clientId, { dataStart, dataFinal }) => {
  const snap = await getDoc(doc(db, 'spatii', spatiuId))
  if (!snap.exists()) return
  const data = snap.data()
  const clienti = (data.clienti || []).map(c =>
    c.clientId === clientId ? { ...c, dataStart: dataStart ?? c.dataStart ?? '', dataFinal: dataFinal ?? c.dataFinal ?? '' } : c
  )
  await updateDoc(doc(db, 'spatii', spatiuId), { clienti })
  // Sincronizare inversă: actualizează rândurile din registrul de contracte legate de acest spațiu + client
  try { await syncRegistruDinSpatiu(spatiuId, clientId, { dataStart, dataFinal }) } catch (e) { console.error('sync registru', e) }
}

// ── REGISTRU CONTRACTE (comercial / rezidential) ──────────────
export const getRegistru = async (registru) => {
  return scoped('registru_contracte', [where('registru', '==', registru)])
}

// Salvează un rând și sincronizează datele contractului cu asocierea client–spațiu
export const saveRegistruRand = async (data0) => {
  const { id, ...rest } = await cuImobil(data0)
  let rid = id
  if (id) {
    let prev = null
    try { const ps = await getDoc(doc(db, 'registru_contracte', id)); prev = ps.exists() ? ps.data() : null } catch { /* audit opțional */ }
    await updateDoc(doc(db, 'registru_contracte', id), stripUndefined({ ...rest, updatedAt: serverTimestamp() }))
    if (prev) {
      const CAMPURI = ['chirie', 'moneda', 'dataStart', 'dataFinal', 'entitate', 'factActiv', 'activManual', 'tva', 'tipScadenta', 'valScadenta', 'indexabil', 'spatiuId', 'clientId']
      const dif = {}
      CAMPURI.forEach(k => { const a = prev[k] ?? '', b = rest[k] ?? ''; if (String(a) !== String(b)) dif[k] = { de: String(a), la: String(b) } })
      if (Object.keys(dif).length) logAudit({
        actiune: dif.chirie ? 'chirie_modificata' : 'contract_modificat', tip: 'contract', id, imobilId: rest.imobilId,
        rezumat: `${rest.numar || rest.nume}: ${Object.entries(dif).map(([k, v]) => `${k} ${v.de || '—'} → ${v.la || '—'}`).join('; ')}`, detalii: dif,
      })
    }
  } else {
    const ref = await addDoc(collection(db, 'registru_contracte'), stripUndefined({ ...rest, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }))
    rid = ref.id
    logAudit({ actiune: 'contract_nou', tip: 'contract', id: rid, imobilId: rest.imobilId, rezumat: `${rest.numar || rest.nume} (${rest.nume || ''}) — chirie ${rest.chirie || '—'} ${rest.moneda || ''}` })
  }
  if (rest.spatiuId && rest.clientId) {
    const snap = await getDoc(doc(db, 'spatii', rest.spatiuId))
    if (snap.exists()) {
      const clienti = snap.data().clienti || []
      if (clienti.some(c => c.clientId === rest.clientId)) {
        await updateDoc(doc(db, 'spatii', rest.spatiuId), {
          clienti: clienti.map(c => c.clientId === rest.clientId
            ? { ...c, dataStart: rest.dataStart || '', dataFinal: rest.dataFinal || '' } : c)
        })
      } else if (rest.activManual !== false) {
        await addClientToSpatiu(rest.spatiuId, rest.clientId, 'Chiriaș principal', rest.dataStart || '', rest.dataFinal || '')
      }
    }
  }
  return rid
}

export const setEntitateRegistru = async (ids, entitate) => {
  for (const id of ids) await updateDoc(doc(db, 'registru_contracte', id), { entitate, updatedAt: serverTimestamp() })
}

export const deleteRegistruRand = async (id) => {
  await deleteDoc(doc(db, 'registru_contracte', id))
  logAudit({ actiune: 'contract_sters', tip: 'contract', id, rezumat: `Contract șters (${id})` })
}

export const syncRegistruDinSpatiu = async (spatiuId, clientId, { dataStart, dataFinal }) => {
  const rows = await scoped('registru_contracte', [where('spatiuId', '==', spatiuId)])
  for (const d0 of rows) {
    const d = { id: d0.id, data: () => d0 }
    if (d.data().clientId !== clientId) continue
    await updateDoc(doc(db, 'registru_contracte', d.id), {
      dataStart: dataStart ?? d.data().dataStart ?? '', dataFinal: dataFinal ?? d.data().dataFinal ?? '',
      updatedAt: serverTimestamp()
    })
  }
}

// ── ENTITĂȚI EMITENTE (firmele care facturează) ───────────────
// Configurarea o face doar administratorul. Fiecare entitate are acces[] = lista persoanelor care o văd și o folosesc
// (facturare + documente). Legătura cu contractul: câmpul „entitate” (numele) din registru.
export const getEntitatiEmitente = async () => {
  const snap = _scope.admin
    ? await getDocs(collection(db, 'entitati_emitente'))
    : await getDocs(query(collection(db, 'entitati_emitente'), where('acces', 'array-contains', auth.currentUser?.uid || '_')))
  return _map(snap).sort((a, b) => String(a.nume).localeCompare(String(b.nume)))
}
// Folosit la login, înainte ca scope-ul să fie setat
export const getEntitatiAccesUser = async (uid) =>
  _map(await getDocs(query(collection(db, 'entitati_emitente'), where('acces', 'array-contains', uid)))).map(e => e.id)

export const saveEntitateEmitenta = async (data) => {
  const { id, acces, ...rest } = data     // acces[] se modifică doar din „Acces imobile” (setAccesEntitate)
  if (id) { await updateDoc(doc(db, 'entitati_emitente', id), stripUndefined({ ...rest, updatedAt: serverTimestamp() })); return id }
  const ref = await addDoc(collection(db, 'entitati_emitente'), stripUndefined({ ...rest, acces: acces || [], creatLa: serverTimestamp() }))
  return ref.id
}
export const deleteEntitateEmitenta = async (id) => deleteDoc(doc(db, 'entitati_emitente', id))

// Administratorul dă / retrage accesul unei persoane la o firmă emitentă
export const setAccesEntitate = async (entitateId, uid, on) =>
  updateDoc(doc(db, 'entitati_emitente', entitateId), { acces: on ? arrayUnion(uid) : arrayRemove(uid) })

// Documentele firmei (registrul firmei): nu au imobil, accesul se verifică pe entitate
export const getDocumenteEntitate = async (entitateId) =>
  _map(await getDocs(query(collection(db, 'documente'), where('entityType', '==', 'entitate'), where('entityId', '==', entitateId))))
    .sort((a, b) => (b.uploadatLa?.seconds || 0) - (a.uploadatLa?.seconds || 0))
export const addDocumentEntitate = async (data) =>
  addDoc(collection(db, 'documente'), stripUndefined({ ...data, entityType: 'entitate', uploadatLa: serverTimestamp() }))

// ── FACTURARE LUNARĂ (evidența chiriilor facturate) ───────────
// ID determinist contract+lună → o chirie nu poate fi marcată de două ori
export const getFacturariLuna = async (luna) => {
  if (_scope.admin) return scoped('facturari_lunare', [where('luna', '==', luna)])
  // Regulile cer filtru explicit pe firmă (și pe imobil, adăugat de scoped)
  const out = new Map()
  await Promise.all((_scope.ent || []).map(async eid => {
    (await scoped('facturari_lunare', [where('luna', '==', luna), where('entitateId', '==', eid)])).forEach(f => out.set(f.id, f))
  }))
  return [...out.values()]
}

export const saveFacturareLuna = async (data) => {
  const id = `${data.contractId}_${data.luna}`
  await setDoc(doc(db, 'facturari_lunare', id), stripUndefined({ ...data, updatedAt: serverTimestamp(), creatLa: serverTimestamp() }), { merge: true })
  return id
}
export const updateFacturareLuna = async (id, data) =>
  updateDoc(doc(db, 'facturari_lunare', id), stripUndefined({ ...data, updatedAt: serverTimestamp() }))
export const deleteFacturareLuna = async (id) => deleteDoc(doc(db, 'facturari_lunare', id))

// Actualizează câmpuri ale unui contract din registru (facturare, indexare)
export const updateRegistruCampuri = async (id, data) =>
  updateDoc(doc(db, 'registru_contracte', id), stripUndefined({ ...data, updatedAt: serverTimestamp() }))

// ── TEMPLATE NOTE DE CALCUL ────────────────────────────────────
export const getTemplate = async (spatiuId) => {
  const rows = await scoped('templates_nota', [where('spatiuId', '==', spatiuId)])
  return rows.length ? rows[0] : null
}

export const saveTemplate = async (spatiuId, data) => {
  const existing = await getTemplate(spatiuId)
  if (existing) {
    await updateDoc(doc(db, 'templates_nota', existing.id), { ...data, updatedAt: serverTimestamp() })
    return existing.id
  } else {
    const ref = await addDoc(collection(db, 'templates_nota'), stripUndefined({ ...(await cuImobil({ ...data, spatiuId })), createdAt: serverTimestamp() }))
    return ref.id
  }
}

// ── NOTA DE CALCUL EMISE ───────────────────────────────────────
export const getNoteCalcul = async (spatiuId = null) => {
  return (await scoped('note_calcul', spatiuId ? [where('spatiuId', '==', spatiuId)] : []))
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
}

export const saveNotaCalcul = async (data) =>
  addDoc(collection(db, 'note_calcul'), stripUndefined({ ...(await cuImobil(data)), createdAt: serverTimestamp() }))

// ── ISTORIC SPATIU ─────────────────────────────────────────────
export const getIstoricSpatiu = async (spatiuId) => {
  return (await scoped('istoric_spatiu', [where('spatiuId', '==', spatiuId)]))
    .sort((a, b) => (b.dataStart?.seconds || 0) - (a.dataStart?.seconds || 0))
}

export const addIstoricEntry = async (data) =>
  addDoc(collection(db, 'istoric_spatiu'), stripUndefined({ ...(await cuImobil(data)), createdAt: serverTimestamp() }))

export const updateIstoricEntry = async (id, data) =>
  updateDoc(doc(db, 'istoric_spatiu', id), stripUndefined(data))

// ── PREȚURI PER IMOBIL ─────────────────────────────────────────
export const getPreturiImobil = async (imobilId) => {
  const snap = await getDoc(doc(db, 'preturi_imobil', imobilId))
  return snap.exists() ? snap.data() : {}
}

export const savePreturiImobil = async (imobilId, preturi) => {
  await setDoc(doc(db, 'preturi_imobil', imobilId), preturi, { merge: true })
}

// ── CONTOARE REPROIECTATE ─────────────────────────────────────
// mod: 'index' | 'fix' | 'bloc'
export const getContoareSpatiu = async (spatiuId) => {
  return (await scoped('contoare', [where('spatiuId', '==', spatiuId)]))
    .sort((a, b) => (a.ordine || 0) - (b.ordine || 0))
}

export const saveContor = async (data) => {
  if (data.id) {
    const { id, ...rest } = data
    await updateDoc(doc(db, 'contoare', id), stripUndefined(rest))
    return id
  }
  const ref = await addDoc(collection(db, 'contoare'), stripUndefined({ ...(await cuImobil(data)), creatLa: serverTimestamp() }))
  return ref.id
}

// ── CITIRI REPROIECTATE ───────────────────────────────────────
export const getCitiriContor = async (contorId) => {
  return (await scoped('citiri', [where('contorId', '==', contorId)]))
    .sort((a, b) => b.data?.localeCompare?.(a.data) || 0)
}

export const getCitiriSpatiu2 = async (spatiuId) => {
  return (await scoped('citiri', [where('spatiuId', '==', spatiuId)]))
    .sort((a, b) => b.data?.localeCompare?.(a.data) || 0)
}

export const saveCitire = async (data) => {
  const d = await cuImobil(data)
  const ref = await addDoc(collection(db, 'citiri'), stripUndefined({ ...d, creatLa: serverTimestamp() }))
  // Actualizează „instantaneul” din portalul chiriașului (best-effort, nu blochează salvarea)
  if (d.spatiuId) refreshPortalSnapshot(d.spatiuId).catch(() => {})
  return ref
}

export const deleteCitire2 = async (id) =>
  deleteDoc(doc(db, 'citiri', id))

// ── PORTALE CHIRIAȘI ───────────────────────────────────────────
// Documentul portalului are ID-ul = token (lung, aleatoriu). Chiriașul citește DOAR acest
// document (după ID), nu poate lista colecția și nu atinge contoare/citiri direct.
export const getPortalPublic = async (token) => {
  if (!token || token.includes('/')) return null
  const snap = await getDoc(doc(db, 'portale', token))
  return snap.exists() ? { ...snap.data(), id: snap.id } : null
}
export const getPortalBySpatiu = async (spatiuId) => {
  const rows = await scoped('portale', [where('spatiuId', '==', spatiuId)])
  return rows.length ? rows[0] : null
}
export const getPortale = async () => scoped('portale')

export const genTokenPortal = () => {
  const a = new Uint8Array(24)
  crypto.getRandomValues(a)
  return Array.from(a, b => b.toString(36).padStart(2, '0')).join('').slice(0, 32)
}

// Calculează valabilitatea linkului = finalul contractului (null = fără expirare)
const valabilitatePortal = (spatiu) => {
  const activi = (spatiu?.clienti || []).filter(c => c.activ !== false)
  if (activi.length === 0) return null
  let max = ''
  for (const c of activi) {
    if (!c.dataFinal) return null          // contract pe perioadă nedeterminată
    if (c.dataFinal > max) max = c.dataFinal
  }
  const d = new Date(max + 'T23:59:59')
  return isNaN(d.getTime()) ? null : { text: max, ts: d }
}

const snapshotPortal = async (spatiuId) => {
  const [spSnap, ct, ci] = await Promise.all([
    getDoc(doc(db, 'spatii', spatiuId)),
    getContoareSpatiu(spatiuId),
    getCitiriSpatiu2(spatiuId),
  ])
  const sp = spSnap.exists() ? { ...spSnap.data(), id: spSnap.id } : null
  const contoare = ct.filter(c => c.mod === 'index').map(c => {
    const ultima = ci.filter(x => x.contorId === c.id)[0]   // deja sortate descrescător după dată
    return stripUndefined({
      id: c.id, denumire: c.denumire || c.tip || '', tip: c.tip || '', um: c.um || '',
      ultimIndex: ultima?.index ?? null, ultimaData: ultima?.data || null,
    })
  })
  const v = valabilitatePortal(sp)
  return {
    imobilId: sp?.imobilId || '',
    spatiuDenumire: sp?.denumire || '',
    contoare,
    valabilPana: v ? v.text : '',
    valabilPanaTs: v ? v.ts : null,
    snapshotLa: serverTimestamp(),
  }
}

export const refreshPortalSnapshot = async (spatiuId) => {
  const p = await getPortalBySpatiu(spatiuId)
  if (!p) return
  await updateDoc(doc(db, 'portale', p.id), await snapshotPortal(spatiuId))
}

export const savePortal = async (data) => {
  const { id: _i, ...rest } = data
  const snap = await snapshotPortal(rest.spatiuId)
  const existing = await getPortalBySpatiu(rest.spatiuId)
  const token = rest.token
  const payload = stripUndefined({ ...(existing || {}), ...rest, ...snap, token, id: undefined })
  await setDoc(doc(db, 'portale', token), { ...payload, createdAt: existing?.createdAt || serverTimestamp() })
  // Token regenerat → ștergem documentul vechi (linkul vechi nu mai funcționează)
  if (existing && existing.id !== token) await deleteDoc(doc(db, 'portale', existing.id))
  return token
}
export const setPortalActiv = async (token, activ) => updateDoc(doc(db, 'portale', token), { activ })

// ── CERERI PORTAL (sesizări, informări, documente trimise de chiriaș) ──
export const saveCererePortal = async (data) =>
  addDoc(collection(db, 'cereri_portal'), stripUndefined({ ...data, status: 'nou', dataTrimis: serverTimestamp() }))
export const getCereriPortal = async (status = null) =>
  (await scoped('cereri_portal', status ? [where('status', '==', status)] : []))
    .sort((a, b) => (b.dataTrimis?.seconds || 0) - (a.dataTrimis?.seconds || 0))
export const updateCererePortal = async (id, data) => updateDoc(doc(db, 'cereri_portal', id), stripUndefined(data))
export const deleteCererePortal = async (id) => deleteDoc(doc(db, 'cereri_portal', id))

// ── INDEXURI PRIMITE ───────────────────────────────────────────
export const getIndexuriPrimite = async (status = null) => {
  return (await scoped('indexuri_primite', status ? [where('status', '==', status)] : []))
    .sort((a, b) => (b.dataTrimis?.seconds || 0) - (a.dataTrimis?.seconds || 0))
}

export const saveIndexPrimit = async (data) =>
  addDoc(collection(db, 'indexuri_primite'), stripUndefined({ ...data, dataTrimis: serverTimestamp() }))

export const updateIndexPrimit = async (id, data) =>
  updateDoc(doc(db, 'indexuri_primite', id), stripUndefined(data))

export const deleteIndexPrimit = async (id) =>
  deleteDoc(doc(db, 'indexuri_primite', id))

// ── MOD SPAȚIU (nota / factura) ───────────────────────────────
export const updateSpatiuMod = async (spatiuId, mod) =>
  updateDoc(doc(db, 'spatii', spatiuId), { modUtilitati: mod })

// ── EXPORT DATE CONTOARE ───────────────────────────────────────
export const getAllContoareCuCitiri = async () => {
  const [ct, ci] = await Promise.all([scoped('contoare'), scoped('citiri')])
  return ct.map(c => ({
    ...c,
    citiri: ci
      .filter(x => x.contorId === c.id)
      .sort((a, b) => b.data?.localeCompare?.(a.data) || 0)
  }))
}

// ── SERII CONTRACTE ────────────────────────────────────────────
export const getSeriiContracte = async () => {
  const snap = await getDocs(collection(db, 'serii_contracte'))
  return snap.docs.map(d => ({ ...d.data(), id: d.id })).sort((a, b) => a.nume.localeCompare(b.nume))
}

export const addSerieContract = async (nume) =>
  addDoc(collection(db, 'serii_contracte'), { nume, ultimulNumar: 0, createdAt: serverTimestamp() })

export const deleteSerieContract = async (id) =>
  deleteDoc(doc(db, 'serii_contracte', id))

export const getNextNumarSerie = async (serieId) => {
  const ref = doc(db, 'serii_contracte', serieId)
  const snap = await getDoc(ref)
  const current = snap.exists() ? (snap.data().ultimulNumar || 0) : 0
  const next = current + 1
  await updateDoc(ref, { ultimulNumar: next })
  return next
}

export const updateNumarSerie = async (serieId, numar) =>
  updateDoc(doc(db, 'serii_contracte', serieId), { ultimulNumar: numar })

// ── TEMPLATE-URI CONTRACTE ─────────────────────────────────────
export const getTemplateContracte = async () => {
  const snap = await getDocs(collection(db, 'templates_contracte'))
  return snap.docs.map(d => ({ ...d.data(), id: d.id })).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
}

export const addTemplateContract = async (data) =>
  addDoc(collection(db, 'templates_contracte'), stripUndefined({ ...data, createdAt: serverTimestamp() }))

export const deleteTemplateContract = async (id) =>
  deleteDoc(doc(db, 'templates_contracte', id))

// ── DRAFTURI CONTRACTE ─────────────────────────────────────────
export const getDrafturiContracte = async () => {
  return (await scoped('contracte_drafturi')).sort((a, b) => (b.updatedAt?.seconds || b.createdAt?.seconds || 0) - (a.updatedAt?.seconds || a.createdAt?.seconds || 0))
}

export const getDraftContract = async (id) => {
  const snap = await getDoc(doc(db, 'contracte_drafturi', id))
  return snap.exists() ? { ...snap.data(), id: snap.id } : null
}

export const saveDraftContract = async (data) => {
  const { id, ...rest } = await cuImobil(data)
  if (id) {
    await updateDoc(doc(db, 'contracte_drafturi', id), stripUndefined({ ...rest, updatedAt: serverTimestamp() }))
    return id
  }
  const ref = await addDoc(collection(db, 'contracte_drafturi'), stripUndefined({ ...rest, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }))
  return ref.id
}

export const deleteDraftContract = async (id) =>
  deleteDoc(doc(db, 'contracte_drafturi', id))

// ── MIGRARE DATE VECHI ────────────────────────────────────────
// Copiază câmpul 'tip' → 'denumire' pentru contoarele vechi
// Rulează o singură dată, safe să fie repetat (idempotent)
export const migreazaContoare = async (onProgress) => {
  const snap = await getDocs(collection(db, 'contoare'))
  const docs = snap.docs.map(d => ({ ...d.data(), id: d.id }))
  
  const deUpdate = docs.filter(d => !d.denumire && d.tip)
  const deja     = docs.filter(d => d.denumire)
  const fara     = docs.filter(d => !d.denumire && !d.tip)

  onProgress?.({ total: docs.length, deUpdate: deUpdate.length, deja: deja.length, fara: fara.length, pas: 'analiza' })

  if (deUpdate.length === 0) {
    onProgress?.({ pas: 'gata', migrat: 0, total: docs.length })
    return { migrat: 0, total: docs.length, deja: deja.length }
  }

  let migrat = 0
  for (const d of deUpdate) {
    await updateDoc(doc(db, 'contoare', d.id), {
      denumire:    d.tip,
      destinatie:  d.destinatie || 'chirias',
      mod:         d.mod || 'index',
    })
    migrat++
    onProgress?.({ pas: 'migrat', migrat, total: deUpdate.length })
  }

  onProgress?.({ pas: 'gata', migrat, total: docs.length })
  return { migrat, total: docs.length, deja: deja.length, fara: fara.length }
}

// Repară drafturile de contract salvate anterior cu câmpul intern 'id' corupt (null/undefined),
// bug cauzat de o versiune veche a saveDraftContract. Elimină doar câmpul 'id' din interiorul
// documentului — id-ul real al documentului Firestore (folosit pentru editare/ștergere) rămâne intact.
export const repairDrafturiContracte = async (onProgress) => {
  const snap = await getDocs(collection(db, 'contracte_drafturi'))
  const docs = snap.docs.map(d => ({ docId: d.id, ...d.data() }))
  const corupte = docs.filter(d => 'id' in d)

  onProgress?.({ total: docs.length, corupte: corupte.length, pas: 'analiza' })

  if (corupte.length === 0) {
    onProgress?.({ pas: 'gata', reparat: 0, total: docs.length })
    return { reparat: 0, total: docs.length }
  }

  let reparat = 0
  for (const d of corupte) {
    // updateDoc face merge parțial — omiterea câmpului 'id' din payload NU îl șterge din document.
    // Trebuie folosit explicit deleteField() ca să dispară efectiv câmpul corupt.
    await updateDoc(doc(db, 'contracte_drafturi', d.docId), { id: deleteField() })
    reparat++
    onProgress?.({ pas: 'reparat', reparat, total: corupte.length })
  }

  onProgress?.({ pas: 'gata', reparat, total: docs.length })
  return { reparat, total: docs.length }
}

// ── RAPOARTE ───────────────────────────────────────────────────
export const getCitiriPentruRaport = async (spatiuIds = [], dataStart = null, dataStop = null) => {
  // Citiri pentru lista de spații, filtrate pe perioadă
  let citiri = await scoped('citiri')
  if (spatiuIds.length > 0) citiri = citiri.filter(c => spatiuIds.includes(c.spatiuId))
  if (dataStart) citiri = citiri.filter(c => c.data >= dataStart)
  if (dataStop)  citiri = citiri.filter(c => c.data <= dataStop)
  return citiri.sort((a, b) => b.data?.localeCompare?.(a.data) || 0)
}


// ── COMUNICARE (email) ─────────────────────────────────────────
const _lista = async (col) => (await getDocs(collection(db, col))).docs.map(d => ({ ...d.data(), id: d.id }))
const _salveaza = async (col, data) => {
  const { id, ...rest } = data
  if (id) { await updateDoc(doc(db, col, id), stripUndefined({ ...rest, updatedAt: serverTimestamp() })); return id }
  const ref = await addDoc(collection(db, col), stripUndefined({ ...rest, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }))
  return ref.id
}
export const getExpeditori = () => _lista('expeditori_email')
export const saveExpeditor = (d) => _salveaza('expeditori_email', d)
export const deleteExpeditor = (id) => deleteDoc(doc(db, 'expeditori_email', id))
export const getTemplateEmail = () => _lista('template_email')
export const saveTemplateEmail = (d) => _salveaza('template_email', d)
export const deleteTemplateEmail = (id) => deleteDoc(doc(db, 'template_email', id))
export const getComunicari = async () =>
  (await scoped('comunicari')).sort((a, b) => (b.trimisLa?.seconds || 0) - (a.trimisLa?.seconds || 0))
export const getComunicariClient = async (clientId) => {
  return scoped('comunicari', [where('clientId', '==', clientId)])
}
export const addComunicare = async (d) =>
  addDoc(collection(db, 'comunicari'), stripUndefined({ ...(await cuImobil(d)), trimisLa: serverTimestamp() }))


// ══ ACCES PE IMOBIL ════════════════════════════════════════════
// acces/{uid} = { imobile: { imobilId: 1|2|3 }, nume, email } — doar administratorul general îl modifică
// 1 = Vizualizare, 2 = Operare, 3 = Administrare
export const NIVELURI = { 0: 'Fără acces', 1: 'Vizualizare', 2: 'Operare', 3: 'Administrare' }

export const getAccesUser = async (uid) => {
  const snap = await getDoc(doc(db, 'acces', uid))
  return snap.exists() ? { ...snap.data(), id: snap.id } : null
}
export const getAllAcces = async () => _map(await getDocs(collection(db, 'acces')))

export const setAcces = async (uid, info, imobilId, nivel) => {
  const ref = doc(db, 'acces', uid)
  const snap = await getDoc(ref)
  const cur = snap.exists() ? snap.data() : { imobile: {}, adm: [] }
  const imobile = { ...(cur.imobile || {}) }
  if (nivel > 0) imobile[imobilId] = nivel; else delete imobile[imobilId]
  await setDoc(ref, stripUndefined({
    ...cur, imobile, adm: [],
    nume: info?.nume ?? cur.nume, email: info?.email ?? cur.email,
    updatedAt: serverTimestamp(),
  }))
}

// ── Profil administrator (doar la migrare, pentru contul care o rulează) ──
export const asigurăProfilAdmin = async (uid, email) => {
  const r = doc(db, 'users', uid)
  if ((await getDoc(r)).exists()) return false
  await setDoc(r, { nume: email, email, rol: 'admin', activ: true, creatLa: serverTimestamp() })
  return true
}

// ══ MIGRARE: imobilId pe toate datele (idempotentă) ════════════
export const migreazaImobilId = async (onProgress, { uid, email } = {}) => {
  if (!_scope.admin) throw new Error('Doar administratorul poate rula migrarea.')
  const all = async (c) => _map(await getDocs(collection(db, c)))
  const rap = { actualizate: 0, clientiLegati: 0, nealocate: {}, portale: 0, profilAdmin: false }
  const nea = (c) => { rap.nealocate[c] = (rap.nealocate[c] || 0) + 1 }

  onProgress?.({ pas: 'Citesc spațiile și clienții…' })
  const spatii = await all('spatii')
  const spImobil = new Map(spatii.map(sp => [sp.id, sp.imobilId || '']))
  const contoare = await all('contoare')
  const ctImobil = new Map(contoare.map(c => [c.id, c.imobilId || spImobil.get(c.spatiuId) || '']))

  // client → imobile (din spații, registru, istoric)
  const clImob = new Map()
  const leaga = (cid, iid) => { if (!cid || !iid) return; if (!clImob.has(cid)) clImob.set(cid, new Set()); clImob.get(cid).add(iid) }
  for (const sp of spatii) {
    for (const c of (sp.clienti || [])) leaga(c.clientId, sp.imobilId)
    leaga(sp.clientId, sp.imobilId)
  }
  const registru = await all('registru_contracte')
  for (const r of registru) leaga(r.clientId, r.imobilId || spImobil.get(r.spatiuId))
  const istoric = await all('istoric_spatiu')
  for (const r of istoric) leaga(r.clientId, r.imobilId || spImobil.get(r.spatiuId))
  const clienti = await all('clienti')
  for (const c of clienti) for (const i of (c.imobile || [])) leaga(c.id, i)
  const unicClient = (cid) => { const st = clImob.get(cid); return st && st.size === 1 ? [...st][0] : '' }

  onProgress?.({ pas: 'Leg clienții de imobile…' })
  for (const c of clienti) {
    const nou = [...(clImob.get(c.id) || [])]
    const vechi = c.imobile || []
    if (nou.length !== vechi.length || nou.some(i => !vechi.includes(i))) {
      await updateDoc(doc(db, 'clienti', c.id), { imobile: nou }); rap.clientiLegati++
    }
  }

  const deLa = (d) => d.imobilId || spImobil.get(d.spatiuId) || ctImobil.get(d.contorId) || unicClient(d.clientId) || ''
  const colectii = ['contoare', 'citiri', 'note_calcul', 'templates_nota', 'istoric_spatiu', 'indexuri_primite',
    'registru_contracte', 'contracte_drafturi', 'note', 'emailuri', 'comunicari']
  for (const coll of colectii) {
    onProgress?.({ pas: `Completez ${coll}…` })
    const rows = coll === 'contoare' ? contoare : coll === 'registru_contracte' ? registru : coll === 'istoric_spatiu' ? istoric : await all(coll)
    for (const d of rows) {
      if (d.imobilId) continue
      const id = deLa(d)
      if (id) { await updateDoc(doc(db, coll, d.id), { imobilId: id }); rap.actualizate++ } else nea(coll)
    }
  }
  onProgress?.({ pas: 'Completez documentele…' })
  for (const d of await all('documente')) {
    if (d.imobilId) continue
    const id = d.entityType === 'imobil' ? d.entityId : d.entityType === 'client' ? unicClient(d.entityId) : ''
    if (id) { await updateDoc(doc(db, 'documente', d.id), { imobilId: id }); rap.actualizate++ } else nea('documente')
  }

  onProgress?.({ pas: 'Actualizez portalurile chiriașilor…' })
  for (const p of await all('portale')) {
    if (!p.token || !p.spatiuId) { nea('portale'); continue }
    const snap = await snapshotPortal(p.spatiuId)
    const { id, ...rest } = p
    await setDoc(doc(db, 'portale', p.token), stripUndefined({ ...rest, ...snap, activ: p.activ !== false }))
    if (id !== p.token) await deleteDoc(doc(db, 'portale', id))
    rap.portale++
  }

  if (uid) {
    rap.profilAdmin = await asigurăProfilAdmin(uid, email || '')
  }
  onProgress?.({ pas: 'Gata' })
  return rap
}


// ══ ADMINISTRARE MENIU ═════════════════════════════════════════
// config/meniu = { standard: {cheie:{d,m,h}}, ordine:[...], bara:[...], persoane:{uid:{cheie:{d,m,h}}} }
export const getMeniuConfig = async () => {
  const snap = await getDoc(doc(db, 'config', 'meniu'))
  return snap.exists() ? snap.data() : {}
}
export const saveMeniuConfig = async (cfg) => {
  const { updatedAt: _u, ...curat } = JSON.parse(JSON.stringify(cfg))
  await setDoc(doc(db, 'config', 'meniu'), { ...curat, updatedAt: serverTimestamp() })
}
