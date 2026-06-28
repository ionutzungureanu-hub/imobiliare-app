import { useState, useEffect } from 'react'
import Topbar from '../components/Topbar'
import { useToast } from '../components/Toast'
import { useAuth } from '../context/AuthContext'
import { getConfig, saveConfig, getImobile, getSpatii, getPreturiImobil, savePreturiImobil, getContoareSpatiu, saveContor, deleteContor, getCitiriContor } from '../firebase/firestore'
import { FURNIZORI, testeazaConexiunea } from '../services/facturareApi'

const emptyConfig = () => ({
  furnizorId:      '',
  token:           '',
  cif:             '',
  serie:           'FC',
  env:             'test',
  endpointCustom:  '',
})

export default function Config() {
  const toast      = useToast()
  const { isAdmin } = useAuth()

  const [cfg,      setCfg]      = useState(emptyConfig())
  const [saving,   setSaving]   = useState(false)
  const [testing,  setTesting]  = useState(false)
  const [allImobile, setAllImobile] = useState([])
  const [selImobil,  setSelImobil]  = useState('')
  const [preturi,    setPreturi]    = useState({})
  const [savingPret, setSavingPret] = useState(false)
  const [tabConfig,  setTabConfig]  = useState('contoare')
  const [spatii,     setSpatii]     = useState([])
  const [selImobilC, setSelImobilC] = useState('')
  const [selSpatiuC, setSelSpatiuC] = useState('')
  const [contoare,   setContoare]   = useState([])
  const [citiriMap,  setCitiriMap]  = useState({})
  const [loadingCt,  setLoadingCt]  = useState(false)
  const [modalContor,setModalContor]= useState(false)
  const [formContor, setFormContor] = useState({ denumire: '', um: '', mod: 'index', destinatie: 'chirias' })
  const [savingCt,   setSavingCt]   = useState(false)
  const [expandedCt, setExpandedCt] = useState({})
  const [testResult, setTestResult] = useState(null)

  useEffect(() => {
    getConfig().then(data => { if (data) setCfg(c => ({ ...emptyConfig(), ...data })) })
    getImobile().then(setAllImobile)
    getSpatii().then(setSpatii)
  }, [])

  useEffect(() => {
    if (!selImobil) return
    getPreturiImobil(selImobil).then(p => setPreturi(p || {}))
  }, [selImobil])

  const loadContoare = async () => {
    if (!selSpatiuC) { setContoare([]); setCitiriMap({}); return }
    setLoadingCt(true)
    const ct = await getContoareSpatiu(selSpatiuC)
    setContoare(ct)
    const map = {}
    await Promise.all(ct.map(async c => { map[c.id] = await getCitiriContor(c.id) }))
    setCitiriMap(map)
    setLoadingCt(false)
  }

  useEffect(() => { loadContoare() }, [selSpatiuC])

  // Config e restricționat prin desktopOnly în nav — accesibil de pe desktop

  const set = k => e => setCfg(c => ({ ...c, [k]: e.target.value }))

  const furnizorSelectat = FURNIZORI.find(f => f.id === cfg.furnizorId)
  const endpointActiv    = cfg.endpointCustom || furnizorSelectat?.url || '—'

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveConfig(cfg)
      toast('Configurare salvată!')
    } catch { toast('Eroare la salvare.', 'error') }
    finally { setSaving(false) }
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    const result = await testeazaConexiunea(cfg)
    setTestResult(result)
    setTesting(false)
    toast(result.mesaj, result.ok ? 'success' : 'error')
  }

  return (
    <>
      <Topbar title="Configurare" subtitle="Setări aplicație și integrare facturare" />

      <div className="content" style={{ maxWidth: 700 }}>

        {/* ── Tab-uri Config ──────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
          {[
            { key: 'contoare',  label: 'Contoare',           icon: 'ti-plug' },
            { key: 'preturi',   label: 'Prețuri utilități',  icon: 'ti-currency-leu' },
            { key: 'facturare', label: 'Integrare facturare',icon: 'ti-plug' },
            { key: 'emailjs',   label: 'EmailJS',            icon: 'ti-mail' },
            { key: 'firebase',  label: 'Firebase',           icon: 'ti-database' },
          ].map(t => (
            <button key={t.key} onClick={() => setTabConfig(t.key)} style={{
              padding: '9px 16px', fontSize: 13, fontWeight: 500, border: 'none', background: 'none',
              cursor: 'pointer', borderBottom: `2px solid ${tabConfig === t.key ? 'var(--blue)' : 'transparent'}`,
              color: tabConfig === t.key ? 'var(--blue)' : 'var(--slate)', marginBottom: -1,
              display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit'
            }}>
              <i className={`ti ${t.icon}`} /> {t.label}
            </button>
          ))}
        </div>

        {/* ── Contoare ─────────────────────────────────────────────── */}
        {tabConfig === 'contoare' && (
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header">
              <div>
                <div className="card-title">Configurare contoare</div>
                <div className="card-subtitle">Creează și gestionează contoarele per spațiu</div>
              </div>
            </div>
            <div className="card-body">
              {/* Selector imobil + spațiu */}
              <div className="form-grid" style={{ marginBottom: 20 }}>
                <div className="form-group">
                  <label>Imobil</label>
                  <select value={selImobilC} onChange={e => { setSelImobilC(e.target.value); setSelSpatiuC('') }}>
                    <option value="">— Alege imobil —</option>
                    {allImobile.map(im => <option key={im.id} value={im.id}>{im.nume}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Spațiu</label>
                  <select value={selSpatiuC} onChange={e => setSelSpatiuC(e.target.value)} disabled={!selImobilC}>
                    <option value="">— Alege spațiu —</option>
                    {spatii.filter(s => s.imobilId === selImobilC).map(s => <option key={s.id} value={s.id}>{s.denumire}</option>)}
                  </select>
                </div>
              </div>

              {selSpatiuC && (
                <>
                  {/* Header acțiuni */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>
                      {contoare.length} contoare configurate
                    </span>
                    <button className="btn btn-primary btn-sm" onClick={() => {
                      setFormContor({ denumire: '', um: '', mod: 'index', destinatie: 'chirias' })
                      setModalContor(true)
                    }}>
                      <i className="ti ti-plus" /> Contor nou
                    </button>
                  </div>

                  {loadingCt ? (
                    <div style={{ textAlign: 'center', color: 'var(--slate)', padding: 20 }}>Se încarcă...</div>
                  ) : contoare.length === 0 ? (
                    <div className="empty" style={{ padding: 24 }}>
                      <i className="ti ti-plug" />
                      <p>Niciun contor configurat pentru acest spațiu.</p>
                    </div>
                  ) : contoare.map(c => {
                    const citiri = citiriMap[c.id] || []
                    const ultima = citiri[0]
                    const isOpen = expandedCt[c.id]
                    const destColor = c.destinatie === 'administratie' ? '#7c3aed' : c.destinatie === 'intern' ? '#6b7280' : '#16a34a'
                    const destLabel = c.destinatie === 'administratie' ? 'Bloc' : c.destinatie === 'intern' ? 'Intern' : 'Chiriaș'

                    return (
                      <div key={c.id} style={{ border: '1px solid var(--border)', borderRadius: 10, marginBottom: 10, overflow: 'hidden' }}>
                        {/* Header contor */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--slate-light)' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontWeight: 600, fontSize: 14 }}>{c.denumire}</span>
                              <span style={{ fontSize: 11, background: destColor + '20', color: destColor, padding: '2px 8px', borderRadius: 4, fontWeight: 500 }}>{destLabel}</span>
                              <span style={{ fontSize: 11, color: 'var(--slate)' }}>{c.mod === 'index' ? `Index · ${c.um}` : c.mod === 'fix' ? 'Fix RON' : 'Sumă bloc'}</span>
                            </div>
                            {ultima && (
                              <div style={{ fontSize: 11, color: 'var(--slate)', marginTop: 2 }}>
                                Ultima citire: {ultima.data} — {c.mod === 'index' ? `${ultima.index} ${c.um}` : `${ultima.valoare} RON`}
                              </div>
                            )}
                          </div>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => setExpandedCt(e => ({ ...e, [c.id]: !e[c.id] }))}
                            style={{ fontSize: 12 }}
                          >
                            <i className={`ti ${isOpen ? 'ti-chevron-up' : 'ti-chevron-down'}`} />
                            {citiri.length > 0 ? `Istoric (${citiri.length})` : 'Fără citiri'}
                          </button>
                          <button className="remove-btn" onClick={async () => {
                            if (!confirm(`Ștergi contorul "${c.denumire}" și toate citirile?`)) return
                            await deleteContor(c.id)
                            toast('Contor șters.')
                            loadContoare()
                          }}>
                            <i className="ti ti-x" style={{ fontSize: 13 }} />
                          </button>
                        </div>

                        {/* Istoric cascade */}
                        {isOpen && (
                          <div>
                            {citiri.length === 0 ? (
                              <div style={{ padding: '10px 14px', color: 'var(--slate)', fontSize: 13 }}>Nicio citire înregistrată.</div>
                            ) : (
                              <>
                                <table style={{ fontSize: 12, width: '100%', borderCollapse: 'collapse' }}>
                                  <thead style={{ background: 'var(--slate-light)' }}>
                                    <tr>
                                      <th style={{ padding: '5px 14px', textAlign: 'left' }}>Data</th>
                                      {c.mod === 'index' && <><th style={{ padding: '5px 8px', textAlign: 'center' }}>Index</th><th style={{ padding: '5px 8px', textAlign: 'center' }}>Consum</th></>}
                                      <th style={{ padding: '5px 14px', textAlign: 'right' }}>Valoare</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {citiri.slice(0, 3).map((cit, i) => (
                                      <tr key={cit.id} style={{ background: i === 0 ? 'var(--blue-light)' : i % 2 === 0 ? 'white' : 'var(--slate-light)', borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '5px 14px', fontWeight: i === 0 ? 600 : 400 }}>{cit.data}</td>
                                        {c.mod === 'index' && (
                                          <>
                                            <td style={{ padding: '5px 8px', textAlign: 'center' }}>{cit.index} {c.um}</td>
                                            <td style={{ padding: '5px 8px', textAlign: 'center', color: 'var(--green)', fontWeight: 600 }}>{cit.consum ?? '—'} {c.um}</td>
                                          </>
                                        )}
                                        <td style={{ padding: '5px 14px', textAlign: 'right', fontWeight: 500 }}>
                                          {cit.valoare != null ? cit.valoare.toFixed(2) + ' RON' : '—'}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                                {citiri.length > 3 && (
                                  <div style={{ padding: '4px 14px', fontSize: 11, color: 'var(--slate)' }}>
                                    + {citiri.length - 3} citiri mai vechi
                                  </div>
                                )}
                                <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border)' }}>
                                  <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }}
                                    onClick={async () => {
                                      const { exportIstoricContor } = await import('../services/exportContoare')
                                      exportIstoricContor(c, citiri)
                                    }}>
                                    <i className="ti ti-download" /> Export PDF istoric complet
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </>
              )}

              {!selSpatiuC && (
                <div style={{ color: 'var(--slate)', fontSize: 13, textAlign: 'center', padding: 20 }}>
                  Selectează un imobil și un spațiu pentru a gestiona contoarele.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal contor nou */}
        {modalContor && (
          <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalContor(false)}>
            <div className="modal-box" style={{ width: 480 }}>
              <div className="modal-head">
                <h3>Contor nou — {spatii.find(s => s.id === selSpatiuC)?.denumire}</h3>
                <button className="modal-close" onClick={() => setModalContor(false)}><i className="ti ti-x" /></button>
              </div>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group full">
                    <label>Denumire contor *</label>
                    <input value={formContor.denumire} onChange={e => setFormContor(f => ({ ...f, denumire: e.target.value }))}
                      placeholder="ex. Apometru rece bucătărie, Energie electrică" autoFocus />
                  </div>
                  <div className="form-group">
                    <label>Unitate de măsură *</label>
                    <input value={formContor.um} onChange={e => setFormContor(f => ({ ...f, um: e.target.value }))}
                      placeholder="mc / kWh / RON" />
                  </div>
                  <div className="form-group">
                    <label>Mod calcul</label>
                    <select value={formContor.mod} onChange={e => setFormContor(f => ({ ...f, mod: e.target.value }))}>
                      <option value="index">Index — contor fizic (calcul automat)</option>
                      <option value="fix">Sumă fixă — introduci suma direct</option>
                      <option value="bloc">Sumă bloc — de la administrație</option>
                    </select>
                  </div>
                  <div className="form-group full">
                    <label>Destinație</label>
                    <select value={formContor.destinatie} onChange={e => setFormContor(f => ({ ...f, destinatie: e.target.value }))}>
                      <option value="chirias">Chiriaș — apare pe nota/factura chiriașului</option>
                      <option value="administratie">Administrație bloc — indexul merge la bloc</option>
                      <option value="intern">Intern — doar pentru evidență</option>
                    </select>
                  </div>
                </div>
                <div style={{ marginTop: 10, padding: 10, background: 'var(--slate-light)', borderRadius: 8, fontSize: 12, color: 'var(--slate)' }}>
                  {formContor.mod === 'index' && '📊 Introduci indexul la fiecare citire. Consumul și valoarea se calculează automat.'}
                  {formContor.mod === 'fix' && '💶 Introduci suma RON direct (ex. internet 50 RON/lună).'}
                  {formContor.mod === 'bloc' && '🏢 Suma comunicată de administrația blocului.'}
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={() => setModalContor(false)}>Anulează</button>
                <button className="btn btn-primary" disabled={savingCt} onClick={async () => {
                  if (!formContor.denumire.trim() || !formContor.um.trim()) { toast('Completează denumirea și unitatea.', 'error'); return }
                  setSavingCt(true)
                  try {
                    const im = allImobile.find(i => i.id === selImobilC)
                    await saveContor({
                      spatiuId: selSpatiuC,
                      imobilId: selImobilC || im?.id,
                      denumire: formContor.denumire.trim(),
                      um: formContor.um.trim(),
                      mod: formContor.mod,
                      destinatie: formContor.destinatie,
                      ordine: contoare.length,
                    })
                    toast('Contor adăugat!')
                    setModalContor(false)
                    loadContoare()
                  } catch { toast('Eroare.', 'error') }
                  finally { setSavingCt(false) }
                }}>
                  <i className="ti ti-plus" /> {savingCt ? 'Se salvează...' : 'Adaugă contor'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Prețuri utilități per imobil ─────────────────────── */}
        {tabConfig === 'preturi' && (
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header">
              <div>
                <div className="card-title">Prețuri utilități per imobil</div>
                <div className="card-subtitle">Prețul per unitate se aplică automat la calculul consumului</div>
              </div>
            </div>
            <div className="card-body">
              <div className="form-group" style={{ marginBottom: 20 }}>
                <label>Selectează imobil</label>
                <select value={selImobil} onChange={e => setSelImobil(e.target.value)}>
                  <option value="">— Alege imobil —</option>
                  {allImobile.map(im => <option key={im.id} value={im.id}>{im.nume}</option>)}
                </select>
              </div>

              {selImobil && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                    {[
                      { key: 'Energie electrică', label: 'Energie electrică', um: 'kWh', icon: 'ti-bolt', color: '#f59e0b' },
                      { key: 'Gaze',              label: 'Gaze',              um: 'mc',  icon: 'ti-flame', color: '#ef4444' },
                      { key: 'Apă rece',         label: 'Apă rece',         um: 'mc',  icon: 'ti-droplet', color: '#3b82f6' },
                      { key: 'Apă caldă',        label: 'Apă caldă',        um: 'mc',  icon: 'ti-droplet', color: '#f97316' },
                      { key: 'Internet',         label: 'Internet',         um: 'lună',icon: 'ti-wifi',    color: '#10b981' },
                    ].map(u => (
                      <div key={u.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, background: 'var(--slate-light)', borderRadius: 8, border: '1px solid var(--border)' }}>
                        <i className={`ti ${u.icon}`} style={{ color: u.color, fontSize: 20, flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 4 }}>{u.label}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <input
                              type="number"
                              value={preturi[u.key] || ''}
                              onChange={e => setPreturi(p => ({ ...p, [u.key]: e.target.value }))}
                              placeholder="0.00"
                              step="0.01"
                              style={{ width: 80, padding: '4px 8px', fontSize: 13, textAlign: 'right' }}
                            />
                            <span style={{ fontSize: 12, color: 'var(--slate)' }}>RON/{u.um}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="btn btn-primary" disabled={savingPret} onClick={async () => {
                      setSavingPret(true)
                      try {
                        await savePreturiImobil(selImobil, preturi)
                        toast('Prețuri salvate!')
                      } catch { toast('Eroare.', 'error') }
                      finally { setSavingPret(false) }
                    }}>
                      <i className="ti ti-device-floppy" />
                      {savingPret ? 'Se salvează…' : 'Salvează prețuri'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {tabConfig === 'facturare' && <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <div>
              <div className="card-title">Integrare facturare</div>
              <div className="card-subtitle">Conectare cu furnizorul tău de facturare electronică</div>
            </div>
            {cfg.furnizorId && (
              <span className="badge badge-green">
                <i className="ti ti-plug" style={{ fontSize: 11 }} /> Configurat
              </span>
            )}
          </div>
          <div className="card-body">

            {/* Selector furnizor */}
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label>Furnizor facturare</label>
              <select value={cfg.furnizorId} onChange={e => {
                const f = FURNIZORI.find(x => x.id === e.target.value)
                setCfg(c => ({ ...c, furnizorId: e.target.value, endpointCustom: f?.url !== '' ? '' : c.endpointCustom }))
                setTestResult(null)
              }}>
                <option value="">— Alege furnizor —</option>
                {FURNIZORI.map(f => <option key={f.id} value={f.id}>{f.nume}</option>)}
              </select>
              {furnizorSelectat?.docUrl && (
                <div style={{ marginTop: 6 }}>
                  <a href={furnizorSelectat.docUrl} target="_blank" rel="noreferrer"
                    style={{ fontSize: 12, color: 'var(--blue)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <i className="ti ti-external-link" style={{ fontSize: 13 }} />
                    Documentație API {furnizorSelectat.nume}
                  </a>
                </div>
              )}
            </div>

            {cfg.furnizorId && (
              <>
                <div className="form-grid">
                  {/* Token API */}
                  <div className="form-group full">
                    <label>Token / API Key *</label>
                    <input
                      type="password"
                      value={cfg.token}
                      onChange={set('token')}
                      placeholder={
                        cfg.furnizorId === 'oblio'     ? 'Client Secret din Oblio → Setări → API' :
                        cfg.furnizorId === 'fgo'       ? 'Token din FGO → Setări → Utilizatori → User API' :
                        cfg.furnizorId === 'smartbill' ? 'Token din SmartBill → Cont → API Token' :
                        'API Token / Key'
                      }
                    />
                  </div>

                  {/* CIF */}
                  <div className="form-group">
                    <label>CIF firmă (fără RO)</label>
                    <input value={cfg.cif} onChange={set('cif')} placeholder="12345678" />
                  </div>

                  {/* Serie */}
                  <div className="form-group">
                    <label>Serie documente</label>
                    <input value={cfg.serie} onChange={set('serie')} placeholder="FC" />
                  </div>

                  {/* Mediu */}
                  <div className="form-group">
                    <label>Mediu</label>
                    <select value={cfg.env} onChange={set('env')}>
                      <option value="test">Test / Sandbox</option>
                      <option value="prod">Producție</option>
                    </select>
                  </div>

                  {/* Endpoint custom */}
                  {cfg.furnizorId === 'custom' && (
                    <div className="form-group full">
                      <label>Endpoint API (URL complet) *</label>
                      <input
                        value={cfg.endpointCustom}
                        onChange={set('endpointCustom')}
                        placeholder="https://api.furnizor.ro/v1"
                      />
                    </div>
                  )}

                  {/* Endpoint activ (readonly) */}
                  {cfg.furnizorId !== 'custom' && (
                    <div className="form-group full">
                      <label>Endpoint activ</label>
                      <input
                        value={cfg.env === 'test' && furnizorSelectat?.urlTest ? furnizorSelectat.urlTest : endpointActiv}
                        readOnly
                        style={{ background: 'var(--slate-light)', color: 'var(--slate)', fontSize: 12 }}
                      />
                    </div>
                  )}
                </div>

                {/* Test conexiune */}
                <div style={{ marginTop: 16, padding: 14, background: 'var(--slate-light)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate)', marginBottom: 8 }}>
                    Testare conexiune
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <button className="btn btn-ghost btn-sm" onClick={handleTest} disabled={testing || !cfg.token}>
                      <i className={`ti ${testing ? 'ti-refresh' : 'ti-plug'}`} />
                      {testing ? 'Se testează…' : 'Testează conexiunea'}
                    </button>
                    {testResult && (
                      <span style={{ fontSize: 13, color: testResult.ok ? 'var(--green)' : 'var(--red)', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <i className={`ti ${testResult.ok ? 'ti-check-circle' : 'ti-alert-circle'}`} />
                        {testResult.mesaj}
                      </span>
                    )}
                  </div>
                </div>
              </>
            )}

            {!cfg.furnizorId && (
              <div className="alert alert-info">
                <i className="ti ti-info-circle" />
                <span>
                  Fără integrare configurată, facturile se salvează local și se trimit doar pe email.
                  Nu vor fi transmise în SPV ANAF.
                </span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                <i className="ti ti-device-floppy" />
                {saving ? 'Se salvează…' : 'Salvează configurarea'}
              </button>
            </div>
          </div>
        </div>

}
        {tabConfig === 'emailjs' && <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <div className="card-title">EmailJS — trimitere emailuri</div>
            <div className="card-subtitle">Configurat prin variabile de mediu Netlify</div>
          </div>
          <div className="card-body" style={{ fontSize: 13, color: 'var(--slate)', lineHeight: 1.8 }}>
            <p style={{ marginBottom: 10 }}>Pași configurare:</p>
            <ol style={{ paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <li>Cont gratuit la <a href="https://www.emailjs.com" target="_blank" rel="noreferrer" style={{ color: 'var(--blue)' }}>emailjs.com</a> (200 emailuri/lună gratuit)</li>
              <li>Adaugă un <strong>Service</strong> → Yahoo Mail sau Gmail</li>
              <li>Creează template-uri: <code>template_factura</code> și <code>template_mesaj</code></li>
              <li>Copiază <strong>Service ID</strong>, <strong>Template IDs</strong> și <strong>Public Key</strong></li>
              <li>Adaugă în <strong>Netlify → Environment variables</strong></li>
            </ol>
            <div style={{ marginTop: 12, padding: 12, background: 'var(--slate-light)', borderRadius: 6, fontSize: 12 }}>
              <strong>Variabile necesare în Netlify:</strong><br />
              <code>VITE_EMAILJS_SERVICE_ID</code> &nbsp;
              <code>VITE_EMAILJS_TEMPLATE_FACTURA</code> &nbsp;
              <code>VITE_EMAILJS_TEMPLATE_MESAJ</code> &nbsp;
              <code>VITE_EMAILJS_PUBLIC_KEY</code>
            </div>
          </div>
        </div>

}
        {tabConfig === 'firebase' && <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <div className="card-title">Firebase — autentificare și date</div>
          </div>
          <div className="card-body" style={{ fontSize: 13, color: 'var(--slate)', lineHeight: 1.8 }}>
            <ol style={{ paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <li>Creează proiect la <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" style={{ color: 'var(--blue)' }}>console.firebase.google.com</a></li>
              <li>Activează <strong>Authentication → Email/Password</strong></li>
              <li>Adaugă utilizatorii din <strong>Authentication → Users</strong></li>
              <li>Activează <strong>Firestore Database</strong></li>
              <li>Adaugă variabilele <code>VITE_FIREBASE_*</code> în Netlify</li>
            </ol>
            <div style={{ marginTop: 12, padding: 12, background: 'var(--slate-light)', borderRadius: 6, fontSize: 12 }}>
              <strong>Reguli Firestore:</strong>
              <pre style={{ marginTop: 6, whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: 11 }}>{`rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    match /{doc=**} {
      allow read, write: if request.auth != null;
    }
  }
}`}</pre>
            </div>
          </div>
        </div>

}
        {tabConfig === 'firebase' && <div className="card">
          <div className="card-header">
            <div className="card-title">Deploy Netlify + GitHub</div>
          </div>
          <div className="card-body" style={{ fontSize: 13, color: 'var(--slate)', lineHeight: 1.8 }}>
            <ol style={{ paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <li>Push pe GitHub → Netlify redeploy automat</li>
              <li>Variabile de mediu: <strong>Site configuration → Environment variables</strong></li>
              <li>Build command: <code>npm run build</code> · Publish: <code>dist</code></li>
            </ol>
          </div>
        </div>}

      </div>
    </>
  )
}
