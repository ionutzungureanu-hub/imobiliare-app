import { useEffect, useMemo, useState } from 'react'
import Topbar from '../../../shared/components/Topbar'
import { useToast } from '../../../shared/components/Toast'
import { useAuth } from '../../../shared/context/AuthContext'
import { mesajEroare } from '../../../shared/utils/eroare'
import {
  getImobile, getUsers, getAllAcces, getAccesUser, setAcces, NIVELURI,
  getInvitatii, creeazaInvitatie, anuleazaInvitatie, formateazaCod,
} from '../../../shared/firebase/firestore'

const arataUid = (id) => /^[A-Za-z0-9]{20,}$/.test(id || '')

export default function AccesImobile() {
  const toast = useToast()
  const { user, profile, isAdmin, esteDelegat, imobileAdministrate } = useAuth()

  const [imobile,   setImobile]   = useState([])
  const [persoane,  setPersoane]  = useState([])   // { uid, nume, email, imobile:{id:nivel}, legacy? }
  const [invitatii, setInvitatii] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [busy,      setBusy]      = useState('')

  // formular invitație
  const [invImobil, setInvImobil] = useState('')
  const [invNivel,  setInvNivel]  = useState(2)
  const [invZile,   setInvZile]   = useState(7)
  const [codNou,    setCodNou]    = useState(null)
  const [copiat,    setCopiat]    = useState('')

  // Imobilele pe care utilizatorul le poate administra
  const imobileMele = useMemo(
    () => isAdmin ? imobile : imobile.filter(i => (imobileAdministrate || []).includes(i.id)),
    [imobile, isAdmin, imobileAdministrate]
  )

  const load = async () => {
    setLoading(true)
    try {
      const im = await getImobile()
      setImobile(im)
      const ids = isAdmin ? im.map(i => i.id) : (imobileAdministrate || [])
      const inv = await getInvitatii(ids)
      setInvitatii(inv.sort((a, b) => (b.creatLa?.seconds || 0) - (a.creatLa?.seconds || 0)))

      if (isAdmin) {
        const [users, accese] = await Promise.all([getUsers(), getAllAcces()])
        const map = new Map()
        users.forEach(u => map.set(u.id, { uid: u.id, nume: u.nume, email: u.email, rol: u.rol, activ: u.activ !== false, imobile: {}, legacy: !arataUid(u.id) }))
        accese.forEach(a => {
          const cur = map.get(a.id) || { uid: a.id, nume: a.nume, email: a.email, activ: true, legacy: false }
          map.set(a.id, { ...cur, nume: cur.nume || a.nume, email: cur.email || a.email, imobile: a.imobile || {} })
        })
        setPersoane([...map.values()].sort((a, b) => String(a.nume || a.email).localeCompare(String(b.nume || b.email))))
      } else {
        // Delegatul vede persoanele care au folosit invitațiile imobilelor lui
        const uids = [...new Set(inv.filter(i => i.folosit && i.folositDe && i.folositDe !== user.uid).map(i => i.folositDe))]
        const rez = []
        for (const uid of uids) {
          try {
            const a = await getAccesUser(uid)
            if (a) rez.push({ uid, nume: a.nume, email: a.email, imobile: a.imobile || {}, activ: true })
          } catch (e) { console.warn('acces', uid, e) }
        }
        setPersoane(rez)
      }
    } catch (e) { console.error(e); toast(mesajEroare(e, 'Eroare la încărcare'), 'error') }
    setLoading(false)
  }
  useEffect(() => { load() }, [isAdmin, (imobileAdministrate || []).join(',')])
  useEffect(() => { if (!invImobil && imobileMele.length) setInvImobil(imobileMele[0].id) }, [imobileMele])

  if (!isAdmin && !esteDelegat) return (
    <div className="content" style={{ paddingTop: 60, textAlign: 'center', color: 'var(--slate)' }}>
      <i className="ti ti-lock" style={{ fontSize: 40, display: 'block', marginBottom: 12 }} />
      <p>Acces restricționat. Doar administratorii imobilelor pot gestiona accesul.</p>
    </div>
  )

  const schimba = async (p, imobilId, nivel) => {
    setBusy(p.uid + imobilId)
    try {
      await setAcces(p.uid, { nume: p.nume, email: p.email }, imobilId, Number(nivel))
      setPersoane(list => list.map(x => x.uid !== p.uid ? x : {
        ...x, imobile: (() => { const m = { ...x.imobile }; if (Number(nivel) > 0) m[imobilId] = Number(nivel); else delete m[imobilId]; return m })()
      }))
      toast('Acces actualizat.')
    } catch (e) { console.error(e); toast(mesajEroare(e, 'Nu s-a putut salva accesul'), 'error') }
    setBusy('')
  }

  const genereaza = async () => {
    const im = imobile.find(i => i.id === invImobil)
    if (!im) { toast('Alege imobilul.', 'error'); return }
    setBusy('inv')
    try {
      const cod = await creeazaInvitatie({
        imobilId: im.id, imobilNume: im.nume || im.denumire || '', nivel: Number(invNivel),
        zile: Number(invZile) || 7, uid: user.uid, nume: profile?.nume || user.email,
      })
      setCodNou(cod)
      load()
    } catch (e) { console.error(e); toast(mesajEroare(e, 'Nu s-a putut crea invitația'), 'error') }
    setBusy('')
  }

  const link = (cod) => `${window.location.origin}/invitatie/${cod}`
  const copiaza = async (txt, key) => {
    try { await navigator.clipboard.writeText(txt); setCopiat(key); setTimeout(() => setCopiat(''), 1800) } catch { toast('Nu am putut copia.', 'error') }
  }
  const anuleaza = async (cod) => {
    if (!confirm('Anulezi această invitație?')) return
    try { await anuleazaInvitatie(cod); toast('Invitație anulată.'); load() }
    catch (e) { toast(mesajEroare(e), 'error') }
  }

  const stare = (i) => {
    if (i.folosit) return { t: `Folosit de ${i.folositDeNume || '—'}`, c: 'badge-green' }
    const exp = i.expiraLa?.toDate ? i.expiraLa.toDate() : null
    if (exp && exp < new Date()) return { t: 'Expirat', c: 'badge-red' }
    return { t: 'Activ', c: 'badge-amber' }
  }
  const numeImobil = (i) => i.nume || i.denumire || i.id
  const optiuniNivel = isAdmin ? [0, 1, 2, 3] : [0, 1, 2]

  return (
    <>
      <Topbar title="Acces imobile" subtitle="Cine are acces la ce imobil și cu ce drepturi" />

      <div className="content">
        <div className="alert alert-info" style={{ marginBottom: 16 }}>
          <i className="ti ti-info-circle" />
          <span>
            Accesul se acordă <strong>pe imobil</strong>. Cine are acces vede tot ce ține de imobil: clienți, arhivă, indexuri, contracte, expirări.
            <strong> Vizualizare</strong> = doar citește · <strong>Operare</strong> = citește indexuri, emite facturi, editează contracte și clienți ·
            <strong> Administrare</strong> = și șterge, gestionează spațiile și poate invita alte persoane.
          </span>
        </div>

        {/* ── Invitații ─────────────────────────────────────── */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <div className="card-title">Invită o persoană</div>
            <div className="card-subtitle">Generezi un cod de unică folosință și i-l trimiți. Persoana își creează contul și primește accesul.</div>
          </div>
          <div className="card-body">
            {imobileMele.length === 0 ? (
              <div style={{ color: 'var(--slate)', fontSize: 13 }}>Nu ai imobile pe care să le administrezi.</div>
            ) : (
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div className="form-group" style={{ minWidth: 200 }}>
                  <label>Imobil</label>
                  <select value={invImobil} onChange={e => setInvImobil(e.target.value)}>
                    {imobileMele.map(i => <option key={i.id} value={i.id}>{numeImobil(i)}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ minWidth: 160 }}>
                  <label>Nivel de acces</label>
                  <select value={invNivel} onChange={e => setInvNivel(Number(e.target.value))}>
                    {optiuniNivel.filter(n => n > 0).map(n => <option key={n} value={n}>{NIVELURI[n]}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ width: 120 }}>
                  <label>Valabil (zile)</label>
                  <input type="number" min="1" max="60" value={invZile} onChange={e => setInvZile(e.target.value)} />
                </div>
                <button className="btn btn-primary" onClick={genereaza} disabled={busy === 'inv'}>
                  <i className="ti ti-key" /> {busy === 'inv' ? 'Se generează…' : 'Generează cod'}
                </button>
              </div>
            )}

            {codNou && (
              <div style={{ marginTop: 16, padding: 14, border: '1px solid var(--gold)', background: 'var(--slate-light)' }}>
                <div style={{ fontSize: 12, color: 'var(--slate)', marginBottom: 6 }}>Cod generat (valabil o singură dată)</div>
                <div style={{ fontFamily: 'var(--serif)', fontSize: 28, letterSpacing: '.08em', color: 'var(--blue)', marginBottom: 10 }}>{formateazaCod(codNou)}</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <input readOnly value={link(codNou)} style={{ flex: 1, minWidth: 220, fontSize: 12 }} />
                  <button className="btn btn-primary btn-sm" onClick={() => copiaza(link(codNou), 'nou')}>
                    <i className={`ti ${copiat === 'nou' ? 'ti-check' : 'ti-copy'}`} /> {copiat === 'nou' ? 'Copiat' : 'Copiază linkul'}
                  </button>
                  <a className="btn btn-success btn-sm" target="_blank" rel="noreferrer"
                    href={`https://wa.me/?text=${encodeURIComponent('Ai primit acces în aplicația Rentis. Creează-ți contul aici: ' + link(codNou))}`}>
                    <i className="ti ti-brand-whatsapp" /> WhatsApp
                  </a>
                  <a className="btn btn-ghost btn-sm"
                    href={`mailto:?subject=${encodeURIComponent('Acces Rentis')}&body=${encodeURIComponent('Ai primit acces în aplicația Rentis.\nCreează-ți contul folosind linkul:\n' + link(codNou))}`}>
                    <i className="ti ti-mail" /> Email
                  </a>
                </div>
              </div>
            )}

            {invitatii.length > 0 && (
              <div style={{ marginTop: 18, overflowX: 'auto' }}>
                <table>
                  <thead><tr><th>Imobil</th><th>Nivel</th><th>Stare</th><th>Expiră</th><th></th></tr></thead>
                  <tbody>
                    {invitatii.map(i => {
                      const st = stare(i)
                      const exp = i.expiraLa?.toDate ? i.expiraLa.toDate().toLocaleDateString('ro-RO') : '—'
                      return (
                        <tr key={i.id}>
                          <td>{i.imobilNume || i.imobilId}</td>
                          <td>{NIVELURI[i.nivel]}</td>
                          <td><span className={`badge ${st.c}`}>{st.t}</span></td>
                          <td style={{ fontSize: 12, color: 'var(--slate)' }}>{exp}</td>
                          <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                            {!i.folosit && (
                              <>
                                <button className="btn btn-ghost btn-sm" onClick={() => copiaza(link(i.id), i.id)} title="Copiază linkul">
                                  <i className={`ti ${copiat === i.id ? 'ti-check' : 'ti-copy'}`} />
                                </button>
                                <button className="btn btn-danger btn-sm" onClick={() => anuleaza(i.id)} title="Anulează"><i className="ti ti-x" /></button>
                              </>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ── Matrice persoane × imobile ─────────────────────── */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">Persoane și accesul lor</div>
            <div className="card-subtitle">Poți avea nivel diferit pe fiecare imobil</div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            {loading ? (
              <div className="empty"><p>Se încarcă…</p></div>
            ) : persoane.length === 0 ? (
              <div className="empty"><i className="ti ti-users" /><p>Nicio persoană cu acces încă. Generează o invitație.</p></div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Persoană</th>
                    {imobileMele.map(i => <th key={i.id}>{numeImobil(i)}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {persoane.map(p => (
                    <tr key={p.uid} style={p.activ === false ? { opacity: .55 } : undefined}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{p.nume || p.email || p.uid}</div>
                        <div style={{ fontSize: 12, color: 'var(--slate)' }}>{p.email}{p.rol === 'admin' ? ' · administrator general' : ''}</div>
                        {p.legacy && <div style={{ fontSize: 11, color: 'var(--amber)' }}>profil vechi — invită persoana cu un cod</div>}
                      </td>
                      {imobileMele.map(i => (
                        <td key={i.id}>
                          {p.rol === 'admin' ? <span style={{ color: 'var(--slate)', fontSize: 12 }}>tot</span> : (
                            <select
                              value={p.imobile?.[i.id] || 0}
                              disabled={p.legacy || busy === p.uid + i.id || (!isAdmin && p.imobile?.[i.id] === 3)}
                              onChange={e => schimba(p, i.id, e.target.value)}
                              style={{ minWidth: 130 }}
                            >
                              {optiuniNivel.map(n => <option key={n} value={n}>{NIVELURI[n]}</option>)}
                            </select>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
