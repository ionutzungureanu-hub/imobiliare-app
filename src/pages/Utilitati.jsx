import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Topbar from '../components/Topbar'
import { useToast } from '../components/Toast'
import { useAuth } from '../context/AuthContext'
import { useImobile } from '../hooks/useImobile'
import {
  getSpatii, getClienti,
  getContoareSpatiu, saveContor, deleteContor,
  getCitiriContor, saveCitire, deleteCitire2,
  getPreturiImobil
} from '../firebase/firestore'
import { fmt } from '../utils'

// ── Tipuri de contoare disponibile ─────────────────────────────
const TIPURI_CONTOR = [
  { tip: 'Energie electrică', um: 'kWh', mod: 'index', icon: 'ti-bolt',     color: '#f59e0b' },
  { tip: 'Gaze',              um: 'mc',  mod: 'index', icon: 'ti-flame',     color: '#ef4444' },
  { tip: 'Apă rece',         um: 'mc',  mod: 'index', icon: 'ti-droplet',   color: '#3b82f6' },
  { tip: 'Apă caldă',        um: 'mc',  mod: 'index', icon: 'ti-droplet',   color: '#f97316' },
  { tip: 'Apă bloc',         um: 'RON', mod: 'bloc',  icon: 'ti-building',  color: '#8b5cf6' },
  { tip: 'Internet',         um: 'RON', mod: 'fix',   icon: 'ti-wifi',      color: '#10b981' },
  { tip: 'Altul',            um: '',    mod: 'index', icon: 'ti-plug',      color: '#6b7280' },
]

const TODAY = new Date().toISOString().split('T')[0]

