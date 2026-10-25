import { useEffect, useState } from 'react'
import Topbar from '../../../shared/components/Topbar'
import { useToast } from '../../../shared/components/Toast'
import { useAuth } from '../../../shared/context/AuthContext'
import { getUsers, saveUserProfile, updateUserProfile, deleteUserProfile } from '../../../shared/firebase/firestore'
import { useImobile } from '../../../shared/hooks/useImobile'

const emptyForm = () => ({ nume: '', email: '', rol: 'manager', imobileAccess: [], activ: true })

export default function Utilizatori() {
  const toast          = useToast()
  const { user, isAdmin } = useAuth()
  const { imobile }    = useImobile()

  const [users,   setUsers]   = useState([])
  const [modal,   setModal]   = useState(false)
  const [editId,  setEditId]  = useState(null)
  const [form,    setForm]    = useState(emptyForm())
  const [saving,  setSaving]  = useState(false)

  const load = () => getUsers().then(setUsers)
  useEffect(() => { load() }, [])

  if (!isAdmin) return (
    <div className="content" style={{ paddingTop: 60, textAlign: 'center', color: 'var(--slate)' }}>
      <i className="ti ti-lock" style={{ fontSize: 40, display: 'block', marginBottom: 12 }} />
      <p>Acces restricționat. Doar administratorii pot gestiona utilizatorii.</p>
    </div>
  )

  const openAdd = () => { setForm(emptyForm()); setEditId(null); setModal(true) }
  const openEdit = (u) => {
    setForm({ nume: u.nume || '', email: u.email || '', rol: u.rol || 'manager', imobileAccess: u.imobileAccess || [], activ: u.activ !== false })
    setEditId(u.id); setModal(true)
  }

  const toggleImobil = (id) => setForm(f => ({
    ...f,
    imobileAccess: f.imobileAccess.includes(id)
      ? f.imobileAccess.filter(x => x !== id)
      : [...f.imobileAccess, id]
  }))

  const handleSave = async () => {
    if (!form.email) { toast('Completează emailul.', 'error'); return }
    setSaving(true)
    try {
      const data = {
        ...form,
        imobileAccess: form.rol === 'admin' ? [] : form.imobileAccess,
      }
      if (editId) {
        await updateUserProfile(editId, data)
        toast('Utilizator actualizat!')
      } else {
        // Creăm profilul — userul trebuie creat manual în Firebase Auth
        await saveUserProfile(form.email.replace(/[^a-zA-Z0-9]/g, '_'), data)
        toast('Profil creat! Adaugă userul și în Firebase Authentication.')
      }
      setModal(false); load()
    } catch { toast('Eroare la salvare.', 'error') }
    finally { setSaving(false) }
  }

  const handleToggleActiv = async (u) => {
    await updateUserProfile(u.id, { activ: !u.activ })
    toast(u.activ ? 'Utilizator dezactivat.' : 'Utilizator activat.')
    load()
  }

  const handleDelete = async (u) => {
    if (!confirm(`Ștergi profilul lui "${u.nume || u.email}"?`)) return
    await deleteUserProfile(u.id)
    toast('Profil șters.')
    load()
  }

  return (
    <>
      <Topbar title="Utilizatori" subtitle="Gestionare accesuri și permisiuni">
        <button className="btn btn-primary btn-sm" onClick={openAdd}>
          <i className="ti ti-plus" /> Utilizator nou
        </button>
      </Topbar>

      <div className="content">
        <div className="alert alert-info" style={{ marginBottom: 16 }}>
          <i className="ti ti-info-circle" />
          <span>
            Utilizatorii trebuie creați mai întâi în <strong>Firebase Console → Authentication</strong> cu email și parolă.
            Apoi adaugă-i aici pentru a seta rolul și imobilele permise.
          </span>
        </div>

        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Nume</th><th>Email</th><th>Rol</th><th>Imobile accesibile</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan={6}>
                  <div className="empty"><i className="ti ti-users" /><p>Niciun utilizator configurat.</p></div>
                </td></tr>
              ) : users.map(u => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 500 }}>{u.nume || '—'}</td>
                  <td style={{ color: 'var(--slate)', fontSize: 12 }}>{u.email}</td>
                  <td>
                    <span className={`badge ${u.rol === 'admin' ? 'badge-blue' : 'badge-gray'}`}>
                      {u.rol === 'admin' ? 'Administrator' : 'Manager'}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--slate)' }}>
                    {u.rol === 'admin'
                      ? <span className="badge badge-green">Toate imobilele</span>
                      : u.imobileAccess?.length > 0
                        ? u.imobileAccess.map(id => imobile.find(im => im.id === id)?.nume || id).join(', ')
                        : <span style={{ color: 'var(--amber)' }}>Niciun imobil alocat</span>
                    }
                  </td>
                  <td>
                    <span className={`badge ${u.activ !== false ? 'badge-green' : 'badge-red'}`}>
                      {u.activ !== false ? 'Activ' : 'Inactiv'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(u)}>
                        <i className="ti ti-pencil" />
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleToggleActiv(u)}
                        title={u.activ !== false ? 'Dezactivează' : 'Activează'}>
                        <i className={`ti ${u.activ !== false ? 'ti-eye-off' : 'ti-eye'}`} />
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(u)}>
                        <i className="ti ti-trash" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal-box">
            <div className="modal-head">
              <h3>{editId ? 'Editează utilizator' : 'Utilizator nou'}</h3>
              <button className="modal-close" onClick={() => setModal(false)}><i className="ti ti-x" /></button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Nume complet</label>
                  <input value={form.nume} onChange={e => setForm(f => ({ ...f, nume: e.target.value }))} placeholder="Ion Popescu" />
                </div>
                <div className="form-group">
                  <label>Email *</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="ion@firma.ro" disabled={!!editId} />
                </div>
                <div className="form-group full">
                  <label>Rol</label>
                  <select value={form.rol} onChange={e => setForm(f => ({ ...f, rol: e.target.value }))}>
                    <option value="manager">Manager (acces parțial)</option>
                    <option value="admin">Administrator (acces total)</option>
                  </select>
                </div>
              </div>

              {form.rol === 'manager' && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.5px' }}>
                    Imobile accesibile
                  </div>
                  {imobile.length === 0 ? (
                    <div style={{ color: 'var(--slate)', fontSize: 13 }}>Niciun imobil creat încă.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {imobile.map(im => (
                        <label key={im.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13 }}>
                          <input
                            type="checkbox"
                            checked={form.imobileAccess.includes(im.id)}
                            onChange={() => toggleImobil(im.id)}
                            style={{ width: 16, height: 16 }}
                          />
                          <div>
                            <div style={{ fontWeight: 500 }}>{im.nume}</div>
                            {im.adresa && <div style={{ fontSize: 11, color: 'var(--slate)' }}>{im.adresa}</div>}
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {form.rol === 'admin' && (
                <div className="alert alert-info" style={{ marginTop: 16 }}>
                  <i className="ti ti-info-circle" />
                  <span>Administratorul are acces la toate imobilele automat.</span>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModal(false)}>Anulează</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                <i className="ti ti-device-floppy" /> {saving ? 'Se salvează…' : 'Salvează'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
