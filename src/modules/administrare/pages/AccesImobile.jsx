import { useEffect, useState } from 'react'
import Topbar from '../../../shared/components/Topbar'
import { useToast } from '../../../shared/components/Toast'
import { useAuth } from '../../../shared/context/AuthContext'
import { mesajEroare } from '../../../shared/utils/eroare'
import { getImobile, getUsers, getAllAcces, setAcces, deleteUserProfile, NIVELURI } from '../../../shared/firebase/firestore'

const esteUid = (id) => /^[A-Za-z0-9]{20,}$/.test(id || '')

export default function AccesImobile() {
  const toast = useToast()
  const { isAdmin } = useAuth()

  const [imobile,  setImobile]  = useState([])
  const [persoane, setPersoane] = useState([])   // { uid, nume, email, rol, activ, imobile:{id:nivel} }
  const [vechi,    setVechi]    = useState([])   // profile vechi (fără cont legat)
  const [loading,  setLoading]  = useState(true)
  const [busy,     setBusy]     = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const [im, users, accese] = await Promise.all([getImobile(), getUsers(), getAllAcces()])
      setImobile(im)
      const map = new Map()
      users.filter(u => esteUid(u.id)).forEach(u => map.set(u.id, {
        uid: u.id, nume: u.nume, email: u.email, rol: u.rol, activ: u.activ !== false, imobile: {},
      }))
      accese.forEach(a => {
        const cur = map.get(a.id) || { uid: a.id, nume: a.nume, email: a.email, activ: true }
        map.set(a.id, { ...cur, imobile: a.imobile || {} })
      })
      setPersoane([...map.values()].sort((a, b) => String(a.nume || a.email).localeCompare(String(b.nume || b.email))))
      setVechi(users.filter(u => !esteUid(u.id)))
    } catch (e) { console.error(e); toast(mesajEroare(e, 'Eroare la încărcare'), 'error') }
    setLoading(false)
  }
  useEffect(() => { if (isAdmin) load() }, [isAdmin])

  if (!isAdmin) return (
    <div className="content" style={{ paddingTop: 60, textAlign: 'center', color: 'var(--slate)' }}>
      <i className="ti ti-lock" style={{ fontSize: 40, display: 'block', marginBottom: 12 }} />
      <p>Acces restricționat. Doar administratorul poate gestiona accesul.</p>
    </div>
  )

  const seteaza = async (p, imobilId, nivel) => {
    setBusy(p.uid + imobilId)
    try {
      await setAcces(p.uid, { nume: p.nume, email: p.email }, imobilId, nivel)
      setPersoane(list => list.map(x => {
        if (x.uid !== p.uid) return x
        const m = { ...x.imobile }
        if (nivel > 0) m[imobilId] = nivel; else delete m[imobilId]
        return { ...x, imobile: m }
      }))
    } catch (e) { console.error(e); toast(mesajEroare(e, 'Nu s-a putut salva accesul'), 'error') }
    setBusy('')
  }

  const revocaTot = async (p) => {
    if (!confirm(`Retragi tot accesul lui „${p.nume || p.email}”?`)) return
    for (const id of Object.keys(p.imobile || {})) await seteaza(p, id, 0)
    toast('Acces retras.')
  }

  const stergeVechi = async (u) => {
    if (!confirm(`Ștergi profilul vechi „${u.nume || u.email || u.id}”? Contul de autentificare nu este afectat.`)) return
    try { await deleteUserProfile(u.id); toast('Profil șters.'); load() } catch (e) { toast(mesajEroare(e), 'error') }
  }

  const numeImobil = (i) => i.nume || i.denumire || i.id
  const asteapta = persoane.filter(p => p.rol !== 'admin' && Object.keys(p.imobile).length === 0)

  return (
    <>
      <Topbar title="Acces imobile" subtitle="Bifezi imobilele la care are acces fiecare persoană" />
      <div className="content">
        <div className="alert alert-info" style={{ marginBottom: 16 }}>
          <i className="ti ti-info-circle" />
          <span>
            Persoana își creează contul din ecranul de login („Cont nou”) și apare aici. <strong>Bifezi imobilul</strong> și ea vede imediat tot ce ține de el
            (clienți, arhivă, indexuri, contracte, expirări). <strong>Debifezi</strong> când vrei să retragi accesul.
            Nivelul: <strong>Vizualizare</strong> (doar citește) · <strong>Operare</strong> (editează, citește indexuri, facturează) · <strong>Administrare</strong> (și șterge, gestionează spațiile).
          </span>
        </div>

        {asteapta.length > 0 && (
          <div className="alert" style={{ marginBottom: 16, background: 'var(--amber-light)', color: 'var(--amber)', border: '1px solid #E3C77D' }}>
            <i className="ti ti-clock" />
            <span><strong>{asteapta.length}</strong> {asteapta.length === 1 ? 'cont așteaptă' : 'conturi așteaptă'} aprobarea: {asteapta.map(p => p.nume || p.email).join(', ')}.</span>
          </div>
        )}

        <div className="card">
          <div style={{ overflowX: 'auto' }}>
            {loading ? (
              <div className="empty"><p>Se încarcă…</p></div>
            ) : persoane.length === 0 ? (
              <div className="empty"><i className="ti ti-users" /><p>Nicio persoană încă. Cere-le să-și creeze cont din ecranul de login.</p></div>
            ) : imobile.length === 0 ? (
              <div className="empty"><i className="ti ti-building" /><p>Nu există imobile. Creează-le din Spații & Imobile.</p></div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Persoană</th>
                    {imobile.map(i => <th key={i.id}>{numeImobil(i)}</th>)}
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {persoane.map(p => (
                    <tr key={p.uid} style={p.activ === false ? { opacity: .55 } : undefined}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{p.nume || p.email || p.uid}</div>
                        <div style={{ fontSize: 12, color: 'var(--slate)' }}>{p.email}{p.rol === 'admin' ? ' · administrator general' : ''}{p.activ === false ? ' · dezactivat' : ''}</div>
                      </td>
                      {imobile.map(i => {
                        const niv = p.imobile[i.id] || 0
                        return (
                          <td key={i.id}>
                            {p.rol === 'admin' ? <span style={{ color: 'var(--slate)', fontSize: 12 }}>tot</span> : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <input type="checkbox" checked={niv > 0} disabled={busy === p.uid + i.id}
                                  onChange={e => seteaza(p, i.id, e.target.checked ? 2 : 0)}
                                  style={{ width: 18, height: 18 }} aria-label={`Acces ${p.nume || p.email} la ${numeImobil(i)}`} />
                                {niv > 0 && (
                                  <select value={niv} disabled={busy === p.uid + i.id} onChange={e => seteaza(p, i.id, Number(e.target.value))} style={{ minWidth: 120 }}>
                                    {[1, 2, 3].map(n => <option key={n} value={n}>{NIVELURI[n]}</option>)}
                                  </select>
                                )}
                              </div>
                            )}
                          </td>
                        )
                      })}
                      <td style={{ textAlign: 'right' }}>
                        {p.rol !== 'admin' && Object.keys(p.imobile).length > 0 && (
                          <button className="btn btn-ghost btn-sm" onClick={() => revocaTot(p)} title="Retrage tot accesul"><i className="ti ti-user-off" /></button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {vechi.length > 0 && (
          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-header">
              <div className="card-title">Profile vechi</div>
              <div className="card-subtitle">Create de versiunea anterioară, nelegate de un cont. Pot fi șterse; persoana își creează cont nou din login.</div>
            </div>
            <div className="card-body">
              {vechi.map(u => (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <span style={{ flex: 1 }}>{u.nume || '—'} <span style={{ color: 'var(--slate)', fontSize: 12 }}>{u.email}</span></span>
                  <button className="btn btn-danger btn-sm" onClick={() => stergeVechi(u)}><i className="ti ti-trash" /></button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
