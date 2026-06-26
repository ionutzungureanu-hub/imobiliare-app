import { useEffect, useState } from 'react'
import Topbar from '../components/Topbar'
import { useToast } from '../components/Toast'
import {
  getImobile, addImobil, updateImobil, deleteImobil,
  getSpatii, addSpatiu, updateSpatiu, deleteSpatiu,
  getClienti
} from '../firebase/firestore'

const emptyImobil = () => ({ nume: '', adresa: '', actUrl: '', actNota: '' })
const emptySpatiu = () => ({ denumire: '', suprafata: '', etaj: '', imobilId: '', clientId: '', status: 'Liber' })

export default function Spatii() {
  const toast = useToast()

  const [imobile,  setImobile]  = useState([])
  const [spatii,   setSpatii]   = useState([])
  const [clienti,  setClienti]  = useState([])
  const [tab,      setTab]      = useState('imobile')

  const [modalI,   setModalI]   = useState(false)
  const [editIId,  setEditIId]  = useState(null)
  const [formI,    setFormI]    = useState(emptyImobil())

  const [modalS,   setModalS]   = useState(false)
  const [editSId,  setEditSId]  = useState(null)
  const [formS,    setFormS]    = useState(emptySpatiu())
  const [saving,   setSaving]   = useState(false)

  const load = async () => {
    const [im, sp, cl] = await Promise.all([getImobile(), getSpatii(), getClienti()])
    setImobile(im); setSpatii(sp); setClienti(cl)
  }
  useEffect(() => { load() }, [])

  // ── Imobile ──────────────────────────────────────────────────
  const openAddImobil  = () => { setFormI(emptyImobil()); setEditIId(null); setModalI('add') }
  const openEditImobil = (im) => {
    setFormI({ nume: im.nume || '', adresa: im.adresa || '', actUrl: im.actUrl || '', actNota: im.actNota || '' })
    setEditIId(im.id); setModalI('edit')
  }

  const saveImobil = async () => {
    if (!formI.nume) { toast('Completează denumirea imobilului.', 'error'); return }
    setSaving(true)
    try {
      if (modalI === 'edit') { await updateImobil(editIId, formI); toast('Imobil actualizat!') }
      else { await addImobil(formI); toast('Imobil adăugat!') }
      setModalI(false); load()
    } catch { toast('Eroare la salvare.', 'error') }
    finally { setSaving(false) }
  }

  const handleDeleteImobil = async (id, nume) => {
    if (!confirm(`Ștergi imobilul "${nume}"?`)) return
    await deleteImobil(id); toast('Imobil șters.'); load()
  }

  // ── Spații ────────────────────────────────────────────────────
  const openAddSpatiu  = (imobilId = '') => { setFormS({ ...emptySpatiu(), imobilId }); setEditSId(null); setModalS('add') }
  const openEditSpatiu = (sp) => {
    setFormS({ denumire: sp.denumire || '', suprafata: sp.suprafata || '', etaj: sp.etaj || '', imobilId: sp.imobilId || '', clientId: sp.clientId || '', status: sp.status || 'Liber' })
    setEditSId(sp.id); setModalS('edit')
  }

  const saveSpatiu = async () => {
    if (!formS.denumire) { toast('Completează denumirea spațiului.', 'error'); return }
    if (!formS.imobilId) { toast('Selectează imobilul.', 'error'); return }
    setSaving(true)
    try {
      const data = { ...formS, suprafata: Number(formS.suprafata) || 0 }
      if (modalS === 'edit') { await updateSpatiu(editSId, data); toast('Spațiu actualizat!') }
      else { await addSpatiu(data); toast('Spațiu adăugat!') }
      setModalS(false); load()
    } catch { toast('Eroare la salvare.', 'error') }
    finally { setSaving(false) }
  }

  const handleDeleteSpatiu = async (id, den) => {
    if (!confirm(`Ștergi spațiul "${den}"?`)) return
    await deleteSpatiu(id); toast('Spațiu șters.'); load()
  }

  const getClientNume = (id) => clienti.find(c => c.id === id)?.nume || '—'
  const getImobilNume = (id) => imobile.find(i => i.id === id)?.nume || '—'

  return (
    <>
      <Topbar title="Spații & Imobile" subtitle="Gestionare imobile și spații închiriate" />

      <div className="content">
        {/* Tab-uri */}
        <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
          {[['imobile', 'ti-building', 'Imobile'], ['spatii', 'ti-layout-grid', 'Spații']].map(([k, ic, l]) => (
            <button key={k} onClick={() => setTab(k)} style={{
              padding: '9px 20px', fontSize: 13, fontWeight: 500, border: 'none', background: 'none',
              cursor: 'pointer', borderBottom: `2px solid ${tab === k ? 'var(--blue)' : 'transparent'}`,
              color: tab === k ? 'var(--blue)' : 'var(--slate)', marginBottom: -1,
              display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit'
            }}>
              <i className={`ti ${ic}`} /> {l}
            </button>
          ))}
        </div>

        {/* ── TAB IMOBILE ─────────────────────────────────────── */}
        {tab === 'imobile' && (
          <>
            <div className="toolbar">
              <button className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }} onClick={openAddImobil}>
                <i className="ti ti-plus" /> Imobil nou
              </button>
            </div>

            {imobile.length === 0 ? (
              <div className="card">
                <div className="empty"><i className="ti ti-building" /><p>Niciun imobil adăugat.</p></div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                {imobile.map(im => {
                  const spIm   = spatii.filter(s => s.imobilId === im.id)
                  const ocupate = spIm.filter(s => s.status === 'Ocupat').length
                  return (
                    <div key={im.id} className="card">
                      <div className="card-header">
                        <div>
                          <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <i className="ti ti-building" style={{ color: 'var(--blue)' }} /> {im.nume}
                          </div>
                          <div className="card-subtitle">{im.adresa || 'Fără adresă'}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => openEditImobil(im)}>
                            <i className="ti ti-pencil" />
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDeleteImobil(im.id, im.nume)}>
                            <i className="ti ti-trash" />
                          </button>
                        </div>
                      </div>
                      <div className="card-body">
                        <div style={{ display: 'flex', gap: 20, marginBottom: 12, fontSize: 13 }}>
                          <div><span style={{ color: 'var(--slate)' }}>Spații: </span><strong>{spIm.length}</strong></div>
                          <div><span style={{ color: 'var(--slate)' }}>Ocupate: </span><strong style={{ color: 'var(--green)' }}>{ocupate}</strong></div>
                          <div><span style={{ color: 'var(--slate)' }}>Libere: </span><strong style={{ color: 'var(--amber)' }}>{spIm.length - ocupate}</strong></div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {im.actUrl && (
                            <a href={im.actUrl} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
                              <i className="ti ti-brand-google-drive" style={{ color: '#4285F4' }} /> Act proprietate
                            </a>
                          )}
                          {!im.actUrl && im.actNota && (
                            <span style={{ fontSize: 12, color: 'var(--slate)' }}>
                              <i className="ti ti-file-description" /> {im.actNota}
                            </span>
                          )}
                          <button className="btn btn-ghost btn-sm" onClick={() => { setTab('spatii'); openAddSpatiu(im.id) }}>
                            <i className="ti ti-plus" /> Adaugă spațiu
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* ── TAB SPAȚII ──────────────────────────────────────── */}
        {tab === 'spatii' && (
          <>
            <div className="toolbar">
              <button className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }} onClick={() => openAddSpatiu()}>
                <i className="ti ti-plus" /> Spațiu nou
              </button>
            </div>
            <div className="card">
              <table>
                <thead>
                  <tr>
                    <th>Denumire</th><th>Imobil</th><th>Suprafață</th>
                    <th>Etaj</th><th>Client</th><th>Status</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {spatii.length === 0 ? (
                    <tr><td colSpan={7}>
                      <div className="empty"><i className="ti ti-layout-grid" /><p>Niciun spațiu adăugat.</p></div>
                    </td></tr>
                  ) : spatii.map(sp => (
                    <tr key={sp.id}>
                      <td style={{ fontWeight: 500 }}>{sp.denumire}</td>
                      <td style={{ color: 'var(--slate)', fontSize: 12 }}>{getImobilNume(sp.imobilId)}</td>
                      <td style={{ color: 'var(--slate)' }}>{sp.suprafata ? `${sp.suprafata} mp` : '—'}</td>
                      <td style={{ color: 'var(--slate)' }}>{sp.etaj || '—'}</td>
                      <td style={{ fontSize: 13 }}>
                        {sp.clientId
                          ? getClientNume(sp.clientId)
                          : <span style={{ color: 'var(--slate)' }}>Nealocat</span>
                        }
                      </td>
                      <td>
                        <span className={`badge ${sp.status === 'Ocupat' ? 'badge-green' : sp.status === 'Rezervat' ? 'badge-amber' : 'badge-gray'}`}>
                          {sp.status || 'Liber'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => openEditSpatiu(sp)}>
                            <i className="ti ti-pencil" />
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDeleteSpatiu(sp.id, sp.denumire)}>
                            <i className="ti ti-trash" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* ── Modal Imobil ─────────────────────────────────────── */}
      {modalI && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalI(false)}>
          <div className="modal-box">
            <div className="modal-head">
              <h3>{modalI === 'edit' ? 'Editează imobil' : 'Imobil nou'}</h3>
              <button className="modal-close" onClick={() => setModalI(false)}><i className="ti ti-x" /></button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Denumire imobil *</label>
                  <input value={formI.nume} onChange={e => setFormI(f => ({ ...f, nume: e.target.value }))} placeholder="ex. Clădire Centrală" />
                </div>
                <div className="form-group">
                  <label>Adresă</label>
                  <input value={formI.adresa} onChange={e => setFormI(f => ({ ...f, adresa: e.target.value }))} placeholder="Str. Exemplu, Nr. 1, Ploiești" />
                </div>
                <div className="form-group full">
                  <label>Link Google Drive — Act proprietate</label>
                  <input
                    value={formI.actUrl}
                    onChange={e => setFormI(f => ({ ...f, actUrl: e.target.value }))}
                    placeholder="https://drive.google.com/file/d/..."
                  />
                  <div style={{ fontSize: 11, color: 'var(--slate)', marginTop: 4 }}>
                    <i className="ti ti-info-circle" style={{ fontSize: 12 }} /> Google Drive → click dreapta pe fișier → Share → Copy link → paste aici
                  </div>
                </div>
                <div className="form-group full">
                  <label>Număr / referință document (opțional)</label>
                  <input
                    value={formI.actNota}
                    onChange={e => setFormI(f => ({ ...f, actNota: e.target.value }))}
                    placeholder="ex. CF Nr. 12345 / Dosar 2024-001"
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModalI(false)}>Anulează</button>
              <button className="btn btn-primary" onClick={saveImobil} disabled={saving}>
                <i className="ti ti-device-floppy" /> {saving ? 'Se salvează…' : 'Salvează'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Spațiu ─────────────────────────────────────── */}
      {modalS && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalS(false)}>
          <div className="modal-box">
            <div className="modal-head">
              <h3>{modalS === 'edit' ? 'Editează spațiu' : 'Spațiu nou'}</h3>
              <button className="modal-close" onClick={() => setModalS(false)}><i className="ti ti-x" /></button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Denumire spațiu *</label>
                  <input value={formS.denumire} onChange={e => setFormS(f => ({ ...f, denumire: e.target.value }))} placeholder="ex. Birou A, Spațiu comercial 1" />
                </div>
                <div className="form-group">
                  <label>Imobil *</label>
                  <select value={formS.imobilId} onChange={e => setFormS(f => ({ ...f, imobilId: e.target.value }))}>
                    <option value="">— Alege imobil —</option>
                    {imobile.map(im => <option key={im.id} value={im.id}>{im.nume}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Suprafață (mp)</label>
                  <input type="number" value={formS.suprafata} onChange={e => setFormS(f => ({ ...f, suprafata: e.target.value }))} placeholder="85" />
                </div>
                <div className="form-group">
                  <label>Etaj / Locație</label>
                  <input value={formS.etaj} onChange={e => setFormS(f => ({ ...f, etaj: e.target.value }))} placeholder="ex. Et. 2, Parter" />
                </div>
                <div className="form-group">
                  <label>Client asociat</label>
                  <select value={formS.clientId} onChange={e => setFormS(f => ({
                    ...f,
                    clientId: e.target.value,
                    status: e.target.value ? 'Ocupat' : 'Liber'
                  }))}>
                    <option value="">— Fără client (Liber) —</option>
                    {clienti.map(c => <option key={c.id} value={c.id}>{c.nume}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select value={formS.status} onChange={e => setFormS(f => ({ ...f, status: e.target.value }))}>
                    <option value="Liber">Liber</option>
                    <option value="Ocupat">Ocupat</option>
                    <option value="Rezervat">Rezervat</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModalS(false)}>Anulează</button>
              <button className="btn btn-primary" onClick={saveSpatiu} disabled={saving}>
                <i className="ti ti-device-floppy" /> {saving ? 'Se salvează…' : 'Salvează'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
