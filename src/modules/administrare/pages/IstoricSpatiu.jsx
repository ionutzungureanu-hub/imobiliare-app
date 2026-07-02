import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Topbar from '../../../shared/components/Topbar'
import { useToast } from '../../../shared/components/Toast'
import {
  getSpatii, getImobile, getClienti, getContoare, getCitiri,
  getDocumente, getIstoricSpatiu, addIstoricEntry, updateIstoricEntry
} from '../../../shared/firebase/firestore'
import { fmtDate } from '../../../shared/utils'

export default function IstoricSpatiu() {
  const { spatiuId } = useParams()
  const navigate = useNavigate()
  const toast    = useToast()

  const [spatiu,   setSpatiu]   = useState(null)
  const [imobil,   setImobil]   = useState(null)
  const [clienti,  setClienti]  = useState([])
  const [contoare, setContoare] = useState([])
  const [citiriMap,setCitiriMap]= useState({})
  const [documente,setDocumente]= useState([])
  const [istoric,  setIstoric]  = useState([])
  const [tab,      setTab]      = useState('clienti')
  const [loading,  setLoading]  = useState(true)

  // Modal istoric client
  const [modalIst,   setModalIst]   = useState(false)
  const [editIstId,  setEditIstId]  = useState(null)
  const [formIst,    setFormIst]    = useState({ clientId: '', rol: '', dataStart: '', dataStop: '', nota: '' })
  const [saving,     setSaving]     = useState(false)

  const load = async () => {
    setLoading(true)
    const [allSpatii, allImobile, allClienti, ct, docs, ist] = await Promise.all([
      getSpatii(), getImobile(), getClienti(),
      getContoare(spatiuId),
      getDocumente('spatiu', spatiuId),
      getIstoricSpatiu(spatiuId),
    ])
    const sp = allSpatii.find(s => s.id === spatiuId)
    setSpatiu(sp)
    setImobil(allImobile.find(im => im.id === sp?.imobilId))
    setClienti(allClienti)
    setContoare(ct)
    setDocumente(docs)
    setIstoric(ist)

    // Load citiri per contor
    const map = {}
    await Promise.all(ct.map(async c => { map[c.id] = await getCitiri(c.id) }))
    setCitiriMap(map)
    setLoading(false)
  }

  useEffect(() => { load() }, [spatiuId])

  const getClient = (id) => clienti.find(c => c.id === id)

  // Clienții actuali din spațiu
  const clientiActuali = (spatiu?.clienti || []).map(sc => ({
    ...sc, client: getClient(sc.clientId)
  })).filter(sc => sc.client)

  const handleSaveIst = async () => {
    if (!formIst.clientId || !formIst.dataStart) { toast('Completează clientul și data start.', 'error'); return }
    setSaving(true)
    try {
      const data = { ...formIst, spatiuId }
      if (editIstId) { await updateIstoricEntry(editIstId, data); toast('Actualizat!') }
      else { await addIstoricEntry(data); toast('Înregistrare adăugată!') }
      setModalIst(false); setEditIstId(null)
      load()
    } catch { toast('Eroare.', 'error') }
    finally { setSaving(false) }
  }

  const openAddIst = () => {
    setFormIst({ clientId: '', rol: 'Chiriaș principal', dataStart: '', dataStop: '', nota: '' })
    setEditIstId(null); setModalIst(true)
  }
  const openEditIst = (ist) => {
    setFormIst({ clientId: ist.clientId, rol: ist.rol || '', dataStart: ist.dataStart || '', dataStop: ist.dataStop || '', nota: ist.nota || '' })
    setEditIstId(ist.id); setModalIst(true)
  }

  if (loading) return <div className="content" style={{ paddingTop: 60, textAlign: 'center', color: 'var(--slate)' }}>Se încarcă...</div>
  if (!spatiu) return <div className="content" style={{ paddingTop: 60, textAlign: 'center', color: 'var(--slate)' }}>Spațiu negăsit.</div>

  return (
    <>
      <Topbar title={`Istoric — ${spatiu.denumire}`} subtitle={imobil?.nume}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/spatii')}>← Înapoi</button>
      </Topbar>

      <div className="content">
        {/* Tab-uri */}
        <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
          {[
            { key: 'clienti',   icon: 'ti-users',    label: 'Clienți & Istoric' },
            { key: 'utilitati', icon: 'ti-plug',      label: 'Citiri utilități' },
            { key: 'documente', icon: 'ti-files',     label: `Documente (${documente.length})` },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: '9px 20px', fontSize: 13, fontWeight: 500, border: 'none', background: 'none',
              cursor: 'pointer', borderBottom: `2px solid ${tab === t.key ? 'var(--blue)' : 'transparent'}`,
              color: tab === t.key ? 'var(--blue)' : 'var(--slate)', marginBottom: -1,
              display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit'
            }}>
              <i className={`ti ${t.icon}`} /> {t.label}
            </button>
          ))}
        </div>

        {/* ── Tab Clienți & Istoric ─────────────────────────── */}
        {tab === 'clienti' && (
          <>
            {/* Clienți actuali */}
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header">
                <div><div className="card-title">Chiriași actuali</div><div className="card-subtitle">Asociați în prezent acestui spațiu</div></div>
              </div>
              {clientiActuali.length === 0 ? (
                <div className="empty"><i className="ti ti-user-off" /><p>Niciun chiriaș asociat.</p></div>
              ) : clientiActuali.map((sc, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className="ti ti-user" style={{ color: '#fff' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{sc.client.nume}</div>
                    <div style={{ fontSize: 12, color: 'var(--slate)' }}>{sc.rol} · {sc.client.tip || 'PJ'}</div>
                  </div>
                  {sc.rol === 'Chiriaș principal' && (
                    <span className="badge badge-amber"><i className="ti ti-star-filled" style={{ fontSize: 10 }} /> Principal</span>
                  )}
                  <span className="badge badge-green">Activ</span>
                </div>
              ))}
            </div>

            {/* Istoric foști chiriași */}
            <div className="card">
              <div className="card-header">
                <div><div className="card-title">Istoric chiriași</div><div className="card-subtitle">Foști chiriași înregistrați manual</div></div>
                <button className="btn btn-ghost btn-sm" onClick={openAddIst}>
                  <i className="ti ti-plus" /> Adaugă intrare
                </button>
              </div>
              {istoric.length === 0 ? (
                <div className="empty"><i className="ti ti-history" /><p>Nicio înregistrare istorică.</p></div>
              ) : (
                <table>
                  <thead><tr><th>Client</th><th>Rol</th><th>Dată start</th><th>Dată plecare</th><th>Notă</th><th></th></tr></thead>
                  <tbody>
                    {istoric.map(ist => {
                      const cl = getClient(ist.clientId)
                      return (
                        <tr key={ist.id}>
                          <td style={{ fontWeight: 500 }}>{cl?.nume || ist.clientId}</td>
                          <td style={{ fontSize: 12, color: 'var(--slate)' }}>{ist.rol || '—'}</td>
                          <td style={{ fontSize: 12 }}>{ist.dataStart || '—'}</td>
                          <td style={{ fontSize: 12 }}>
                            {ist.dataStop
                              ? <span>{ist.dataStop}</span>
                              : <span style={{ color: 'var(--green)' }}>Prezent</span>
                            }
                          </td>
                          <td style={{ fontSize: 12, color: 'var(--slate)' }}>{ist.nota || '—'}</td>
                          <td>
                            <button className="btn btn-ghost btn-sm" onClick={() => openEditIst(ist)}>
                              <i className="ti ti-pencil" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* ── Tab Utilități ─────────────────────────────────── */}
        {tab === 'utilitati' && (
          contoare.length === 0 ? (
            <div className="card"><div className="empty"><i className="ti ti-plug" /><p>Niciun contor configurat.</p></div></div>
          ) : contoare.map(contor => {
            const citiri = citiriMap[contor.id] || []
            return (
              <div key={contor.id} className="card" style={{ marginBottom: 16 }}>
                <div className="card-header">
                  <div className="card-title">{contor.tip} <span style={{ fontSize: 12, color: 'var(--slate)', fontWeight: 400 }}>({contor.um})</span></div>
                  <span className="badge badge-gray">{citiri.length} citiri</span>
                </div>
                {citiri.length === 0 ? (
                  <div style={{ padding: 16, color: 'var(--slate)', fontSize: 13 }}>Nicio citire înregistrată.</div>
                ) : (
                  <table style={{ fontSize: 12 }}>
                    <thead><tr><th>Dată</th><th>Index / Valoare</th><th>Consum</th><th>Notă</th></tr></thead>
                    <tbody>
                      {citiri.map((cit, i) => (
                        <tr key={cit.id} style={{ background: i === 0 ? 'var(--blue-light)' : 'transparent' }}>
                          <td style={{ fontWeight: i === 0 ? 600 : 400 }}>{cit.data}</td>
                          <td>
                            {cit.mod === 'index'
                              ? <strong>{cit.index} {contor.um}</strong>
                              : <strong>{cit.valoare} RON</strong>
                            }
                          </td>
                          <td>
                            {cit.consum !== null && cit.consum !== undefined
                              ? <span style={{ color: 'var(--green)', fontWeight: 600 }}>{cit.consum} {contor.um}</span>
                              : '—'
                            }
                          </td>
                          <td style={{ color: 'var(--slate)' }}>{cit.nota || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )
          })
        )}

        {/* ── Tab Documente ──────────────────────────────────── */}
        {tab === 'documente' && (
          <div className="card">
            {documente.length === 0 ? (
              <div className="empty">
                <i className="ti ti-files" />
                <p>Niciun document. Adaugă din <strong>Bibliotecă → Imobile</strong>.</p>
              </div>
            ) : documente.map(doc => (
              <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                <i className="ti ti-file-type-pdf" style={{ color: '#ef4444', fontSize: 20, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{doc.nume}</div>
                  <div style={{ fontSize: 11, color: 'var(--slate)' }}>{doc.tip} · {doc.an}</div>
                </div>
                <a href={doc.url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
                  <i className="ti ti-external-link" />
                </a>
                <a href={doc.url} download={doc.nume} className="btn btn-ghost btn-sm">
                  <i className="ti ti-download" />
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Modal Istoric ──────────────────────────────────────── */}
      {modalIst && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalIst(false)}>
          <div className="modal-box" style={{ width: 480 }}>
            <div className="modal-head">
              <h3>{editIstId ? 'Editează înregistrare' : 'Adaugă chiriaș în istoric'}</h3>
              <button className="modal-close" onClick={() => setModalIst(false)}><i className="ti ti-x" /></button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group full">
                  <label>Client *</label>
                  <select value={formIst.clientId} onChange={e => setFormIst(f => ({ ...f, clientId: e.target.value }))}>
                    <option value="">— Alege client —</option>
                    {clienti.map(c => <option key={c.id} value={c.id}>{c.nume} ({c.tip || 'PJ'})</option>)}
                  </select>
                </div>
                <div className="form-group full">
                  <label>Rol</label>
                  <input value={formIst.rol} onChange={e => setFormIst(f => ({ ...f, rol: e.target.value }))} placeholder="ex. Chiriaș principal" />
                </div>
                <div className="form-group">
                  <label>Dată start *</label>
                  <input type="date" value={formIst.dataStart} onChange={e => setFormIst(f => ({ ...f, dataStart: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Dată plecare</label>
                  <input type="date" value={formIst.dataStop} onChange={e => setFormIst(f => ({ ...f, dataStop: e.target.value }))} />
                  <div style={{ fontSize: 11, color: 'var(--slate)', marginTop: 4 }}>Lasă gol dacă e chiriaș curent</div>
                </div>
                <div className="form-group full">
                  <label>Notă</label>
                  <input value={formIst.nota} onChange={e => setFormIst(f => ({ ...f, nota: e.target.value }))} placeholder="ex. Contract expirat, plecat voluntar" />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModalIst(false)}>Anulează</button>
              <button className="btn btn-primary" onClick={handleSaveIst} disabled={saving}>
                <i className="ti ti-device-floppy" /> {saving ? 'Se salvează…' : 'Salvează'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