export default function Utilitati() {
  const navigate  = useNavigate()
  const toast     = useToast()
  const { isAdmin } = useAuth()
  const { imobile } = useImobile()

  const [spatii,     setSpatii]     = useState([])
  const [clienti,    setClienti]    = useState([])
  const [imobilId,   setImobilId]   = useState('')
  const [spatiuId,   setSpatiuId]   = useState('')
  const [contoare,   setContoare]   = useState([])
  const [citiriMap,  setCitiriMap]  = useState({}) // contorId → [citiri]
  const [preturi,    setPreturi]    = useState({})
  const [loading,    setLoading]    = useState(false)

  // State pentru citiri noi (toate deodată)
  const [noileCitiri, setNoileCitiri] = useState({}) // contorId → { index, valoare, data, nota }
  const [saving,     setSaving]     = useState(false)

  // Modal contor nou
  const [modalContor, setModalContor] = useState(false)
  const [formContor,  setFormContor]  = useState({ tip: 'Energie electrică', um: 'kWh', mod: 'index', denumireCustom: '' })

  useEffect(() => {
    Promise.all([getSpatii(), getClienti()]).then(([sp, cl]) => {
      setSpatii(sp); setClienti(cl)
    })
  }, [imobile])

  const spatiiImobil = spatii.filter(s => s.imobilId === imobilId)
  const spatiu       = spatii.find(s => s.id === spatiuId)
  const client       = clienti.find(c => spatiu?.clienti?.find(sc => sc.clientId === c.id && sc.rol === 'Chiriaș principal') || c.id === spatiu?.clientId)
  const isPF         = client?.tip === 'PF'

  const loadContoare = useCallback(async () => {
    if (!spatiuId) { setContoare([]); setCitiriMap({}); return }
    setLoading(true)
    const [ct, pr] = await Promise.all([
      getContoareSpatiu(spatiuId),
      imobilId ? getPreturiImobil(imobilId) : Promise.resolve({})
    ])
    setContoare(ct)
    setPreturi(pr)
    // Load citiri per contor
    const map = {}
    await Promise.all(ct.map(async c => { map[c.id] = await getCitiriContor(c.id) }))
    setCitiriMap(map)
    // Init noileCitiri
    const init = {}
    ct.forEach(c => { init[c.id] = { index: '', valoare: '', data: TODAY, nota: '' } })
    setNoileCitiri(init)
    setLoading(false)
  }, [spatiuId, imobilId])

  useEffect(() => { loadContoare() }, [loadContoare])

  // ── Helpers ───────────────────────────────────────────────────
  const getPret = (contor) => preturi[contor.tip] || preturi[contor.um] || 0

  const calcConsum = (contor) => {
    const citiri = citiriMap[contor.id] || []
    const ultima = citiri[0]
    const nou    = noileCitiri[contor.id]
    if (contor.mod !== 'index' || !nou?.index || !ultima?.index) return null
    return Math.max(0, Number(nou.index) - Number(ultima.index))
  }

  const calcValoare = (contor) => {
    const nou = noileCitiri[contor.id]
    if (contor.mod === 'index') {
      const consum = calcConsum(contor)
      if (consum === null) return null
      return consum * getPret(contor)
    }
    return Number(nou?.valoare) || null
  }

  const updateCitire = (contorId, field, value) =>
    setNoileCitiri(prev => ({ ...prev, [contorId]: { ...prev[contorId], [field]: value } }))

  // ── Salvare toate citirile ────────────────────────────────────
  const handleSaveAll = async () => {
    const contoareCuDate = contoare.filter(c => {
      const nou = noileCitiri[c.id]
      return c.mod === 'index' ? !!nou?.index : !!nou?.valoare
    })
    if (contoareCuDate.length === 0) { toast('Nu ai introdus nicio citire.', 'error'); return }
    setSaving(true)
    try {
      await Promise.all(contoareCuDate.map(async c => {
        const nou    = noileCitiri[c.id]
        const citiri = citiriMap[c.id] || []
        const ultima = citiri[0]
        const consum = c.mod === 'index' && ultima?.index !== undefined
          ? Math.max(0, Number(nou.index) - Number(ultima.index))
          : null
        const pret    = getPret(c)
        const valoare = c.mod === 'index'
          ? (consum !== null ? consum * pret : null)
          : Number(nou.valoare)
        await saveCitire({
          contorId:  c.id,
          spatiuId,
          imobilId,
          tip:       c.tip,
          um:        c.um,
          mod:       c.mod,
          index:     c.mod === 'index' ? Number(nou.index) : null,
          indexPrecedent: ultima?.index ?? null,
          consum,
          pret,
          valoare,
          data:      nou.data || TODAY,
          nota:      nou.nota || '',
        })
      }))
      toast(`${contoareCuDate.length} citiri salvate!`)
      await loadContoare()
    } catch (err) { toast('Eroare: ' + err.message, 'error') }
    finally { setSaving(false) }
  }

  // ── Adaugă contor ─────────────────────────────────────────────
  const handleAddContor = async () => {
    const tipDef = TIPURI_CONTOR.find(t => t.tip === formContor.tip)
    const data = {
      spatiuId,
      imobilId,
      tip:      formContor.tip === 'Altul' ? formContor.denumireCustom : formContor.tip,
      um:       formContor.um || tipDef?.um || '',
      mod:      formContor.mod || tipDef?.mod || 'index',
      ordine:   contoare.length,
    }
    if (!data.tip) { toast('Completează tipul contorului.', 'error'); return }
    setSaving(true)
    try {
      await saveContor(data)
      toast('Contor adăugat!')
      setModalContor(false)
      await loadContoare()
    } catch { toast('Eroare.', 'error') }
    finally { setSaving(false) }
  }

  const handleDeleteContor = async (c) => {
    if (!confirm(`Ștergi contorul "${c.tip}" și toate citirile?`)) return
    await deleteContor(c.id)
    toast('Contor șters.')
    await loadContoare()
  }

  const handleDeleteCitire = async (citireId) => {
    if (!confirm('Ștergi această citire?')) return
    await deleteCitire2(citireId)
    toast('Citire ștearsă.')
    await loadContoare()
  }

  const tipInfo = (tip) => TIPURI_CONTOR.find(t => t.tip === tip) || TIPURI_CONTOR[6]

  return (
    <>
      <Topbar title="Utilități" subtitle="Citiri contoare și consum per spațiu" />

      <div className="content">
        {/* Selector imobil → spațiu */}
        <div className="card" style={{ marginBottom: 20, padding: 16 }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ flex: 1, minWidth: 200, marginBottom: 0 }}>
              <label>Imobil</label>
              <select value={imobilId} onChange={e => { setImobilId(e.target.value); setSpatiuId('') }}>
                <option value="">— Alege imobil —</option>
                {imobile.map(im => <option key={im.id} value={im.id}>{im.nume}</option>)}
              </select>
            </div>
            {imobilId && (
              <div className="form-group" style={{ flex: 1, minWidth: 200, marginBottom: 0 }}>
                <label>Spațiu</label>
                <select value={spatiuId} onChange={e => setSpatiuId(e.target.value)}>
                  <option value="">— Alege spațiu —</option>
                  {spatiiImobil.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.denumire}{s.suprafata ? ` (${s.suprafata} mp)` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {spatiuId && client && (
              <div style={{ fontSize: 13, color: 'var(--slate)', paddingBottom: 6 }}>
                <span style={{ fontWeight: 500 }}>{client.nume}</span>
                <span className={`badge ${isPF ? 'badge-green' : 'badge-blue'}`} style={{ marginLeft: 8, fontSize: 10 }}>
                  {isPF ? 'PF' : 'PJ'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Prețuri imobil — link rapid */}
        {imobilId && (
          <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--slate)' }}>
            <i className="ti ti-info-circle" />
            Prețuri per unitate pentru acest imobil:
            {Object.keys(preturi).length === 0
              ? <span style={{ color: 'var(--amber)' }}>Nesetate — </span>
              : Object.entries(preturi).filter(([k]) => k !== 'updatedAt').map(([k, v]) => (
                  <span key={k} style={{ background: 'var(--slate-light)', borderRadius: 4, padding: '2px 8px' }}>
                    {k}: <strong>{v} RON/{k === 'Internet' ? 'lună' : k === 'Energie electrică' ? 'kWh' : 'mc'}</strong>
                  </span>
                ))
            }
            <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/config?tab=preturi&imobilId=${imobilId}`)}>
              <i className="ti ti-settings" /> Setează prețuri
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && <div className="empty"><i className="ti ti-refresh" /><p>Se încarcă...</p></div>}

        {/* Contoare + citiri noi */}
        {!loading && spatiuId && (
          <>
            {/* Header acțiuni */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>
                Contoare — {spatiu?.denumire}
                <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--slate)', marginLeft: 8 }}>
                  {contoare.length} contoare configurate
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => {
                  setFormContor({ tip: 'Energie electrică', um: 'kWh', mod: 'index', denumireCustom: '' })
                  setModalContor(true)
                }}>
                  <i className="ti ti-plus" /> Contor nou
                </button>
                {contoare.length > 0 && (
                  <button className="btn btn-primary btn-sm" onClick={handleSaveAll} disabled={saving}>
                    <i className={`ti ${saving ? 'ti-refresh' : 'ti-device-floppy'}`} />
                    {saving ? 'Se salvează…' : 'Salvează toate citirile'}
                  </button>
                )}
              </div>
            </div>

            {contoare.length === 0 ? (
              <div className="card">
                <div className="empty">
                  <i className="ti ti-plug" />
                  <p>Niciun contor configurat. Adaugă primul contor pentru acest spațiu.</p>
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16 }}>
                {contoare.map(c => {
                  const info    = tipInfo(c.tip)
                  const citiri  = citiriMap[c.id] || []
                  const ultima  = citiri[0]
                  const nou     = noileCitiri[c.id] || {}
                  const consum  = calcConsum(c)
                  const valoare = calcValoare(c)
                  const pret    = getPret(c)

                  return (
                    <div key={c.id} className="card">
                      {/* Header contor */}
                      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--border)' }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: info.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <i className={`ti ${info.icon}`} style={{ color: info.color, fontSize: 18 }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{c.tip}</div>
                          <div style={{ fontSize: 11, color: 'var(--slate)' }}>
                            {c.mod === 'index' ? `Index · ${c.um}` : c.mod === 'fix' ? 'Sumă fixă lunară' : 'Sumă bloc'}
                            {pret > 0 && c.mod === 'index' && ` · ${pret} RON/${c.um}`}
                          </div>
                        </div>
                        <button className="remove-btn" onClick={() => handleDeleteContor(c)} title="Șterge contor">
                          <i className="ti ti-x" style={{ fontSize: 14 }} />
                        </button>
                      </div>

                      <div style={{ padding: 14 }}>
                        {/* Ultima citire */}
                        {ultima ? (
                          <div style={{ background: 'var(--blue-light)', borderRadius: 8, padding: '8px 12px', marginBottom: 14, fontSize: 12 }}>
                            <span style={{ color: 'var(--slate)' }}>Ultima citire ({ultima.data}): </span>
                            {c.mod === 'index'
                              ? <strong>{ultima.index} {c.um}</strong>
                              : <strong>{fmt(ultima.valoare)} RON</strong>
                            }
                          </div>
                        ) : (
                          <div style={{ background: 'var(--amber-light)', borderRadius: 8, padding: '8px 12px', marginBottom: 14, fontSize: 12, color: 'var(--amber)' }}>
                            <i className="ti ti-alert-triangle" style={{ fontSize: 12 }} /> Prima citire — introdu indexul inițial
                          </div>
                        )}

                        {/* Input citire nouă */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                          {c.mod === 'index' ? (
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label>Index nou ({c.um})</label>
                              <input
                                type="number"
                                value={nou.index || ''}
                                onChange={e => updateCitire(c.id, 'index', e.target.value)}
                                placeholder={ultima ? `> ${ultima.index}` : 'Index inițial'}
                                style={{ textAlign: 'center', fontWeight: 700, fontSize: 16 }}
                              />
                            </div>
                          ) : (
                            <div className="form-group" style={{ marginBottom: 0 }}>
                              <label>Sumă (RON)</label>
                              <input
                                type="number"
                                value={nou.valoare || ''}
                                onChange={e => updateCitire(c.id, 'valoare', e.target.value)}
                                placeholder="0.00"
                                step="0.01"
                                style={{ textAlign: 'center', fontWeight: 700, fontSize: 16 }}
                              />
                            </div>
                          )}
                          <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>Data citirii</label>
                            <input type="date" value={nou.data || TODAY} onChange={e => updateCitire(c.id, 'data', e.target.value)} />
                          </div>
                        </div>

                        {/* Preview calcul */}
                        {c.mod === 'index' && nou.index && ultima && (
                          <div style={{ background: consum >= 0 ? '#f0fdf4' : '#fef2f2', border: `1px solid ${consum >= 0 ? '#86efac' : '#fca5a5'}`, borderRadius: 8, padding: '8px 12px', marginBottom: 10, fontSize: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>Consum: <strong>{consum} {c.um}</strong></span>
                              {pret > 0 && <span>Valoare: <strong style={{ color: 'var(--green)' }}>{fmt(valoare)} RON</strong></span>}
                            </div>
                          </div>
                        )}

                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label>Notă (opțional)</label>
                          <input value={nou.nota || ''} onChange={e => updateCitire(c.id, 'nota', e.target.value)} placeholder="ex. Citire estimată" />
                        </div>
                      </div>

                      {/* Istoric citiri */}
                      {citiri.length > 0 && (
                        <div style={{ borderTop: '1px solid var(--border)' }}>
                          <div style={{ padding: '8px 16px', fontSize: 11, fontWeight: 600, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '.5px', background: 'var(--slate-light)' }}>
                            Istoric
                          </div>
                          <table style={{ fontSize: 12 }}>
                            <thead>
                              <tr>
                                <th>Data</th>
                                {c.mod === 'index' && <><th>Index</th><th>Consum</th></>}
                                <th>Valoare</th>
                                <th></th>
                              </tr>
                            </thead>
                            <tbody>
                              {citiri.slice(0, 6).map((cit, i) => (
                                <tr key={cit.id} style={{ background: i === 0 ? 'var(--blue-light)' : 'transparent' }}>
                                  <td style={{ fontWeight: i === 0 ? 600 : 400 }}>{cit.data}</td>
                                  {c.mod === 'index' && (
                                    <>
                                      <td><strong>{cit.index} {c.um}</strong></td>
                                      <td style={{ color: 'var(--green)', fontWeight: 600 }}>
                                        {cit.consum != null ? `${cit.consum} ${c.um}` : '—'}
                                      </td>
                                    </>
                                  )}
                                  <td style={{ color: 'var(--green)', fontWeight: 500 }}>
                                    {cit.valoare != null ? fmt(cit.valoare) + ' RON' : '—'}
                                  </td>
                                  <td>
                                    <button className="remove-btn" onClick={() => handleDeleteCitire(cit.id)}>
                                      <i className="ti ti-x" style={{ fontSize: 12 }} />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Acțiuni finale */}
            {contoare.length > 0 && spatiuId && (
              <div style={{ marginTop: 20, display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <button className="btn btn-primary btn-sm" onClick={handleSaveAll} disabled={saving}>
                  <i className={`ti ${saving ? 'ti-refresh' : 'ti-device-floppy'}`} />
                  {saving ? 'Se salvează…' : 'Salvează toate citirile'}
                </button>
                {isPF ? (
                  <button className="btn btn-primary" onClick={() => navigate(`/nota-calcul?spatiuId=${spatiuId}`)}>
                    <i className="ti ti-calculator" /> Notă utilități PF
                  </button>
                ) : (
                  <button className="btn btn-primary" onClick={() => navigate(`/emite-utilitati?spatiuId=${spatiuId}`)}>
                    <i className="ti ti-receipt" /> Factură utilități PJ
                  </button>
                )}
                <button className="btn btn-ghost" onClick={() => navigate(`/nota-administratie?imobilId=${imobilId}&spatiuId=${spatiuId}`)}>
                  <i className="ti ti-droplet" /> Notă apă bloc
                </button>
              </div>
            )}
          </>
        )}

        {!spatiuId && !loading && imobilId && (
          <div className="empty"><i className="ti ti-building" /><p>Selectează un spațiu pentru a vedea utilitățile.</p></div>
        )}
        {!imobilId && !loading && (
          <div className="empty"><i className="ti ti-home" /><p>Selectează un imobil pentru a începe.</p></div>
        )}
      </div>

      {/* ── Modal contor nou ──────────────────────────────────── */}
      {modalContor && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalContor(false)}>
          <div className="modal-box" style={{ width: 460 }}>
            <div className="modal-head">
              <h3>Adaugă contor — {spatiu?.denumire}</h3>
              <button className="modal-close" onClick={() => setModalContor(false)}><i className="ti ti-x" /></button>
            </div>
            <div className="modal-body">
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label>Tip utilitate</label>
                <select value={formContor.tip} onChange={e => {
                  const found = TIPURI_CONTOR.find(t => t.tip === e.target.value)
                  setFormContor(f => ({ ...f, tip: e.target.value, um: found?.um || '', mod: found?.mod || 'index' }))
                }}>
                  {TIPURI_CONTOR.map(t => (
                    <option key={t.tip} value={t.tip}>
                      {t.tip} — {t.mod === 'index' ? 'cu index' : t.mod === 'fix' ? 'sumă fixă' : 'sumă bloc'}
                    </option>
                  ))}
                </select>
              </div>

              {formContor.tip === 'Altul' && (
                <div className="form-grid">
                  <div className="form-group">
                    <label>Denumire *</label>
                    <input value={formContor.denumireCustom} onChange={e => setFormContor(f => ({ ...f, denumireCustom: e.target.value }))} placeholder="ex. Aer condiționat" />
                  </div>
                  <div className="form-group">
                    <label>Unitate măsură</label>
                    <input value={formContor.um} onChange={e => setFormContor(f => ({ ...f, um: e.target.value }))} placeholder="kWh / mc / RON" />
                  </div>
                </div>
              )}

              <div className="form-group">
                <label>Mod calcul</label>
                <select value={formContor.mod} onChange={e => setFormContor(f => ({ ...f, mod: e.target.value }))}>
                  <option value="index">Index — calcul consum automat (contor propriu)</option>
                  <option value="fix">Sumă fixă — introduci suma lunară direct</option>
                  <option value="bloc">Sumă bloc — suma primită de la administrație</option>
                </select>
              </div>

              {/* Info per mod */}
              <div style={{ marginTop: 12, padding: 12, background: 'var(--blue-light)', borderRadius: 8, fontSize: 12, color: 'var(--slate)' }}>
                {formContor.mod === 'index' && '📊 Introduci indexul la fiecare citire. Consumul se calculează automat față de citirea anterioară.'}
                {formContor.mod === 'fix'   && '💶 Introduci suma fixă în RON la fiecare perioadă (ex. internet: 50 RON/lună).'}
                {formContor.mod === 'bloc'  && '🏢 Introduci suma primită de la administrația blocului pentru apă/întreținere.'}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModalContor(false)}>Anulează</button>
              <button className="btn btn-primary" onClick={handleAddContor} disabled={saving}>
                <i className="ti ti-plus" /> Adaugă contor
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
