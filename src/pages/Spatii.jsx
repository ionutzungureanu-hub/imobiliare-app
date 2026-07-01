import { useEffect, useState } from 'react'
import { whatsappLink } from '../utils'
import { useNavigate } from 'react-router-dom'
import Topbar from '../components/Topbar'
import { useToast } from '../components/Toast'
import { useAuth } from '../context/AuthContext'
import { useImobile } from '../hooks/useImobile'
import {
  getImobile, addImobil, updateImobil, deleteImobil,
  getSpatii, addSpatiu, updateSpatiu, deleteSpatiu,
  getClienti, getUsers,
  addClientToSpatiu, removeClientFromSpatiu, updateClientRolInSpatiu
} from '../firebase/firestore'
import DocumentUpload from '../components/DocumentUpload'

const ROLURI = ['Chiriaș principal', 'Co-chiriaș', 'Garant', 'Reprezentant', 'Asociat', 'Altul']

const emptyImobil = () => ({
  nume: '', adresa: '', actUrl: '', actNota: '',
  tip: 'rezidential', antetNota: '', subAntetNota: '', managerId: '',
  unitar: false, // toggle: imobilul este același cu spațiul (apartament/garsonieră)
})
const emptySpatiu = (imobilId = '', managerId = '') => ({
  denumire: '', suprafata: '', etaj: '', imobilId,
  clienti: [], clientId: '', status: 'Liber',
  managerId, preiaMgrImobil: true,
})

