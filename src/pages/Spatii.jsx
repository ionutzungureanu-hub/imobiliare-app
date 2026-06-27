import { useEffect, useState } from 'react'
import Topbar from '../components/Topbar'
import { useToast } from '../components/Toast'
import { useAuth } from '../context/AuthContext'
import { useImobile } from '../hooks/useImobile'
import {
  getImobile, addImobil, updateImobil, deleteImobil,
  getSpatii, addSpatiu, updateSpatiu, deleteSpatiu,
  getClienti, getUsers, updateSpatiu as batchUpdateSpatiu
} from '../firebase/firestore'

const emptyImobil = () => ({
  nume: '', adresa: '', actUrl: '', actNota: '',
  tip: 'rezidential', antetNota: '', subAntetNota: '', managerId: '',
})
const emptySpatiu = (imobilId = '', managerId = '') => ({
  denumire: '', suprafata: '', etaj: '', imobilId,
  clientId: '', status: 'Liber',
  managerId, preiaMgrImobil: true,
})

export default function Spatii() {
  const toast = useToast()
  const { isAdmin, user } = useAuth()

  const [allImobile, setAllImobile] = useState([])
  const [allSpatii,  setAllSpatii]  = useState([])
  const [clienti,    setClienti]    = useState([])
  const [users,      setUsers]      = useState([])

  // Modal imobil
  const [modalI,  setModalI]  = useState(false)
  const [editIId, setEditIId] = useState(null)
  const [formI,   setFormI]   = useState(emptyImobil())
  const [saving,  setSaving]  = useState(false)

  // Modal spațiu
  const [modalS,  setModalS]  = useState(false)
  const [editSId, setEditSId] = useState(null)
  const [formS,   setFormS]   = useState(emptySpatiu())

  // Modal propagare manager
  const [modalPropagate, setModalPropagate] = useState(null) // { imobilId, newManagerId }

  const load = async () => {
    const [im, sp, cl, us] = await Promise.all([
      getImobile(), getSpatii(), getClienti(), getUsers()
    ])
    setAllImobile(im); setAllSpatii(sp); setClienti(cl); setUsers(us)
  }
  useEffect(() => { load() }, [])

  // Filtrare pe rol
  const imobileVizibile = isAdmin
    ? allImobile
    : allImobile.filter(im =>
        im.managerId === user?.uid ||
        allSpatii.some(s => s.imobilId === im.id && s.managerId === user?.uid)
      )

  const spatiiPentruImobil = (imobilId) => {
    const all = allSpatii.filter(s => s.imobilId === imobilId)
    if (isAdmin) return all
    return all.filter(s => s.managerId === user?.uid || allImobile.find(im => im.id === imobilId)?.managerId === user?.uid)
  }

  // Helpers
  const getUser    = (id) => users.find(u => u.id === id)
  const getClient  = (id) => clienti.find(c => c.id === id)
  const getUserNume = (id) => {
    const u = getUser(id)
    return u ? (u.nume || u.email) : '—'
  }

  // ── Modal Imobil ────────────────────────────────────────────
  const openAddImobil = () => { setFormI(emptyImobil()); setEditIId(null); setModalI('add') }
  const openEditImobil = (im) => {
    setFormI({
      nume: im.nume || '', adresa: im.adresa || '', actUrl: im.actUrl || '',
      actNota: im.actNota || '', tip: im.tip || 'rezidential',
      antetNota: im.antetNota || '', subAntetNota: im.subAntetNota || '',
      managerId: im.managerId || '',
    })
    setEditIId(im.id); setModalI('edit')
  }

  const saveImobil = async () => {
    if (!formI.nume) { toast('Completează denumirea.', 'error'); return }
    setSaving(true)
    try {
      if (modalI === 'edit') {
        const old = allImobile.find(im => im.id === editIId)
        await updateImobil(editIId, formI)
        toast('Imobil actualizat!')
        // Dacă s-a schimbat managerul → întreabă de propagare
        if (old?.managerId !== formI.managerId) {
          const spatiiMostenitoare = allSpatii.filter(
            s => s.imobilId === editIId && s.preiaMgrImobil
          )
          if (spatiiMostenitoare.length > 0) {
            setModalPropagate({ imobilId: editIId, newManagerId: formI.managerId, count: spatiiMostenitoare.length })
          }
        }
      } else {
        await addImobil(formI); toast('Imobil adăugat!')
      }
      setModalI(false); load()
    } catch { toast('Eroare la salvare.', 'error') }
    finally { setSaving(false) }
  }

  const handlePropagare = async (da) => {
    if (da && modalPropagate) {
      const sp = allSpatii.filter(s => s.imobilId === modalPropagate.imobilId && s.preiaMgrImobil)
      await Promise.all(sp.map(s => updateSpatiu(s.id, { managerId: modalPropagate.newManagerId })))
      toast(`Manager actualizat pe ${sp.length} spații moștenitoare.`)
      load()
    }
    setModalPropagate(null)
  }

  const handleDeleteImobil = async (id, nume) => {
    if (!confirm(`Ștergi imobilul "${nume}"?`)) return
    await deleteImobil(id); toast('Imobil șters.'); load()
  }

  // ── Modal Spațiu ─────────────────────────────────────────────
  const openAddSpatiu = (imobilId) => {
    const imobil = allImobile.find(im => im.id === imobilId)
    setFormS(emptySpatiu(imobilId, imobil?.managerId || ''))
    setEditSId(null); setModalS('add')
  }

  const openEditSpatiu = (sp) => {
    setFormS({
      denumire: sp.denumire || '', suprafata: sp.suprafata || '',
      etaj: sp.etaj || '', imobilId: sp.imobilId || '',
      clientId: sp.clientId || '', status: sp.status || 'Liber',
      managerId: sp.managerId || '', preiaMgrImobil: sp.preiaMgrImobil !== false,
    })
    setEditSId(sp.id); setModalS('edit')
  }

  const saveSpatiu = async () => {
    if (!formS.denumire) { toast('Completează denumirea.', 'error'); return }
    setSaving(true)
    try {
      const imobil = allImobile.find(im => im.id === formS.imobilId)
      const data = {
        ...formS,
        suprafata: Number(formS.suprafata) || 0,
        managerId: formS.preiaMgrImobil ? (imobil?.managerId || '') : formS.managerId,
        status: formS.clientId ? 'Ocupat' : formS.status,
      }
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

  // ── Render ────────────────────────────────────────────────────
  return (
    <>
      <Topbar title="Spații & Imobile" subtitle="Vedere ierarhică imobile → spații">
        {isAdmin && (
          <button className="btn btn-primary btn-sm" onClick={openAddImobil}>
            <i className="ti ti-plus" /> Imobil nou
          </button>
        )}
      </Topbar>

      <div className="content">
        {imobileVizibile.length === 0 ? (
          <div className="card">
            <div className="empty">
              <i className="ti ti-building" />
              <p>{isAdmin ? 'Niciun imobil adăugat.' : 'Nu ești asignat la niciun imobil.'}</p>
            </div>
          </div>
        ) : imobileVizibile.map(im => {
          const spatiiIm = spatiiPentruImobil(im.id)
          const ocupate  = spatiiIm.filter(s => s.status === 'Ocupat').length
          const mgrImobil = getUser(im.managerId)

          return (
            <div key={im.id} className="card" style={{ marginBottom: 16 }}>
              {/* Header imobil */}
              <div className="card-header" style={{ background: 'var(--blue-light)', borderBottom: '1px solid var(--blue-mid)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 8, background: 'var(--blue)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>
                    <i className="ti ti-building" style={{ color: '#fff', fontSize: 18 }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{im.nume}</div>
                    <div style={{ fontSize: 12, color: 'var(--slate)' }}>
                      {im.adresa && <span>{im.adresa} · </span>}
                      <span>{spatiiIm.length} spații · </span>
                      <span style={{ color: 'var(--green)' }}>{ocupate} ocupate</span>
                      {spatiiIm.length - ocupate > 0 && (
                        <span style={{ color: 'var(--amber)' }}> · {spatiiIm.length - ocupate} libere</span>
                      )}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {/* Manager imobil */}
                  <div style={{ textAlign: 'right', fontSize: 12 }}>
                    <div style={{ color: 'var(--slate)' }}>Manager imobil</div>
                    <div style={{ fontWeight: 500, color: 'var(--blue)' }}>
                      {mgrImobil ? (mgrImobil.nume || mgrImobil.email) : <span style={{ color: 'var(--amber)' }}>Neasignat</span>}
                    </div>
                  </div>
                  {isAdmin && (
                    <>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEditImobil(im)}>
                        <i className="ti ti-pencil" />
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDeleteImobil(im.id, im.nume)}>
                        <i className="ti ti-trash" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Spații sub imobil */}
              <div>
                {spatiiIm.length === 0 ? (
                  <div style={{ padding: '20px', color: 'var(--slate)', fontSize: 13, textAlign: 'center' }}>
                    Niciun spațiu adăugat.
                  </div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th style={{ paddingLeft: 32 }}>Spațiu</th>
                        <th>Suprafață</th>
                        <th>Client</th>
                        <th>Manager spațiu</th>
                        <th>Status</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {spatiiIm.map(sp => {
                        const client = getClient(sp.clientId)
                        const mgrSp  = getUser(sp.managerId)
                        const isMotenit = sp.preiaMgrImobil !== false

                        return (
                          <tr key={sp.id}>
                            <td style={{ paddingLeft: 32 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <i className="ti ti-door" style={{ color: 'var(--slate)', fontSize: 15 }} />
                                <span style={{ fontWeight: 500 }}>{sp.denumire}</span>
                                {sp.etaj && <span style={{ fontSize: 11, color: 'var(--slate)' }}>({sp.etaj})</span>}
                              </div>
                            </td>
                            <td style={{ color: 'var(--slate)', fontSize: 12 }}>
                              {sp.suprafata ? `${sp.suprafata} mp` : '—'}
                            </td>
                            <td style={{ fontSize: 12 }}>
                              {client
                                ? <span style={{ fontWeight: 500 }}>{client.nume}</span>
                                : <span style={{ color: 'var(--slate)' }}>Nealocat</span>
                              }
                            </td>
                            <td style={{ fontSize: 12 }}>
                              {mgrSp ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                  <span>{mgrSp.nume || mgrSp.email}</span>
                                  {isMotenit
                                    ? <span className="badge badge-blue" style={{ fontSize: 9 }}>moștenit</span>
                                    : <span className="badge badge-amber" style={{ fontSize: 9 }}>override</span>
                                  }
                                </div>
                              ) : (
                                <span style={{ color: 'var(--amber)' }}>Neasignat</span>
                              )}
                            </td>
                            <td>
                              <span className={`badge ${sp.status === 'Ocupat' ? 'badge-green' : sp.status === 'Rezervat' ? 'badge-amber' : 'badge-gray'}`}>
                                {sp.status || 'Liber'}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: 4 }}>
                                <button className="btn btn-ghost btn-sm" onClick={() => openEditSpatiu(sp)} title="Editează">
                                  <i className="ti ti-pencil" />
                                </button>
                                <button className="btn btn-danger btn-sm" onClick={() => handleDeleteSpatiu(sp.id, sp.denumire)}>
                                  <i className="ti ti-trash" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}

                {/* Adaugă spațiu */}
                <div style={{ padding: '10px 20px', borderTop: '1px solid var(--border)' }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => openAddSpatiu(im.id)}>
                    <i className="ti ti-plus" /> Adaugă spațiu în {im.nume}
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Modal Imobil ─────────────────────────────────────── */}
      {modalI && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalI(false)}>
          <div className="modal-box" style={{ width: 600 }}>
            <div className="modal-head">
              <h3>{modalI === 'edit' ? 'Editează imobil' : 'Imobil nou'}</h3>
              <button className="modal-close" onClick={() => setModalI(false)}><i className="ti ti-x" /></button>
            </div>
            <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Denumire imobil *</label>
                  <input value={formI.nume} onChange={e => setFormI(f => ({ ...f, nume: e.target.value }))} placeholder="ex. Bloc Călimănești" />
                </div>
                <div className="form-group">
                  <label>Tip imobil</label>
                  <select value={formI.tip} onChange={e => setFormI(f => ({ ...f, tip: e.target.value }))}>
                    <option value="rezidential">Rezidențial (persoane fizice)</option>
                    <option value="comercial">Comercial (persoane juridice)</option>
                  </select>
                </div>
                <div className="form-group full">
                  <label>Adresă</label>
                  <input value={formI.adresa} onChange={e => setFormI(f => ({ ...f, adresa: e.target.value }))} placeholder="Str. Exemplu, Nr. 1, Ploiești" />
                </div>
                <div className="form-group full">
                  <label>Manager principal imobil</label>
                  <select value={formI.managerId} onChange={e => setFormI(f => ({ ...f, managerId: e.target.value }))}>
                    <option value="">— Neasignat —</option>
                    {users.filter(u => u.activ !== false).map(u => (
                      <option key={u.id} value={u.id}>{u.nume || u.email} {u.rol === 'admin' ? '(Admin)' : ''}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Antet pe nota de calcul</label>
                  <input value={formI.antetNota} onChange={e => setFormI(f => ({ ...f, antetNota: e.target.value }))} placeholder="ex. Proprietar: Ion Ungureanu" />
                </div>
                <div className="form-group">
                  <label>Sub-antet</label>
                  <input value={formI.subAntetNota} onChange={e => setFormI(f => ({ ...f, subAntetNota: e.target.value }))} placeholder="ex. Str. Florilor 12, Ploiești" />
                </div>
                <div className="form-group full">
                  <label>Link Google Drive — Act proprietate</label>
                  <input value={formI.actUrl} onChange={e => setFormI(f => ({ ...f, actUrl: e.target.value }))} placeholder="https://drive.google.com/file/d/..." />
                </div>
                <div className="form-group full">
                  <label>Număr/referință document</label>
                  <input value={formI.actNota} onChange={e => setFormI(f => ({ ...f, actNota: e.target.value }))} placeholder="ex. CF Nr. 12345" />
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

      {/* ── Modal Spațiu ──────────────────────────────────────── */}
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
                  <input value={formS.denumire} onChange={e => setFormS(f => ({ ...f, denumire: e.target.value }))} placeholder="ex. Apt 1, Birou A" />
                </div>
                <div className="form-group">
                  <label>Imobil</label>
                  <select value={formS.imobilId} onChange={e => {
                    const im = allImobile.find(i => i.id === e.target.value)
                    setFormS(f => ({ ...f, imobilId: e.target.value, managerId: im?.managerId || '', preiaMgrImobil: true }))
                  }}>
                    <option value="">— Alege imobil —</option>
                    {allImobile.map(im => <option key={im.id} value={im.id}>{im.nume}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Suprafață (mp)</label>
                  <input type="number" value={formS.suprafata} onChange={e => setFormS(f => ({ ...f, suprafata: e.target.value }))} placeholder="65" />
                </div>
                <div className="form-group">
                  <label>Etaj / Locație</label>
                  <input value={formS.etaj} onChange={e => setFormS(f => ({ ...f, etaj: e.target.value }))} placeholder="ex. Et. 2, Parter" />
                </div>
                <div className="form-group">
                  <label>Client asociat</label>
                  <select value={formS.clientId} onChange={e => setFormS(f => ({ ...f, clientId: e.target.value, status: e.target.value ? 'Ocupat' : 'Liber' }))}>
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

                {/* Manager spațiu */}
                <div className="form-group full" style={{ background: 'var(--slate-light)', borderRadius: 8, padding: 14 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--blue)', marginBottom: 10, display: 'block', textTransform: 'uppercase', letterSpacing: '.5px' }}>
                    Manager spațiu
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 12, fontSize: 13 }}>
                    <input
                      type="checkbox"
                      checked={formS.preiaMgrImobil}
                      onChange={e => {
                        const imobil = allImobile.find(im => im.id === formS.imobilId)
                        setFormS(f => ({
                          ...f,
                          preiaMgrImobil: e.target.checked,
                          managerId: e.target.checked ? (imobil?.managerId || '') : f.managerId,
                        }))
                      }}
                      style={{ width: 16, height: 16 }}
                    />
                    <div>
                      <div style={{ fontWeight: 500 }}>Preia managerul imobilului</div>
                      {formS.preiaMgrImobil && formS.imobilId && (
                        <div style={{ fontSize: 11, color: 'var(--blue)', marginTop: 2 }}>
                          → {getUserNume(allImobile.find(im => im.id === formS.imobilId)?.managerId)}
                        </div>
                      )}
                    </div>
                  </label>

                  {!formS.preiaMgrImobil && (
                    <div className="form-group" style={{ margin: 0 }}>
                      <label>Alege manager pentru acest spațiu</label>
                      <select value={formS.managerId} onChange={e => setFormS(f => ({ ...f, managerId: e.target.value }))}>
                        <option value="">— Neasignat —</option>
                        {users.filter(u => u.activ !== false).map(u => (
                          <option key={u.id} value={u.id}>{u.nume || u.email}</option>
                        ))}
                      </select>
                    </div>
                  )}
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

      {/* ── Modal propagare manager ───────────────────────────── */}
      {modalPropagate && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ width: 440 }}>
            <div className="modal-head">
              <h3>Actualizare manager spații</h3>
            </div>
            <div className="modal-body">
              <div className="alert alert-info">
                <i className="ti ti-info-circle" />
                <span>
                  Ai schimbat managerul imobilului. Există <strong>{modalPropagate.count} spații</strong> care moștenesc managerul de la imobil.
                  Vrei să le actualizezi și pe ele?
                </span>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => handlePropagare(false)}>
                Nu, păstrează managerii actuali
              </button>
              <button className="btn btn-primary" onClick={() => handlePropagare(true)}>
                <i className="ti ti-refresh" /> Da, actualizează {modalPropagate.count} spații
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
