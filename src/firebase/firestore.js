import {
  collection, doc, getDocs, getDoc,
  addDoc, updateDoc, deleteDoc,
  query, where, orderBy, serverTimestamp
} from 'firebase/firestore'
import { db } from './config'

// ── CLIENȚI ────────────────────────────────────────────────────
export const getClienti = async () => {
  const snap = await getDocs(collection(db, 'clienti'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export const getClient = async (id) => {
  const snap = await getDoc(doc(db, 'clienti', id))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export const addClient = async (data) => {
  return await addDoc(collection(db, 'clienti'), {
    ...data,
    createdAt: serverTimestamp()
  })
}

export const updateClient = async (id, data) => {
  await updateDoc(doc(db, 'clienti', id), data)
}

export const deleteClient = async (id) => {
  await deleteDoc(doc(db, 'clienti', id))
}

// ── EMAILURI TRIMISE ───────────────────────────────────────────
export const getEmailuriClient = async (clientId) => {
  const q = query(
    collection(db, 'emailuri'),
    where('clientId', '==', clientId),
    orderBy('trimisLa', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export const saveEmail = async (emailData) => {
  return await addDoc(collection(db, 'emailuri'), {
    ...emailData,
    trimisLa: serverTimestamp()
  })
}

// ── NOTE CONVERSAȚIE ───────────────────────────────────────────
export const getNoteClient = async (clientId) => {
  const q = query(
    collection(db, 'note'),
    where('clientId', '==', clientId),
    orderBy('creatLa', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export const addNota = async (clientId, text, autor) => {
  return await addDoc(collection(db, 'note'), {
    clientId,
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
    const { setDoc } = await import("firebase/firestore")
    await setDoc(doc(db, 'config', 'fgo'), data)
  })
}

// ── IMOBILE ────────────────────────────────────────────────────
export const getImobile = async () => {
  const snap = await getDocs(collection(db, 'imobile'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}
export const addImobil = async (data) =>
  addDoc(collection(db, 'imobile'), { ...data, creatLa: serverTimestamp() })
export const updateImobil = async (id, data) =>
  updateDoc(doc(db, 'imobile', id), data)
export const deleteImobil = async (id) =>
  deleteDoc(doc(db, 'imobile', id))

// ── SPAȚII ─────────────────────────────────────────────────────
export const getSpatii = async (imobilId = null) => {
  const q = imobilId
    ? query(collection(db, 'spatii'), where('imobilId', '==', imobilId))
    : collection(db, 'spatii')
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}
export const addSpatiu = async (data) =>
  addDoc(collection(db, 'spatii'), { ...data, creatLa: serverTimestamp() })
export const updateSpatiu = async (id, data) =>
  updateDoc(doc(db, 'spatii', id), data)
export const deleteSpatiu = async (id) =>
  deleteDoc(doc(db, 'spatii', id))

// ── CONTOARE ───────────────────────────────────────────────────
export const getContoare = async (spatiuId) => {
  const q = query(collection(db, 'contoare'), where('spatiuId', '==', spatiuId))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}
export const addContor = async (data) =>
  addDoc(collection(db, 'contoare'), { ...data, creatLa: serverTimestamp() })
export const updateContor = async (id, data) =>
  updateDoc(doc(db, 'contoare', id), data)
export const deleteContor = async (id) =>
  deleteDoc(doc(db, 'contoare', id))

// ── CITIRI ─────────────────────────────────────────────────────
export const getCitiri = async (contorId) => {
  const q = query(
    collection(db, 'citiri'),
    where('contorId', '==', contorId),
    orderBy('data', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}
export const getCitiriSpatiu = async (spatiuId) => {
  const q = query(
    collection(db, 'citiri'),
    where('spatiuId', '==', spatiuId),
    orderBy('data', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}
export const addCitire = async (data) =>
  addDoc(collection(db, 'citiri'), { ...data, creatLa: serverTimestamp() })
export const deleteCitire = async (id) =>
  deleteDoc(doc(db, 'citiri', id))

// ── USER PROFILES ──────────────────────────────────────────────
export const getUserProfile = async (uid) => {
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export const getUsers = async () => {
  const snap = await getDocs(collection(db, 'users'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export const saveUserProfile = async (uid, data) => {
  const { setDoc } = await import('firebase/firestore')
  await setDoc(doc(db, 'users', uid), data, { merge: true })
}

export const updateUserProfile = async (uid, data) => {
  await updateDoc(doc(db, 'users', uid), data)
}

export const deleteUserProfile = async (uid) => {
  await deleteDoc(doc(db, 'users', uid))
}

// ── DOCUMENTE BIBLIOTECĂ ───────────────────────────────────────
export const getDocumente = async (entityType = null, entityId = null) => {
  let q
  if (entityType && entityId) {
    q = query(
      collection(db, 'documente'),
      where('entityType', '==', entityType),
      where('entityId',   '==', entityId)
    )
  } else if (entityType) {
    q = query(collection(db, 'documente'), where('entityType', '==', entityType))
  } else {
    q = collection(db, 'documente')
  }
  const snap = await getDocs(q)
  // Sort client-side to avoid Firestore compound index requirement
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.uploadatLa?.seconds || 0) - (a.uploadatLa?.seconds || 0))
}

export const addDocument = async (data) =>
  addDoc(collection(db, 'documente'), { ...data, uploadatLa: serverTimestamp() })

export const updateDocument = async (id, data) =>
  updateDoc(doc(db, 'documente', id), data)

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
export const addClientToSpatiu = async (spatiuId, clientId, rol = 'Chiriaș principal') => {
  const snap = await getDoc(doc(db, 'spatii', spatiuId))
  if (!snap.exists()) return
  const data = snap.data()
  const clienti = data.clienti || (data.clientId ? [{ clientId: data.clientId, rol: 'Chiriaș principal', activ: true }] : [])
  // Avoid duplicates
  if (clienti.find(c => c.clientId === clientId)) return
  clienti.push({ clientId, rol, activ: true })
  await updateDoc(doc(db, 'spatii', spatiuId), {
    clienti,
    clientId: clienti.find(c => c.rol === 'Chiriaș principal')?.clientId || clienti[0]?.clientId || '',
    status: 'Ocupat'
  })
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

// ── TEMPLATE NOTE DE CALCUL ────────────────────────────────────
export const getTemplate = async (spatiuId) => {
  const q = query(collection(db, 'templates_nota'), where('spatiuId', '==', spatiuId))
  const snap = await getDocs(q)
  return snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() }
}

export const saveTemplate = async (spatiuId, data) => {
  const existing = await getTemplate(spatiuId)
  if (existing) {
    await updateDoc(doc(db, 'templates_nota', existing.id), { ...data, updatedAt: serverTimestamp() })
    return existing.id
  } else {
    const ref = await addDoc(collection(db, 'templates_nota'), { ...data, spatiuId, createdAt: serverTimestamp() })
    return ref.id
  }
}

// ── NOTA DE CALCUL EMISE ───────────────────────────────────────
export const getNoteCalcul = async (spatiuId = null) => {
  const q = spatiuId
    ? query(collection(db, 'note_calcul'), where('spatiuId', '==', spatiuId))
    : collection(db, 'note_calcul')
  const snap = await getDocs(q)
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
}

export const saveNotaCalcul = async (data) =>
  addDoc(collection(db, 'note_calcul'), { ...data, createdAt: serverTimestamp() })

// ── ISTORIC SPATIU ─────────────────────────────────────────────
export const getIstoricSpatiu = async (spatiuId) => {
  const q = query(collection(db, 'istoric_spatiu'), where('spatiuId', '==', spatiuId))
  const snap = await getDocs(q)
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.dataStart?.seconds || 0) - (a.dataStart?.seconds || 0))
}

export const addIstoricEntry = async (data) =>
  addDoc(collection(db, 'istoric_spatiu'), { ...data, createdAt: serverTimestamp() })

export const updateIstoricEntry = async (id, data) =>
  updateDoc(doc(db, 'istoric_spatiu', id), data)

// ── PREȚURI PER IMOBIL ─────────────────────────────────────────
export const getPreturiImobil = async (imobilId) => {
  const snap = await getDoc(doc(db, 'preturi_imobil', imobilId))
  return snap.exists() ? snap.data() : {}
}

export const savePreturiImobil = async (imobilId, preturi) => {
  const { setDoc } = await import('firebase/firestore')
  await setDoc(doc(db, 'preturi_imobil', imobilId), preturi, { merge: true })
}

// ── CONTOARE REPROIECTATE ─────────────────────────────────────
// mod: 'index' | 'fix' | 'bloc'
export const getContoareSpatiu = async (spatiuId) => {
  const q = query(collection(db, 'contoare'), where('spatiuId', '==', spatiuId))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.ordine || 0) - (b.ordine || 0))
}

export const saveContor = async (data) => {
  if (data.id) {
    await updateDoc(doc(db, 'contoare', data.id), data)
    return data.id
  }
  const ref = await addDoc(collection(db, 'contoare'), { ...data, creatLa: serverTimestamp() })
  return ref.id
}

// ── CITIRI REPROIECTATE ───────────────────────────────────────
export const getCitiriContor = async (contorId) => {
  const q = query(collection(db, 'citiri'), where('contorId', '==', contorId))
  const snap = await getDocs(q)
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => b.data?.localeCompare?.(a.data) || 0)
}

export const getCitiriSpatiu2 = async (spatiuId) => {
  const q = query(collection(db, 'citiri'), where('spatiuId', '==', spatiuId))
  const snap = await getDocs(q)
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => b.data?.localeCompare?.(a.data) || 0)
}

export const saveCitire = async (data) =>
  addDoc(collection(db, 'citiri'), { ...data, creatLa: serverTimestamp() })

export const deleteCitire2 = async (id) =>
  deleteDoc(doc(db, 'citiri', id))

// ── PORTALE CHIRIAȘI ───────────────────────────────────────────
export const getPortal = async (token) => {
  const q = query(collection(db, 'portale'), where('token', '==', token))
  const snap = await getDocs(q)
  return snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() }
}

export const getPortalBySpatiu = async (spatiuId) => {
  const q = query(collection(db, 'portale'), where('spatiuId', '==', spatiuId))
  const snap = await getDocs(q)
  return snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() }
}

export const savePortal = async (data) => {
  const existing = await getPortalBySpatiu(data.spatiuId)
  if (existing) {
    await updateDoc(doc(db, 'portale', existing.id), data)
    return existing.id
  }
  const ref = await addDoc(collection(db, 'portale'), { ...data, createdAt: serverTimestamp() })
  return ref.id
}

// ── INDEXURI PRIMITE ───────────────────────────────────────────
export const getIndexuriPrimite = async (status = null) => {
  const q = status
    ? query(collection(db, 'indexuri_primite'), where('status', '==', status))
    : collection(db, 'indexuri_primite')
  const snap = await getDocs(q)
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.dataTrimis?.seconds || 0) - (a.dataTrimis?.seconds || 0))
}

export const getIndexuriPentruSpatiu = async (spatiuId) => {
  const q = query(collection(db, 'indexuri_primite'), where('spatiuId', '==', spatiuId))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export const saveIndexPrimit = async (data) =>
  addDoc(collection(db, 'indexuri_primite'), { ...data, dataTrimis: serverTimestamp() })

export const updateIndexPrimit = async (id, data) =>
  updateDoc(doc(db, 'indexuri_primite', id), data)

export const deleteIndexPrimit = async (id) =>
  deleteDoc(doc(db, 'indexuri_primite', id))
