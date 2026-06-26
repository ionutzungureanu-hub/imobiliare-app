import { useEffect, useState } from 'react'
import Topbar from '../components/Topbar'
import { useToast } from '../components/Toast'
import {
  getSpatii, getImobile,
  getContoare, addContor, updateContor, deleteContor,
  getCitiri, addCitire, deleteCitire
} from '../firebase/firestore'
import { fmtDate } from '../utils'

const TIPURI_DEFAULT = [
  { tip: 'Energie electrică', um: 'kWh', icon: 'ti-bolt' },
  { tip: 'Apă rece baie',     um: 'mc',  icon: 'ti-droplet' },
  { tip: 'Apă caldă baie',    um: 'mc',  icon: 'ti-droplet' },
  { tip: 'Apă rece bucătărie',um: 'mc',  icon: 'ti-droplet' },
  { tip: 'Apă caldă bucătărie',um:'mc',  icon: 'ti-droplet' },
  { tip: 'Gaze',              um: 'mc',  icon: 'ti-flame' },
  { tip: 'Internet',          um: 'RON', icon: 'ti-wifi', fix: true },
]

export default function Utilitati() {
  const toast = useToast()

  const [imobile,   setImobile]   = useState([])
  const [spatii,    setSpatii]    = useState([])
  const [spatiuId,  setSpatiuId]  = useState('')
  const [contoare,  setContoare]  = useState([])
  const [citiriMap, setCitiriMap] = useState({}) // contorId → [citiri]
  const [loading,   setLoading]   = useState(false)

  // Modal contor nou
  const [modalC,    setModalC]    = useState(false)
  const [formC,     setFormC]     = useState({ tip: 'Energie electrică', um: 'kWh', fix: false, custom: false, tipCustom: '' })

  // Modal citire nouă
  const [modalCit,  setModalCit]  = useState(null) // contorId
  const [formCit,   setFormCit]   = useState({ mod: 'index', index: '', valoare: '', data: new Date().toISOString().split('T')[0], nota: '' })

  const [saving,    setSaving]    = useState(false)

  // Load imobile + spatii
  useEffect(() => {
    Promise.all([getImobile(), getSpatii()]).then(([im, sp]) => {
      setImobile(im); setSpatii(sp)
      if (sp.length > 0 && !spatiuId) setSpatiuId(sp[0].id)
    })
  }, [])

  // Load contoare când se schimbă spațiul
  useEffect(() => {
    if (!spatiuId) return
    setLoading(true)
    getContoare(spatiuId).then(async (ct) => {
      setContoare(ct)
      // Load citiri pentru fiecare contor
      const map = {}
      await Promise.all(ct.map(async c => {
        map[c.id] = await getCitiri(c.id)
      }))
      setCitiriMap(map)
      setLoading(false)
    })
  }, [spatiuId])

  const reloadContoare = async () => {
    const ct = await getContoare(spatiuId)
    setContoare(ct)
    const map = {}
    await Promise.all(ct.map(async c => { map[c.id] = await getCitiri(c.id) }))
    setCitiriMap(map)
  }

  // ── Adaugă contor ────────────────────────────────────────────
  const handleAddContor = async () => {
    const tip = formC.custom ? formC.tipCustom : formC.tip
    if (!tip) { toast('Completează tipul contorului.', 'error'); return }
    setSaving(true)
    try {
      await addContor({ spatiuId, tip, um: formC.um, fix: formC.fix })
      toast('Contor adăugat!')
      setModalC(false)
      reloadContoare()
    } catch { toast('Eroare.', 'error') }
    finally { setSaving(false) }
  }

  const handleDeleteContor = async (id, tip) => {
    if (!confirm(`Ștergi contorul "${tip}" și toate citirile?`)) return
    await deleteContor(id)
    toast('Contor șters.')
    reloadContoare()
  }

  // ── Adaugă citire ────────────────────────────────────────────
  const handleAddCitire = async () => {
    const contor  = contoare.find(c => c.id === modalCit)
    const citiri  = citiriMap[modalCit] || []
    const ultima  = citiri[0] // cea mai recentă

    let consum = null
    let valoare = null

    if (formCit.mod === 'index') {
      if (!formCit.index) { toast('Introdu indexul.', 'error'); return }
      const indexNou = Number(formCit.index)
      if (ultima?.index !== undefined) {
        consum = Math.max(0, indexNou - Number(ultima.index))
      }
      valoare = null
    } else {
      if (!formCit.valoare) { toast('Introdu valoarea.', 'error'); return }
      valoare = Number(formCit.valoare)
    }

    setSaving(true)
    try {
      await addCitire({
        contorId:  modalCit,
        spatiuId,
        tip:       contor.tip,
        um:        contor.um,
        mod:       formCit.mod,
        index:     formCit.mod === 'index' ? Number(formCit.index) : null,
        consum,
        valoare,
        data:      formCit.data,
        nota:      formCit.nota,
      })
      toast('Citire adăugată!')
      setModalCit(null)
      setFormCit({ mod: 'index', index: '', valoare: '', data: new Date().toISOString().split('T')[0], nota: '' })
      reloadContoare()
    } catch { toast('Eroare.', 'error') }
    finally { setSaving(false) }
  }

  const spatiu = spatii.find(s => s.id === spatiuId)
  const getImobilNume = (id) => imobile.find(i => i.id === id)?.nume || ''

  return (
    <>
      <Topbar title="Utilități" subtitle="Indecși și consum per spațiu" />

      <div className="content">
        {/* Selector spațiu */}
        <div className="card" style={{ marginBottom: 20, padding: 16 }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Spațiu:</div>
            <select
              value={spatiuId}
              onChange={e => setSpatiuId(e.target.value)}
              style={{ minWidth: 260 }}
            >
              <option value="">— Alege spațiu —</option>
              {imobile.length > 0
                ? imobile.map(im => (
                    <optgroup key={im.id} label={im.nume}>
                      {spatii.filter(s => s.imobilId === im.id).map(s => (
                        <option key={s.id} value={s.id}>{s.denumire}{s.suprafata ? ` (${s.suprafata} mp)` : ''}</option>
                      ))}
                    </optgroup>
                  ))
                : spatii.map(s => (
                    <option key={s.id} value={s.id}>{s.denumire}{s.suprafata ? ` (${s.suprafata} mp)` : ''}</option>
                  ))
              }
            </select>
            {spatiu && <span className={`badge ${spatiu.status === 'Ocupat' ? 'badge-green' : 'badge-amber'}`}>{spatiu.status}</span>}
            {spatiuId && (
              <button className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }} onClick={() => {
                setFormC({ tip: 'Energie electrică', um: 'kWh', fix: false, custom: false, tipCustom: '' })
                setModalC(true)
              }}>
                <i className="ti ti-plus" /> Adaugă contor
              </button>
            )}
          </div>
        </div>

        {!spatiuId && (
          <div className="empty"><i className="ti ti-home" /><p>Selectează un spațiu pentru a vedea utilitățile.</p></div>
        )}

        {loading && <div className="empty"><i className="ti ti-refresh" /><p>Se încarcă…</p></div>}

        {/* Contoare */}
        {!loading && spatiuId && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 16 }}>
            {contoare.length === 0 ? (
              <div className="card" style={{ gridColumn: '1/-1' }}>
                <div className="empty"><i className="ti ti-plug" /><p>Niciun contor adăugat pentru acest spațiu.</p></div>
              </div>
            ) : contoare.map(contor => {
              const citiri = citiriMap[contor.id] || []
              const ultima = citiri[0]
              const penultima = citiri[1]
              const consum = ultima?.consum

              return (
                <div key={contor.id} className="card">
                  <div className="card-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <i className={`ti ${TIPURI_DEFAULT.find(t => t.tip === contor.tip)?.icon || 'ti-plug'}`}
                         style={{ fontSize: 18, color: 'var(--blue)' }} />
                      <div>
                        <div className="card-title">{contor.tip}</div>
                        <div className="card-subtitle">Unitate: {contor.um}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-primary btn-sm" onClick={() => {
                        setModalCit(contor.id)
                        setFormCit({ mod: contor.fix ? 'valoare' : 'index', index: '', valoare: '', data: new Date().toISOString().split('T')[0], nota: '' })
                      }}>
                        <i className="ti ti-plus" /> Citire
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDeleteContor(contor.id, contor.tip)}>
                        <i className="ti ti-trash" />
                      </button>
                    </div>
                  </div>

                  <div className="card-body">
                    {/* Ultima citire */}
                    {ultima ? (
                      <div style={{ background: 'var(--blue-light)', borderRadius: 'var(--radius-sm)', padding: 12, marginBottom: 12 }}>
                        <div style={{ fontSize: 11, color: 'var(--blue)', fontWeight: 600, marginBottom: 4 }}>ULTIMA CITIRE — {ultima.data}</div>
                        {ultima.mod === 'index' ? (
                          <div style={{ display: 'flex', gap: 20, fontSize: 13 }}>
                            <div><span style={{ color: 'var(--slate)' }}>Index: </span><strong>{ultima.index} {contor.um}</strong></div>
                            {consum !== null && <div><span style={{ color: 'var(--slate)' }}>Consum: </span><strong style={{ color: 'var(--green)' }}>{consum} {contor.um}</strong></div>}
                          </div>
                        ) : (
                          <div style={{ fontSize: 13 }}>
                            <span style={{ color: 'var(--slate)' }}>Valoare: </span><strong>{ultima.valoare} RON</strong>
                          </div>
                        )}
                        {ultima.nota && <div style={{ fontSize: 11, color: 'var(--slate)', marginTop: 4 }}>{ultima.nota}</div>}
                      </div>
                    ) : (
                      <div style={{ color: 'var(--slate)', fontSize: 13, marginBottom: 12 }}>Nicio citire înregistrată.</div>
                    )}

                    {/* Tabel istoric */}
                    {citiri.length > 0 && (
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--slate)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.5px' }}>
                          Istoric citiri
                        </div>
                        <table style={{ fontSize: 12 }}>
                          <thead>
                            <tr>
                              <th>Dată</th>
                              <th>{contor.fix ? 'Valoare RON' : 'Index'}</th>
                              {!contor.fix && <th>Consum</th>}
                              <th>Notă</th>
                              <th></th>
                            </tr>
                          </thead>
                          <tbody>
                            {citiri.map((cit, i) => (
                              <tr key={cit.id}>
                                <td>{cit.data}</td>
                                <td>
                                  {cit.mod === 'index'
                                    ? <strong>{cit.index} {contor.um}</strong>
                                    : <strong>{cit.valoare} RON</strong>
                                  }
                                </td>
                                {!contor.fix && (
                                  <td>
                                    {cit.consum !== null && cit.consum !== undefined
                                      ? <span style={{ color: 'var(--green)', fontWeight: 600 }}>{cit.consum} {contor.um}</span>
                                      : <span style={{ color: 'var(--slate)' }}>—</span>
                                    }
                                  </td>
                                )}
                                <td style={{ color: 'var(--slate)' }}>{cit.nota || '—'}</td>
                                <td>
                                  <button className="remove-btn" onClick={async () => {
                                    if (!confirm('Ștergi această citire?')) return
                                    await deleteCitire(cit.id)
                                    toast('Citire ștearsă.')
                                    reloadContoare()
                                  }}>
                                    <i className="ti ti-x" style={{ fontSize: 13 }} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Modal contor nou ──────────────────────────────────── */}
      {modalC && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalC(false)}>
          <div className="modal-box">
            <div className="modal-head">
              <h3>Adaugă contor</h3>
              <button className="modal-close" onClick={() => setModalC(false)}><i className="ti ti-x" /></button>
            </div>
            <div className="modal-body">
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label>Tip contor</label>
                <select value={formC.custom ? 'custom' : formC.tip} onChange={e => {
                  if (e.target.value === 'custom') {
                    setFormC(f => ({ ...f, custom: true, tip: '', um: '' }))
                  } else {
                    const found = TIPURI_DEFAULT.find(t => t.tip === e.target.value)
                    setFormC(f => ({ ...f, custom: false, tip: e.target.value, um: found?.um || '', fix: found?.fix || false }))
                  }
                }}>
                  {TIPURI_DEFAULT.map(t => <option key={t.tip} value={t.tip}>{t.tip}</option>)}
                  <option value="custom">+ Altul (custom)</option>
                </select>
              </div>
              {formC.custom && (
                <div className="form-grid" style={{ marginBottom: 14 }}>
                  <div className="form-group">
                    <label>Denumire contor *</label>
                    <input value={formC.tipCustom} onChange={e => setFormC(f => ({ ...f, tipCustom: e.target.value }))} placeholder="ex. Aer condiționat" />
                  </div>
                  <div className="form-group">
                    <label>Unitate de măsură</label>
                    <input value={formC.um} onChange={e => setFormC(f => ({ ...f, um: e.target.value }))} placeholder="ex. kWh, mc, RON" />
                  </div>
                </div>
              )}
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={formC.fix} onChange={e => setFormC(f => ({ ...f, fix: e.target.checked }))} style={{ width: 16, height: 16 }} />
                  <span>Sumă fixă (fără index — introduci doar valoarea RON lunar)</span>
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModalC(false)}>Anulează</button>
              <button className="btn btn-primary" onClick={handleAddContor} disabled={saving}>
                <i className="ti ti-plus" /> {saving ? 'Se salvează…' : 'Adaugă contor'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal citire nouă ─────────────────────────────────── */}
      {modalCit && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalCit(null)}>
          <div className="modal-box">
            <div className="modal-head">
              <h3>Citire nouă — {contoare.find(c => c.id === modalCit)?.tip}</h3>
              <button className="modal-close" onClick={() => setModalCit(null)}><i className="ti ti-x" /></button>
            </div>
            <div className="modal-body">
              {/* Ultima citire info */}
              {(citiriMap[modalCit] || [])[0] && (
                <div className="alert alert-info" style={{ marginBottom: 16 }}>
                  <i className="ti ti-info-circle" />
                  <span>
                    Ultima citire: <strong>{(citiriMap[modalCit] || [])[0]?.index} {contoare.find(c => c.id === modalCit)?.um}</strong> pe data de <strong>{(citiriMap[modalCit] || [])[0]?.data}</strong>
                  </span>
                </div>
              )}

              {/* Mod introducere */}
              {!contoare.find(c => c.id === modalCit)?.fix && (
                <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                  {[['index', 'Index (calcul automat)'], ['valoare', 'Valoare RON directă']].map(([k, l]) => (
                    <button key={k} onClick={() => setFormCit(f => ({ ...f, mod: k }))}
                      className={`btn ${formCit.mod === k ? 'btn-primary' : 'btn-ghost'} btn-sm`}>
                      {l}
                    </button>
                  ))}
                </div>
              )}

              <div className="form-grid">
                {formCit.mod === 'index' ? (
                  <div className="form-group">
                    <label>Index nou ({contoare.find(c => c.id === modalCit)?.um})</label>
                    <input type="number" value={formCit.index} onChange={e => setFormCit(f => ({ ...f, index: e.target.value }))} placeholder="ex. 1250" autoFocus />
                    {formCit.index && (citiriMap[modalCit] || [])[0]?.index !== undefined && (
                      <div style={{ fontSize: 12, color: 'var(--green)', marginTop: 4 }}>
                        ✓ Consum calculat: <strong>{Math.max(0, Number(formCit.index) - Number((citiriMap[modalCit] || [])[0]?.index))} {contoare.find(c => c.id === modalCit)?.um}</strong>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="form-group">
                    <label>Valoare de plată (RON)</label>
                    <input type="number" value={formCit.valoare} onChange={e => setFormCit(f => ({ ...f, valoare: e.target.value }))} placeholder="ex. 245.50" autoFocus />
                  </div>
                )}
                <div className="form-group">
                  <label>Data citirii</label>
                  <input type="date" value={formCit.data} onChange={e => setFormCit(f => ({ ...f, data: e.target.value }))} />
                </div>
                <div className="form-group full">
                  <label>Notă (opțional)</label>
                  <input value={formCit.nota} onChange={e => setFormCit(f => ({ ...f, nota: e.target.value }))} placeholder="ex. Citire estimată" />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModalCit(null)}>Anulează</button>
              <button className="btn btn-primary" onClick={handleAddCitire} disabled={saving}>
                <i className="ti ti-device-floppy" /> {saving ? 'Se salvează…' : 'Salvează citire'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
