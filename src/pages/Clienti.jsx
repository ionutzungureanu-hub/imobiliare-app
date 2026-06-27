import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Topbar from '../components/Topbar'
import { getClienti, addClient, updateClient, deleteClient } from '../firebase/firestore'
import { useToast } from '../components/Toast'
import { whatsappLink } from '../utils'

// ── Structură client goală ─────────────────────────────────────
const emptyContact = () => ({ nume: '', functie: '', telefon: '', whatsapp: '', trimiteMesaj: false })
const emptyEmail   = () => ({ adresa: '', trimiteMail: false })
const emptyForm    = () => ({
  nume: '', cui: '', regCom: '', adresa: '', tip: 'PJ', platitorTVA: null, banca: '', iban: '', contractUrl: '',
  spatiu: '',
  contacte: [emptyContact()],
  emailuri: [emptyEmail()],
})

export default function Clienti() {
  const navigate = useNavigate()
  const toast    = useToast()

  const [clienti,    setClienti]    = useState([])
  const [modal,      setModal]      = useState(false)   // 'add' | 'edit' | false
  const [editId,     setEditId]     = useState(null)
  const [form,       setForm]       = useState(emptyForm())
  const [saving,     setSaving]     = useState(false)
  const [search,     setSearch]     = useState('')

  const load = () => getClienti().then(setClienti)
  useEffect(() => { load() }, [])

  // ── Form helpers ─────────────────────────────────────────────
  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Contacte
  const setContact = (i, k, v) => setForm(f => {
    const arr = [...f.contacte]
    arr[i] = { ...arr[i], [k]: v }
    return { ...f, contacte: arr }
  })
  const addContact    = () => setForm(f => ({ ...f, contacte: [...f.contacte, emptyContact()] }))
  const removeContact = i  => setForm(f => ({ ...f, contacte: f.contacte.filter((_, idx) => idx !== i) }))

  // Emailuri
  const setEmailField = (i, k, v) => setForm(f => {
    const arr = [...f.emailuri]
    arr[i] = { ...arr[i], [k]: v }
    return { ...f, emailuri: arr }
  })
  const addEmail    = () => setForm(f => ({ ...f, emailuri: [...f.emailuri, emptyEmail()] }))
  const removeEmail = i  => setForm(f => ({ ...f, emailuri: f.emailuri.filter((_, idx) => idx !== i) }))

  // ── Deschide modal ───────────────────────────────────────────
  const openAdd = () => {
    setForm(emptyForm())
    setEditId(null)
    setModal('add')
  }

  const openEdit = (c) => {
    setForm({
      nume:     c.nume     || '',
      cui:      c.cui      || '',
      regCom:   c.regCom   || '',
      adresa:   c.adresa   || '',
      tip:      c.tip      || 'PJ',
      platitorTVA: c.platitorTVA ?? null,
      banca:    c.banca    || '',
      iban:     c.iban     || '',
      contractUrl: c.contractUrl || '',
      spatiu:   c.spatiu   || '',
      contacte: c.contacte?.length ? c.contacte : [emptyContact()],
      emailuri: c.emailuri?.length ? c.emailuri : [emptyEmail()],
    })
    setEditId(c.id)
    setModal('edit')
  }

  const closeModal = () => { setModal(false); setEditId(null) }

  // ── Salvare ──────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.nume) { toast('Completează denumirea clientului.', 'error'); return }
    const hasEmail = form.emailuri.some(e => e.adresa.trim())
    if (!hasEmail)  { toast('Adaugă cel puțin o adresă de email.', 'error'); return }
    setSaving(true)
    try {
      const data = {
        ...form,
        // email principal = primul email cu trimiteMail sau primul din listă
        email: form.emailuri.find(e => e.trimiteMail)?.adresa || form.emailuri[0]?.adresa || '',
        // telefon principal = primul contact cu telefon
        telefon: form.contacte[0]?.telefon || '',
      }
      if (modal === 'edit') {
        await updateClient(editId, data)
        toast('Client actualizat!')
      } else {
        await addClient(data)
        toast('Client adăugat!')
      }
      closeModal()
      load()
    } catch { toast('Eroare la salvare.', 'error') }
    finally { setSaving(false) }
  }

  // ── Ștergere ─────────────────────────────────────────────────
  const handleDelete = async (id, nume) => {
    if (!confirm(`Ștergi clientul "${nume}"?`)) return
    await deleteClient(id)
    toast('Client șters.')
    load()
  }

  // ── Filtrare ─────────────────────────────────────────────────
  const filtered = clienti.filter(c =>
    !search ||
    c.nume?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <Topbar title="Clienți" subtitle="Gestionare chiriași și date de contact">
        <button className="btn btn-primary btn-sm" onClick={openAdd}>
          <i className="ti ti-plus" /> Client nou
        </button>
      </Topbar>

      <div className="content">
        <div className="toolbar">
          <input
            type="text" placeholder="Caută după nume sau email…"
            value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Denumire</th><th>CUI</th><th>TVA</th>
                <th>Contacte</th><th>Emailuri</th><th>Contact rapid</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7}>
                  <div className="empty">
                    <i className="ti ti-users" />
                    <p>Niciun client. Adaugă primul chiriaș.</p>
                  </div>
                </td></tr>
              ) : filtered.map(c => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 500 }}>{c.nume}</td>
                  <td style={{ color: 'var(--slate)', fontSize: 12 }}>{c.cui}</td>
                  <td>
                    {c.platitorTVA === true
                      ? <span className="badge badge-green" style={{fontSize:10}}>TVA</span>
                      : c.platitorTVA === false
                        ? <span className="badge badge-amber" style={{fontSize:10}}>Fără TVA</span>
                        : <span className="badge badge-gray" style={{fontSize:10}}>—</span>
                    }
                  </td>


                  {/* Contacte */}
                  <td>
                    {(c.contacte || []).filter(x => x.nume || x.telefon).map((ct, i) => (
                      <div key={i} style={{ fontSize: 12, marginBottom: 3 }}>
                        <span style={{ fontWeight: 500 }}>{ct.nume}</span>
                        {ct.functie && <span style={{ color: 'var(--slate)' }}> — {ct.functie}</span>}
                        <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
                          {ct.telefon && (
                            <a href={`tel:${ct.telefon}`} className="btn btn-ghost btn-sm" style={{ padding: '2px 6px' }} title="Sună">
                              <i className="ti ti-phone" style={{ fontSize: 12 }} />
                            </a>
                          )}
                          {ct.trimiteMesaj && (ct.whatsapp || ct.telefon) && (
                            <a href={whatsappLink(ct.whatsapp || ct.telefon, `Bună ziua${ct.nume ? ', ' + ct.nume : ''}!`)}
                              target="_blank" rel="noreferrer"
                              className="btn btn-success btn-sm" style={{ padding: '2px 6px' }} title="WhatsApp">
                              <i className="ti ti-brand-whatsapp" style={{ fontSize: 12 }} />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </td>

                  {/* Emailuri */}
                  <td>
                    {(c.emailuri || [{ adresa: c.email, trimiteMail: true }]).filter(e => e.adresa).map((em, i) => (
                      <div key={i} style={{ fontSize: 12, marginBottom: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                        {em.trimiteMail && <span style={{ color: 'var(--green)', fontSize: 10 }}>●</span>}
                        <a href={`mailto:${em.adresa}`} style={{ color: 'var(--blue)', textDecoration: 'none' }}>
                          {em.adresa}
                        </a>
                      </div>
                    ))}
                  </td>

                  {/* Contact rapid */}
                  <td>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {c.email && (
                        <a href={`mailto:${c.email}`} className="btn btn-ghost btn-sm" title="Email principal">
                          <i className="ti ti-mail" />
                        </a>
                      )}
                      {c.telefon && (
                        <a href={`tel:${c.telefon}`} className="btn btn-ghost btn-sm" title="Sună">
                          <i className="ti ti-phone" />
                        </a>
                      )}

                    </div>
                  </td>

                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(c)} title="Editează">
                        <i className="ti ti-pencil" />
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/clienti/${c.id}`)} title="Conversație">
                        <i className="ti ti-message-circle" /> Conversație
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(c.id, c.nume)}>
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

      {/* ── Modal adăugare / editare ────────────────────────────── */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal-box" style={{ width: 640 }}>
            <div className="modal-head">
              <h3>{modal === 'edit' ? 'Editează client' : 'Client nou'}</h3>
              <button className="modal-close" onClick={closeModal}><i className="ti ti-x" /></button>
            </div>

            <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>

              {/* Date firmă */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--blue)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.5px' }}>
                  <i className="ti ti-building" /> Date firmă
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Denumire firmă / Nume *</label>
                    <input value={form.nume} onChange={e => setField('nume', e.target.value)} placeholder="SC Alfa SRL" />
                  </div>
                  <div className="form-group">
                    <label>CUI</label>
                    <input value={form.cui} onChange={e => setField('cui', e.target.value)} placeholder="RO12345678" />
                  </div>
                  <div className="form-group">
                    <label>Nr. Reg. Com.</label>
                    <input value={form.regCom} onChange={e => setField('regCom', e.target.value)} placeholder="J40/1234/2020" />
                  </div>
                  <div className="form-group">
                    <label>Spațiu închiriat</label>
                    <input
                      value={form.spatiu}
                      onChange={e => setField('spatiu', e.target.value)}
                      placeholder="ex. Et. 2 — Birou 204, 85 mp"
                    />
                  </div>
                  <div className="form-group full">
                    <label>Adresă sediu</label>
                    <input value={form.adresa} onChange={e => setField('adresa', e.target.value)} placeholder="Str. Exemplu, Nr. 1, București" />
                  </div>
                  <div className="form-group">
                    <label>Tip client</label>
                    <select value={form.tip || 'PJ'} onChange={e => setField('tip', e.target.value)}>
                      <option value="PJ">Persoană Juridică (firmă)</option>
                      <option value="PF">Persoană Fizică</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Platitor TVA</label>
                    <select value={String(form.platitorTVA)} onChange={e => setField('platitorTVA', e.target.value === 'true' ? true : e.target.value === 'false' ? false : null)}>
                      <option value="null">Necunoscut / Neaplicabil</option>
                      <option value="true">Da — Platitor TVA</option>
                      <option value="false">Nu — Neplatitor TVA</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Bancă</label>
                    <input value={form.banca || ''} onChange={e => setField('banca', e.target.value)} placeholder="ex. Banca Transilvania" />
                  </div>
                  <div className="form-group">
                    <label>IBAN</label>
                    <input value={form.iban || ''} onChange={e => setField('iban', e.target.value)} placeholder="RO49AAAA1B31007593840000" />
                  </div>

                </div>
              </div>

              {/* Persoane de contact */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--blue)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span><i className="ti ti-users" /> Persoane de contact</span>
                  <button className="btn btn-ghost btn-sm" onClick={addContact}>
                    <i className="ti ti-plus" /> Adaugă persoană
                  </button>
                </div>

                {form.contacte.map((ct, i) => (
                  <div key={i} style={{ background: 'var(--slate-light)', borderRadius: 'var(--radius-sm)', padding: 12, marginBottom: 10, border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate)' }}>Persoana {i + 1}</span>
                      {form.contacte.length > 1 && (
                        <button className="remove-btn" onClick={() => removeContact(i)}>
                          <i className="ti ti-x" />
                        </button>
                      )}
                    </div>
                    <div className="form-grid" style={{ gap: 10 }}>
                      <div className="form-group">
                        <label>Nume</label>
                        <input value={ct.nume} onChange={e => setContact(i, 'nume', e.target.value)} placeholder="Ion Popescu" />
                      </div>
                      <div className="form-group">
                        <label>Funcție</label>
                        <input value={ct.functie} onChange={e => setContact(i, 'functie', e.target.value)} placeholder="Director / Contabil / etc." />
                      </div>
                      <div className="form-group">
                        <label>Telefon</label>
                        <input value={ct.telefon} onChange={e => setContact(i, 'telefon', e.target.value)} placeholder="07xx xxx xxx" />
                      </div>
                      <div className="form-group">
                        <label>WhatsApp (dacă diferit)</label>
                        <input value={ct.whatsapp} onChange={e => setContact(i, 'whatsapp', e.target.value)} placeholder="07xx xxx xxx" />
                      </div>
                      <div className="form-group full">
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={ct.trimiteMesaj}
                            onChange={e => setContact(i, 'trimiteMesaj', e.target.checked)}
                            style={{ width: 16, height: 16 }}
                          />
                          <span>Trimite WhatsApp acestei persoane (apare butonul WhatsApp)</span>
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Emailuri */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--blue)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span><i className="ti ti-mail" /> Adrese email</span>
                  <button className="btn btn-ghost btn-sm" onClick={addEmail}>
                    <i className="ti ti-plus" /> Adaugă email
                  </button>
                </div>

                {form.emailuri.map((em, i) => (
                  <div key={i} style={{ background: 'var(--slate-light)', borderRadius: 'var(--radius-sm)', padding: 12, marginBottom: 10, border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                        <label>Email {i + 1}</label>
                        <input
                          type="email"
                          value={em.adresa}
                          onChange={e => setEmailField(i, 'adresa', e.target.value)}
                          placeholder="contabilitate@firma.ro"
                        />
                      </div>
                      {form.emailuri.length > 1 && (
                        <button className="remove-btn" onClick={() => removeEmail(i)} style={{ marginTop: 18 }}>
                          <i className="ti ti-x" />
                        </button>
                      )}
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 8, fontSize: 13 }}>
                      <input
                        type="checkbox"
                        checked={em.trimiteMail}
                        onChange={e => setEmailField(i, 'trimiteMail', e.target.checked)}
                        style={{ width: 16, height: 16 }}
                      />
                      <span>Trimite facturile și emailurile la această adresă</span>
                      {em.trimiteMail && <span style={{ color: 'var(--green)', fontSize: 11 }}>● Activ</span>}
                    </label>
                  </div>
                ))}
              </div>

            </div>

            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={closeModal}>Anulează</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                <i className="ti ti-device-floppy" />
                {saving ? 'Se salvează…' : modal === 'edit' ? 'Salvează modificările' : 'Salvează client'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
