import { useEffect, useMemo, useState } from 'react'
import Topbar from '../../../shared/components/Topbar'
import { useToast } from '../../../shared/components/Toast'
import { useAuth } from '../../../shared/context/AuthContext'
import { useMeniu } from '../../../shared/context/MeniuContext'
import { mesajEroare } from '../../../shared/utils/eroare'
import { getUsers } from '../../../shared/firebase/firestore'
import { MODULE, SECTIUNI, MODULE_PE_CHEIE, BARA_IMPLICIT, MAX_BARA, moduleOrdonate, valoareStandard } from '../../../shared/config/moduleCatalog'

const esteUid = (id) => /^[A-Za-z0-9]{20,}$/.test(id || '')
const COLOANE = [['d', 'Desktop', 'ti-device-desktop'], ['m', 'Mobil', 'ti-device-mobile'], ['h', 'Acasă', 'ti-home']]

export default function AdministrareMeniu() {
  const toast = useToast()
  const { isAdmin } = useAuth()
  const { cfg, salveaza } = useMeniu()

  const [draft,   setDraft]   = useState(() => JSON.parse(JSON.stringify(cfg || {})))
  const [tab,     setTab]     = useState('standard')
  const [users,   setUsers]   = useState([])
  const [persoana, setPersoana] = useState('')
  const [saving,  setSaving]  = useState(false)
  const [modificat, setModificat] = useState(false)

  useEffect(() => {
    getUsers().then(u => {
      const l = u.filter(x => esteUid(x.id)).sort((a, b) => String(a.nume || a.email).localeCompare(String(b.nume || b.email)))
      setUsers(l); if (l.length) setPersoana(p => p || l[0].id)
    }).catch(() => {})
  }, [])

  const configurabile = useMemo(() => moduleOrdonate(draft).filter(m => !m.adminOnly), [draft])
  const schimba = (fn) => { setDraft(d => { const n = JSON.parse(JSON.stringify(d)); fn(n); return n }); setModificat(true) }

  if (!isAdmin) return (
    <div className="content" style={{ paddingTop: 60, textAlign: 'center', color: 'var(--slate)' }}>
      <i className="ti ti-lock" style={{ fontSize: 40, display: 'block', marginBottom: 12 }} />
      <p>Acces restricționat. Doar administratorul poate gestiona meniul.</p>
    </div>
  )

  // ── Meniu standard ─────────────────────────────────────────
  const setStd = (key, p, val) => schimba(n => { n.standard = n.standard || {}; n.standard[key] = { ...(n.standard[key] || {}), [p]: val } })
  const muta = (key, dir) => schimba(n => {
    const ord = moduleOrdonate(n).map(m => m.key)
    const m = MODULE_PE_CHEIE[key]
    const grup = ord.filter(k => MODULE_PE_CHEIE[k].section === m.section)
    const i = grup.indexOf(key), j = i + dir
    if (j < 0 || j >= grup.length) return
    ;[grup[i], grup[j]] = [grup[j], grup[i]]
    n.ordine = SECTIUNI.flatMap(s => s === m.section ? grup : ord.filter(k => MODULE_PE_CHEIE[k].section === s))
  })
  const bara = (draft.bara && draft.bara.length ? draft.bara : BARA_IMPLICIT)
  const comutaBara = (key) => schimba(n => {
    const cur = (n.bara && n.bara.length ? n.bara : BARA_IMPLICIT).filter(Boolean)
    if (cur.includes(key)) n.bara = cur.filter(k => k !== key)
    else if (cur.length >= MAX_BARA) { toast(`Bara de jos poate avea cel mult ${MAX_BARA} module.`, 'error'); n.bara = cur }
    else n.bara = [...cur, key]
  })

  // ── Excepții pe persoană ───────────────────────────────────
  const valPers = (key, p) => draft.persoane?.[persoana]?.[key]?.[p]
  const ciclu = (key, p) => schimba(n => {
    n.persoane = n.persoane || {}
    const pers = n.persoane[persoana] = n.persoane[persoana] || {}
    const cur = pers[key]?.[p]
    const nou = cur === undefined ? true : cur === true ? false : undefined
    pers[key] = { ...(pers[key] || {}) }
    if (nou === undefined) delete pers[key][p]; else pers[key][p] = nou
    if (Object.keys(pers[key]).length === 0) delete pers[key]
    if (Object.keys(pers).length === 0) delete n.persoane[persoana]
  })
  const resetPersoana = () => schimba(n => { if (n.persoane) delete n.persoane[persoana] })
  const resetStandard = () => {
    if (!confirm('Revii la meniul standard implicit? Excepțiile pe persoană rămân.')) return
    schimba(n => { delete n.standard; delete n.ordine; delete n.bara })
  }
  const nrExceptii = (uid) => Object.values(draft.persoane?.[uid] || {}).reduce((s, v) => s + Object.keys(v).length, 0)

  const salvare = async () => {
    setSaving(true)
    try { await salveaza(draft); setModificat(false); toast('Meniul a fost salvat. Se aplică la următoarea deschidere a aplicației.') }
    catch (e) { console.error(e); toast(mesajEroare(e, 'Nu s-a putut salva meniul'), 'error') }
    setSaving(false)
  }

  const celula = (cls) => ({ textAlign: 'center', width: 84, ...cls })
  const grupuri = SECTIUNI.filter(s => configurabile.some(m => m.section === s))

  return (
    <>
      <Topbar title="Administrare meniu" subtitle="Ce se vede pe desktop, pe mobil și pe pagina Acasă">
        <button className="btn btn-primary btn-sm" onClick={salvare} disabled={saving || !modificat}>
          <i className="ti ti-device-floppy" /> {saving ? 'Se salvează…' : 'Salvează'}
        </button>
      </Topbar>

      <div className="content">
        <div className="alert alert-info" style={{ marginBottom: 16 }}>
          <i className="ti ti-info-circle" />
          <span>
            Meniul decide ce se <strong>vede</strong>: un modul debifat dispare din meniu, din cartonașele Acasă și din căutare, iar pagina arată „Nu este disponibil”.
            Setezi <strong>meniul standard</strong> pentru toți și, la nevoie, <strong>excepții pe persoană</strong>. Poți reactiva sau elimina module oricând.
            Dashboardul și paginile de Setări rămân mereu disponibile administratorului.
          </span>
        </div>

        <div style={{ display: 'flex', gap: 24, borderBottom: '1px solid var(--border)', marginBottom: 18 }}>
          {[['standard', 'Meniu standard'], ['persoane', 'Excepții pe persoană']].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} style={{
              background: 'none', border: 'none', padding: '0 0 10px', cursor: 'pointer', fontWeight: tab === k ? 700 : 500,
              color: tab === k ? 'var(--blue)' : 'var(--slate)', borderBottom: tab === k ? '2px solid var(--gold)' : '2px solid transparent',
            }}>{l}</button>
          ))}
        </div>

        {tab === 'standard' ? (
          <div className="card">
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Modul</th>
                    {COLOANE.map(([p, l, ic]) => <th key={p} style={celula()}><i className={`ti ${ic}`} /> {l}</th>)}
                    <th style={celula()}>Bară jos</th>
                    <th style={celula()}>Ordine</th>
                  </tr>
                </thead>
                <tbody>
                  {grupuri.map(sec => (
                    <GrupRanduri key={sec} titlu={sec}>
                      {configurabile.filter(m => m.section === sec).map((m, idx, arr) => (
                        <tr key={m.key}>
                          <td><i className={`ti ${m.icon}`} style={{ marginRight: 8, color: 'var(--gold)' }} />{m.label}{m.fix && <i className="ti ti-lock" style={{ marginLeft: 6, fontSize: 12, color: 'var(--slate)' }} title="Mereu disponibil" />}</td>
                          {COLOANE.map(([p]) => (
                            <td key={p} style={celula()}>
                              <input type="checkbox" style={{ width: 18, height: 18 }} disabled={m.fix}
                                checked={m.fix ? true : valoareStandard(draft, m.key, p)}
                                onChange={e => setStd(m.key, p, e.target.checked)} aria-label={`${m.label} — ${p}`} />
                            </td>
                          ))}
                          <td style={celula()}>
                            <input type="checkbox" style={{ width: 18, height: 18 }}
                              disabled={!valoareStandard(draft, m.key, 'm') && !m.fix}
                              checked={bara.includes(m.key)} onChange={() => comutaBara(m.key)} aria-label={`${m.label} — bara de jos`} />
                          </td>
                          <td style={celula()}>
                            <button className="btn btn-ghost btn-sm" disabled={idx === 0} onClick={() => muta(m.key, -1)}><i className="ti ti-arrow-up" /></button>
                            <button className="btn btn-ghost btn-sm" disabled={idx === arr.length - 1} onClick={() => muta(m.key, 1)}><i className="ti ti-arrow-down" /></button>
                          </td>
                        </tr>
                      ))}
                    </GrupRanduri>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="card-body" style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--slate)' }}>Bara de jos (mobil): maximum {MAX_BARA} module, afișate în ordinea bifării.</span>
              <button className="btn btn-ghost btn-sm" onClick={resetStandard}><i className="ti ti-restore" /> Revino la varianta implicită</button>
            </div>
          </div>
        ) : (
          <>
            {users.length === 0 ? (
              <div className="card"><div className="empty"><i className="ti ti-users" /><p>Nicio persoană cu cont încă.</p></div></div>
            ) : (
              <>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 14 }}>
                  <div className="form-group" style={{ minWidth: 260 }}>
                    <label>Persoană</label>
                    <select value={persoana} onChange={e => setPersoana(e.target.value)}>
                      {users.map(u => <option key={u.id} value={u.id}>{(u.nume || u.email)}{nrExceptii(u.id) ? ` · ${nrExceptii(u.id)} excepții` : ''}</option>)}
                    </select>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={resetPersoana} disabled={!nrExceptii(persoana)}>
                    <i className="ti ti-restore" /> Șterge excepțiile persoanei
                  </button>
                </div>
                <div className="card">
                  <div style={{ overflowX: 'auto' }}>
                    <table>
                      <thead>
                        <tr><th>Modul</th>{COLOANE.map(([p, l, ic]) => <th key={p} style={celula()}><i className={`ti ${ic}`} /> {l}</th>)}</tr>
                      </thead>
                      <tbody>
                        {grupuri.map(sec => (
                          <GrupRanduri key={sec} titlu={sec} cols={4}>
                            {configurabile.filter(m => m.section === sec && !m.fix).map(m => (
                              <tr key={m.key}>
                                <td><i className={`ti ${m.icon}`} style={{ marginRight: 8, color: 'var(--gold)' }} />{m.label}</td>
                                {COLOANE.map(([p]) => {
                                  const forta = valPers(m.key, p)
                                  const std = valoareStandard(draft, m.key, p)
                                  return (
                                    <td key={p} style={celula()}>
                                      <button type="button" onClick={() => ciclu(m.key, p)}
                                        title="Clic: standard → da → nu"
                                        style={{
                                          minWidth: 58, padding: '3px 8px', cursor: 'pointer', fontSize: 12, fontWeight: forta === undefined ? 500 : 700,
                                          border: `1px solid ${forta === undefined ? 'var(--border)' : forta ? 'var(--green)' : 'var(--red)'}`,
                                          background: forta === undefined ? 'transparent' : forta ? 'var(--green-light)' : 'var(--red-light)',
                                          color: forta === undefined ? 'var(--slate)' : forta ? 'var(--green)' : 'var(--red)',
                                        }}>
                                        {forta === undefined ? (std ? '✓ std' : '✕ std') : forta ? '✓ da' : '✕ nu'}
                                      </button>
                                    </td>
                                  )
                                })}
                              </tr>
                            ))}
                          </GrupRanduri>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="card-body" style={{ fontSize: 12, color: 'var(--slate)' }}>
                    „std” = urmează meniul standard. Apasă pe o celulă ca să forțezi <strong>da</strong> sau <strong>nu</strong> doar pentru această persoană.
                    Accesul la date rămâne stabilit separat, în Acces imobile.
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </>
  )
}

function GrupRanduri({ titlu, cols = 6, children }) {
  return (
    <>
      <tr><td colSpan={cols} style={{ background: 'var(--slate-light)', fontSize: 11, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--slate)' }}>{titlu}</td></tr>
      {children}
    </>
  )
}