export default function Spatii() {
  const navigate = useNavigate()
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

  // Modal clienți per spațiu
  const [modalClienti, setModalClienti] = useState(null) // spatiuId
  const [addClientId,  setAddClientId]  = useState('')
  const [addClientRol, setAddClientRol] = useState('Chiriaș principal')

  // Modal propagare manager
  const [modalPropagate, setModalPropagate] = useState(null)

  const load = async () => {
    const [im, sp, cl, us] = await Promise.all([
      getImobile(), getSpatii(), getClienti(), getUsers()
    ])
    setAllImobile(im)
    // Migrate old clientId to clienti array if needed
    const migrated = sp.map(s => ({
      ...s,
      clienti: s.clienti?.length
        ? s.clienti
        : s.clientId
          ? [{ clientId: s.clientId, rol: 'Chiriaș principal', activ: true }]
          : []
    }))
    setAllSpatii(migrated)
    setClienti(cl)
    setUsers(us)
  }
  useEffect(() => { load() }, [])

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

  const getUser    = (id) => users.find(u => u.id === id)
  const getClient  = (id) => clienti.find(c => c.id === id)
  const getUserNume = (id) => { const u = getUser(id); return u ? (u.nume || u.email) : '—' }

  // ── Modal Imobil ─────────────────────────────────────────────
  const openAddImobil  = () => { setFormI(emptyImobil()); setEditIId(null); setModalI('add') }
  const openEditImobil = (im) => {
    setFormI({ nume: im.nume || '', adresa: im.adresa || '', actUrl: im.actUrl || '',
      actNota: im.actNota || '', tip: im.tip || 'rezidential',
      antetNota: im.antetNota || '', subAntetNota: im.subAntetNota || '', managerId: im.managerId || '',
      unitar: im.unitar || false })
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
        if (old?.managerId !== formI.managerId) {
          const sp = allSpatii.filter(s => s.imobilId === editIId && s.preiaMgrImobil)
          if (sp.length > 0) setModalPropagate({ imobilId: editIId, newManagerId: formI.managerId, count: sp.length })
        }
        // Dacă s-a activat unitar și nu există niciun spațiu → creează automat spațiu cu același nume
        if (formI.unitar && !allSpatii.some(s => s.imobilId === editIId)) {
          await addSpatiu({ denumire: formI.nume, imobilId: editIId, managerId: formI.managerId, status: 'Liber', preiaMgrImobil: true, clienti: [], clientId: '' })
          toast('Spațiu creat automat cu același nume ca imobilul.')
        }
      } else {
        const imId = await addImobil(formI)
        toast('Imobil adăugat!')
        // Dacă unitar → creează automat spațiu
        if (formI.unitar && imId) {
          await addSpatiu({ denumire: formI.nume, imobilId: imId, managerId: formI.managerId, status: 'Liber', preiaMgrImobil: true, clienti: [], clientId: '' })
          toast('Spațiu creat automat — imobil unitar.')
        }
      }
      setModalI(false); load()
    } catch { toast('Eroare.', 'error') }
    finally { setSaving(false) }
  }

  const handlePropagare = async (da) => {
    if (da && modalPropagate) {
      const sp = allSpatii.filter(s => s.imobilId === modalPropagate.imobilId && s.preiaMgrImobil)
      await Promise.all(sp.map(s => updateSpatiu(s.id, { managerId: modalPropagate.newManagerId })))
      toast(`Manager actualizat pe ${sp.length} spații.`)
      load()
    }
    setModalPropagate(null)
  }

  const handleDeleteImobil = async (id, nume) => {
    if (!confirm(`Ștergi imobilul "${nume}"?`)) return
    await deleteImobil(id); toast('Imobil șters.'); load()
  }

  // ── Modal Spațiu ─────────────────────────────────────────────
  const openAddSpatiu  = (imobilId) => {
    const im = allImobile.find(i => i.id === imobilId)
    setFormS({ ...emptySpatiu(imobilId, im?.managerId || ''), clienti: [] })
    setEditSId(null); setModalS('add')
  }
  const openEditSpatiu = (sp) => {
    setFormS({ denumire: sp.denumire || '', suprafata: sp.suprafata || '',
      etaj: sp.etaj || '', imobilId: sp.imobilId || '',
      clienti: sp.clienti || [], clientId: sp.clientId || '',
      status: sp.status || 'Liber', managerId: sp.managerId || '',
      preiaMgrImobil: sp.preiaMgrImobil !== false })
    setEditSId(sp.id); setModalS('edit')
  }

  const saveSpatiu = async () => {
    if (!formS.denumire) { toast('Completează denumirea.', 'error'); return }
    setSaving(true)
    try {
      const principal = formS.clienti.find(c => c.rol === 'Chiriaș principal')?.clientId || formS.clienti[0]?.clientId || ''
      const im = allImobile.find(i => i.id === formS.imobilId)
      const data = {
        ...formS,
        suprafata: Number(formS.suprafata) || 0,
        managerId: formS.preiaMgrImobil ? (im?.managerId || '') : formS.managerId,
        clientId: principal,
        status: formS.clienti.length > 0 ? 'Ocupat' : formS.status,
      }
      if (modalS === 'edit') { await updateSpatiu(editSId, data); toast('Spațiu actualizat!') }
      else { await addSpatiu(data); toast('Spațiu adăugat!') }
      setModalS(false); load()
    } catch { toast('Eroare.', 'error') }
    finally { setSaving(false) }
  }

  const handleDeleteSpatiu = async (id, den) => {
    if (!confirm(`Ștergi spațiul "${den}"?`)) return
    await deleteSpatiu(id); toast('Spațiu șters.'); load()
  }

  // ── Modal Clienți spațiu ──────────────────────────────────────
  const openModalClienti = (sp) => {
    setModalClienti(sp)
    setAddClientId('')
    setAddClientRol('Chiriaș principal')
  }

  const handleAddClient = async () => {
    if (!addClientId) { toast('Selectează un client.', 'error'); return }
    await addClientToSpatiu(modalClienti.id, addClientId, addClientRol)
    toast('Client adăugat în spațiu!')
    setAddClientId(''); load()
    // Refresh modalClienti data
    const refreshed = (await getSpatii()).find(s => s.id === modalClienti.id)
    if (refreshed) {
      setModalClienti({
        ...refreshed,
        clienti: refreshed.clienti?.length ? refreshed.clienti
          : refreshed.clientId ? [{ clientId: refreshed.clientId, rol: 'Chiriaș principal', activ: true }] : []
      })
    }
  }

  const handleRemoveClient = async (clientId) => {
    const c = getClient(clientId)
    if (!confirm(`Elimini "${c?.nume || clientId}" din spațiu?`)) return
    await removeClientFromSpatiu(modalClienti.id, clientId)
    toast('Client eliminat din spațiu.')
    load()
    const refreshed = (await getSpatii()).find(s => s.id === modalClienti.id)
    if (refreshed) setModalClienti({ ...refreshed, clienti: refreshed.clienti || [] })
  }

  const handleChangeRol = async (clientId, rol) => {
    await updateClientRolInSpatiu(modalClienti.id, clientId, rol)
    load()
    const refreshed = (await getSpatii()).find(s => s.id === modalClienti.id)
    if (refreshed) setModalClienti({ ...refreshed, clienti: refreshed.clienti || [] })
  }

  // Clienți disponibili (neadăugați deja în spațiu)
  const clientiDisponibili = clienti.filter(c =>
    c.activ !== false &&
    !(modalClienti?.clienti || []).find(sc => sc.clientId === c.id)
  )

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
          const spatiiIm  = spatiiPentruImobil(im.id)
          const ocupate   = spatiiIm.filter(s => s.status === 'Ocupat').length
          const mgrImobil = getUser(im.managerId)

          return (
            <div key={im.id} className="card" style={{ marginBottom: 16 }}>
              {/* Header imobil */}
              <div className="card-header" style={{ background: 'var(--blue-light)', borderBottom: '1px solid var(--blue-mid)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className="ti ti-building" style={{ color: '#fff', fontSize: 18 }} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: 15 }}>{im.nume}</span>
                    {im.unitar && <span className="badge badge-blue" style={{ fontSize: 10 }}>Unitar</span>}
                  </div>
                    <div style={{ fontSize: 12, color: 'var(--slate)' }}>
                      {im.adresa && <span>{im.adresa} · </span>}
                      <span>{spatiiIm.length} spații · </span>
                      <span style={{ color: 'var(--green)' }}>{ocupate} ocupate</span>
                      {spatiiIm.length - ocupate > 0 && <span style={{ color: 'var(--amber)' }}> · {spatiiIm.length - ocupate} libere</span>}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ textAlign: 'right', fontSize: 12 }}>
                    <div style={{ color: 'var(--slate)' }}>Manager imobil</div>
                    <div style={{ fontWeight: 500, color: 'var(--blue)' }}>
                      {mgrImobil ? (mgrImobil.nume || mgrImobil.email) : <span style={{ color: 'var(--amber)' }}>Neasignat</span>}
                    </div>
                  </div>
                  {isAdmin && (
                    <>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEditImobil(im)}><i className="ti ti-pencil" /></button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDeleteImobil(im.id, im.nume)}><i className="ti ti-trash" /></button>
                    </>
                  )}
                </div>
              </div>

              {/* Spații */}
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
                        <th>Clienți</th>
                        <th>Manager</th>
                        <th>Status</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {spatiiIm.map(sp => {
                        const spClienti  = sp.clienti || []
                        const principal  = spClienti.find(c => c.rol === 'Chiriaș principal') || spClienti[0]
                        const mgrSp      = getUser(sp.managerId)
                        const isMotenit  = sp.preiaMgrImobil !== false

                        return (
                          <tr key={sp.id}>
                            <td style={{ paddingLeft: 32 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <i className="ti ti-door" style={{ color: 'var(--slate)', fontSize: 15 }} />
                                <div>
                                  <span style={{ fontWeight: 500 }}>{sp.denumire}</span>
                                  {sp.etaj && <span style={{ fontSize: 11, color: 'var(--slate)', marginLeft: 6 }}>({sp.etaj})</span>}
                                </div>
                              </div>
                            </td>
                            <td style={{ color: 'var(--slate)', fontSize: 12 }}>{sp.suprafata ? `${sp.suprafata} mp` : '—'}</td>

                            {/* Clienți */}
                            <td>
                              {spClienti.length === 0 ? (
                                <span style={{ color: 'var(--slate)', fontSize: 12 }}>Nealocat</span>
                              ) : (
                                <div>
                                  {spClienti.map((sc, i) => {
                                    const cl = getClient(sc.clientId)
                                    return cl ? (
                                      <div key={i} style={{ fontSize: 12, marginBottom: 2, display: 'flex', alignItems: 'center', gap: 5 }}>
                                        {sc.rol === 'Chiriaș principal' && <i className="ti ti-star-filled" style={{ color: 'var(--amber)', fontSize: 10 }} title="Principal" />}
                                        <span style={{ fontWeight: sc.rol === 'Chiriaș principal' ? 600 : 400 }}>{cl.nume}</span>
                                        <span style={{ color: 'var(--slate)', fontSize: 10 }}>({sc.rol})</span>
                                        {/* Butoane contact rapid */}
                                        <div style={{ display: 'inline-flex', gap: 3, marginLeft: 6 }}>
                                          {cl.telefon && (
                                            <a href={`tel:${cl.telefon}`}
                                              className="btn btn-ghost btn-sm"
                                              style={{ padding: '1px 5px', height: 20 }}
                                              title={`Sună: ${cl.telefon}`}
                                              onClick={e => e.stopPropagation()}>
                                              <i className="ti ti-phone" style={{ fontSize: 11 }} />
                                            </a>
                                          )}
                                          {(cl.whatsapp || cl.telefon || (cl.contacte?.[0]?.whatsapp) || (cl.contacte?.[0]?.telefon)) && (
                                            <a href={whatsappLink(
                                                cl.whatsapp || cl.telefon || cl.contacte?.[0]?.whatsapp || cl.contacte?.[0]?.telefon,
                                                `Bună ziua${cl.nume ? ', ' + cl.nume : ''}!`
                                              )}
                                              target="_blank" rel="noreferrer"
                                              className="btn btn-success btn-sm"
                                              style={{ padding: '1px 5px', height: 20 }}
                                              title="WhatsApp"
                                              onClick={e => e.stopPropagation()}>
                                              <i className="ti ti-brand-whatsapp" style={{ fontSize: 11 }} />
                                            </a>
                                          )}
                                          {cl.email && (
                                            <a href={`mailto:${cl.email}`}
                                              className="btn btn-ghost btn-sm"
                                              style={{ padding: '1px 5px', height: 20 }}
                                              title={cl.email}
                                              onClick={e => e.stopPropagation()}>
                                              <i className="ti ti-mail" style={{ fontSize: 11 }} />
                                            </a>
                                          )}
                                        </div>
                                      </div>
                                    ) : null
                                  })}
                                </div>
                              )}
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
                              ) : <span style={{ color: 'var(--amber)' }}>Neasignat</span>}
                            </td>

                            <td>
                              <span className={`badge ${sp.status === 'Ocupat' ? 'badge-green' : sp.status === 'Rezervat' ? 'badge-amber' : 'badge-gray'}`}>
                                {sp.status || 'Liber'}
                              </span>
                            </td>

                            <td>
                              <div style={{ display: 'flex', gap: 4 }}>
                                <button className="btn btn-ghost btn-sm" onClick={() => openModalClienti(sp)} title="Gestionează clienți">
                                  <i className="ti ti-users" />
                                </button>
                                <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/spatii/${sp.id}/istoric`)} title="Istoric spațiu">
                                  <i className="ti ti-history" />
                                </button>
                                <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/spatii/${sp.id}/portal`)} title="Portal chiriaș">
                                  <i className="ti ti-link" />
                                </button>
                                <button className="btn btn-ghost btn-sm" onClick={() => openEditSpatiu(sp)}>
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

                {/* Footer imobil */}
                <div style={{ padding: '10px 20px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => openAddSpatiu(im.id)}>
                    <i className="ti ti-plus" /> Adaugă spațiu în {im.nume}
                  </button>
                  {im.actUrl
                    ? <a href={im.actUrl} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm" style={{ color: 'var(--green)', marginLeft: 'auto' }}>
                        <i className="ti ti-file-text" style={{ color: 'var(--green)' }} /> Act proprietate
                      </a>
                    : <span style={{ fontSize: 11, color: 'var(--slate)', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <i className="ti ti-file-off" style={{ fontSize: 13 }} /> Fără act
                      </span>
                  }
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Modal Imobil ──────────────────────────────────────── */}
      {modalI && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalI(false)}>
          <div className="modal-box" style={{ width: 600 }}>
            <div className="modal-head">
              <h3>{modalI === 'edit' ? 'Editează imobil' : 'Imobil nou'}</h3>
              <button className="modal-close" onClick={() => setModalI(false)}><i className="ti ti-x" /></button>
            </div>
            <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
              <div className="form-grid">
                <div className="form-group"><label>Denumire imobil *</label><input value={formI.nume} onChange={e => setFormI(f => ({ ...f, nume: e.target.value }))} placeholder="ex. Bloc Călimănești" /></div>
                <div className="form-group">
                  <label>Tip imobil</label>
                  <select value={formI.tip} onChange={e => setFormI(f => ({ ...f, tip: e.target.value }))}>
                    <option value="rezidential">Rezidențial (PF)</option>
                    <option value="comercial">Comercial (PJ)</option>
                  </select>
                </div>
                <div className="form-group full"><label>Adresă</label><input value={formI.adresa} onChange={e => setFormI(f => ({ ...f, adresa: e.target.value }))} placeholder="Str. Exemplu, Nr. 1, Ploiești" /></div>
                <div className="form-group full">
                  <label>Manager principal imobil</label>
                  <select value={formI.managerId} onChange={e => setFormI(f => ({ ...f, managerId: e.target.value }))}>
                    <option value="">— Neasignat —</option>
                    {users.filter(u => u.activ !== false).map(u => (
                      <option key={u.id} value={u.id}>{u.nume || u.email} {u.rol === 'admin' ? '(Admin)' : ''}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group full">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '10px 12px', background: formI.unitar ? 'var(--blue-light)' : 'var(--slate-light)', borderRadius: 8, border: `1px solid ${formI.unitar ? 'var(--blue-mid)' : 'var(--border)'}` }}>
                    <input type="checkbox" checked={formI.unitar || false}
                      onChange={e => setFormI(f => ({ ...f, unitar: e.target.checked }))}
                      style={{ width: 18, height: 18 }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>Imobil unitar</div>
                      <div style={{ fontSize: 12, color: 'var(--slate)', marginTop: 2 }}>
                        Imobilul este același cu spațiul (apartament, garsonieră, birou unic).
                        Se creează automat un spațiu cu același nume — nu mai trebuie adăugat manual.
                      </div>
                    </div>
                  </label>
                </div>
                <div className="form-group"><label>Antet notă de calcul</label><input value={formI.antetNota} onChange={e => setFormI(f => ({ ...f, antetNota: e.target.value }))} placeholder="ex. Proprietar: Ion Ungureanu" /></div>
                <div className="form-group"><label>Sub-antet</label><input value={formI.subAntetNota} onChange={e => setFormI(f => ({ ...f, subAntetNota: e.target.value }))} placeholder="ex. Str. Florilor 12, Ploiești" /></div>
                <div className="form-group full">
                  <label>Act proprietate (PDF)</label>
                  <DocumentUpload value={formI.actUrl} onChange={(url) => setFormI(f => ({ ...f, actUrl: url }))} folder="adminchirie/acte" />
                </div>
                <div className="form-group full"><label>Număr/referință document</label><input value={formI.actNota} onChange={e => setFormI(f => ({ ...f, actNota: e.target.value }))} placeholder="ex. CF Nr. 12345" /></div>
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
                <div className="form-group"><label>Denumire spațiu *</label><input value={formS.denumire} onChange={e => setFormS(f => ({ ...f, denumire: e.target.value }))} placeholder="ex. Apt 1, Birou A" /></div>
                <div className="form-group">
                  <label>Imobil *</label>
                  <select value={formS.imobilId} onChange={e => {
                    const im = allImobile.find(i => i.id === e.target.value)
                    setFormS(f => ({ ...f, imobilId: e.target.value, managerId: im?.managerId || '', preiaMgrImobil: true }))
                  }}>
                    <option value="">— Alege imobil —</option>
                    {allImobile.map(im => <option key={im.id} value={im.id}>{im.nume}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Suprafață (mp)</label><input type="number" value={formS.suprafata} onChange={e => setFormS(f => ({ ...f, suprafata: e.target.value }))} placeholder="85" /></div>
                <div className="form-group"><label>Etaj / Locație</label><input value={formS.etaj} onChange={e => setFormS(f => ({ ...f, etaj: e.target.value }))} placeholder="ex. Et. 2, Parter" /></div>
                <div className="form-group">
                  <label>Status</label>
                  <select value={formS.status} onChange={e => setFormS(f => ({ ...f, status: e.target.value }))}>
                    <option value="Liber">Liber</option>
                    <option value="Ocupat">Ocupat</option>
                    <option value="Rezervat">Rezervat</option>
                  </select>
                </div>
                <div className="form-group full" style={{ background: 'var(--slate-light)', borderRadius: 8, padding: 14 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--blue)', marginBottom: 10, display: 'block', textTransform: 'uppercase', letterSpacing: '.5px' }}>Manager spațiu</label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 10, fontSize: 13 }}>
                    <input type="checkbox" checked={formS.preiaMgrImobil} onChange={e => {
                      const im = allImobile.find(i => i.id === formS.imobilId)
                      setFormS(f => ({ ...f, preiaMgrImobil: e.target.checked, managerId: e.target.checked ? (im?.managerId || '') : f.managerId }))
                    }} style={{ width: 16, height: 16 }} />
                    <div>
                      <div style={{ fontWeight: 500 }}>Preia managerul imobilului</div>
                      {formS.preiaMgrImobil && formS.imobilId && (
                        <div style={{ fontSize: 11, color: 'var(--blue)', marginTop: 2 }}>→ {getUserNume(allImobile.find(im => im.id === formS.imobilId)?.managerId)}</div>
                      )}
                    </div>
                  </label>
                  {!formS.preiaMgrImobil && (
                    <select value={formS.managerId} onChange={e => setFormS(f => ({ ...f, managerId: e.target.value }))}>
                      <option value="">— Neasignat —</option>
                      {users.filter(u => u.activ !== false).map(u => (
                        <option key={u.id} value={u.id}>{u.nume || u.email}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
              <div className="alert alert-info" style={{ marginTop: 12 }}>
                <i className="ti ti-info-circle" />
                <span>Clienții se asociază spațiului din butonul 👥 din tabel, după salvare.</span>
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

      {/* ── Modal Clienți spațiu ──────────────────────────────── */}
      {modalClienti && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalClienti(null)}>
          <div className="modal-box" style={{ width: 560 }}>
            <div className="modal-head">
              <h3>Clienți — {modalClienti.denumire}</h3>
              <button className="modal-close" onClick={() => setModalClienti(null)}><i className="ti ti-x" /></button>
            </div>
            <div className="modal-body">
              {/* Lista clienților actuali */}
              {(modalClienti.clienti || []).length === 0 ? (
                <div style={{ color: 'var(--slate)', fontSize: 13, marginBottom: 16, textAlign: 'center', padding: 12 }}>
                  Niciun client asociat acestui spațiu.
                </div>
              ) : (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.5px' }}>
                    Clienți asociați ({(modalClienti.clienti || []).length})
                  </div>
                  {(modalClienti.clienti || []).map((sc, i) => {
                    const cl = getClient(sc.clientId)
                    if (!cl) return null
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: sc.rol === 'Chiriaș principal' ? 'var(--blue-light)' : 'var(--slate-light)', borderRadius: 8, marginBottom: 8, border: `1px solid ${sc.rol === 'Chiriaș principal' ? 'var(--blue-mid)' : 'var(--border)'}` }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {sc.rol === 'Chiriaș principal' && <i className="ti ti-star-filled" style={{ color: 'var(--amber)', fontSize: 13 }} />}
                            <span style={{ fontWeight: 600, fontSize: 13 }}>{cl.nume}</span>
                            <span className="badge badge-gray" style={{ fontSize: 10 }}>{cl.tip || 'PJ'}</span>
                          </div>
                          {cl.telefon && <div style={{ fontSize: 11, color: 'var(--slate)', marginTop: 2 }}>{cl.telefon}</div>}
                        </div>
                        <select
                          value={sc.rol}
                          onChange={e => handleChangeRol(sc.clientId, e.target.value)}
                          style={{ fontSize: 12, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'white' }}
                        >
                          {ROLURI.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                        <button className="btn btn-danger btn-sm" onClick={() => handleRemoveClient(sc.clientId)} title="Elimină din spațiu">
                          <i className="ti ti-user-minus" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Adaugă client nou */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.5px' }}>
                  Adaugă client în spațiu
                </div>
                <div className="form-grid">
                  <div className="form-group full">
                    <label>Client</label>
                    <select value={addClientId} onChange={e => setAddClientId(e.target.value)}>
                      <option value="">— Alege client —</option>
                      {clientiDisponibili.length === 0
                        ? <option disabled>Toți clienții activi sunt deja asociați</option>
                        : clientiDisponibili.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.nume} ({c.tip || 'PJ'}{c.cui ? ` · CUI: ${c.cui}` : c.cnp ? ` · CNP: ${c.cnp}` : ''})
                            </option>
                          ))
                      }
                    </select>
                  </div>
                  <div className="form-group full">
                    <label>Rol în spațiu</label>
                    <select value={addClientRol} onChange={e => setAddClientRol(e.target.value)}>
                      {ROLURI.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                </div>
                <button className="btn btn-primary btn-sm" onClick={handleAddClient} disabled={!addClientId}>
                  <i className="ti ti-user-plus" /> Adaugă în spațiu
                </button>
              </div>

              {/* Legendă roluri */}
              <div style={{ marginTop: 16, padding: 12, background: 'var(--slate-light)', borderRadius: 8, fontSize: 11, color: 'var(--slate)' }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>Roluri disponibile:</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
                  <span>⭐ <strong>Chiriaș principal</strong> — titular contract, pe factură</span>
                  <span>👥 <strong>Co-chiriaș</strong> — chiriaș secundar</span>
                  <span>🛡️ <strong>Garant</strong> — garant financiar</span>
                  <span>📋 <strong>Reprezentant</strong> — împuternicit firmă</span>
                  <span>🤝 <strong>Asociat</strong> — partener de afaceri</span>
                  <span>📌 <strong>Altul</strong> — rol nedefinit</span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setModalClienti(null)}>Gata</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal propagare manager ───────────────────────────── */}
      {modalPropagate && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ width: 440 }}>
            <div className="modal-head"><h3>Actualizare manager spații</h3></div>
            <div className="modal-body">
              <div className="alert alert-info">
                <i className="ti ti-info-circle" />
                <span>Ai schimbat managerul imobilului. Există <strong>{modalPropagate.count} spații</strong> care moștenesc managerul. Vrei să le actualizezi?</span>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => handlePropagare(false)}>Nu, păstrează actuali</button>
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
