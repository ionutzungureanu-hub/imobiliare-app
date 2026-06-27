import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Topbar from '../components/Topbar'
import { getClienti, addClient, updateClient, deleteClient } from '../firebase/firestore'
import { useToast } from '../components/Toast'
import { whatsappLink } from '../utils'

const emptyContact = () => ({ nume: '', functie: '', telefon: '', whatsapp: '', trimiteMesaj: false })
const emptyEmail   = () => ({ adresa: '', trimiteMail: false })

const emptyFormPJ = () => ({
  tip: 'PJ', nume: '', cui: '', regCom: '', adresa: '',
  platitorTVA: null, banca: '', iban: '', spatiu: '',
  contacte: [emptyContact()], emailuri: [emptyEmail()],
})

const emptyFormPF = () => ({
  tip: 'PF', nume: '', cnp: '', adresa: '',
  telefon: '', email: '', whatsapp: '', spatiu: '',
  contacte: [emptyContact()], emailuri: [emptyEmail()],
})

export default function Clienti() {
  const navigate = useNavigate()
  const toast    = useToast()

  const [clienti,  setClienti]  = useState([])
  const [tab,      setTab]      = useState('PJ')      // 'PJ' | 'PF'
  const [modal,    setModal]    = useState(false)     // 'add' | 'edit' | false
  const [tipModal, setTipModal] = useState('PJ')     // tipul ales în modal
  const [editId,   setEditId]   = useState(null)
  const [form,     setForm]     = useState(emptyFormPJ())
  const [saving,   setSaving]   = useState(false)
  const [search,   setSearch]   = useState('')

  const load = () => getClienti().then(setClienti)
  useEffect(() => { load() }, [] )

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Contacte
  const setContact = (i, k, v) => setForm(f => {
    const arr = [...f.contacte]; arr[i] = { ...arr[i], [k]: v }; return { ...f, contacte: arr }
  })
  const addContact    = () => setForm(f => ({ ...f, contacte: [...f.contacte, emptyContact()] }))
  const removeContact = i  => setForm(f => ({ ...f, contacte: f.contacte.filter((_, idx) => idx !== i) }))

  // Emailuri
  const setEmailField = (i, k, v) => setForm(f => {
    const arr = [...f.emailuri]; arr[i] = { ...arr[i], [k]: v }; return { ...f, emailuri: arr }
  })
  const addEmail    = () => setForm(f => ({ ...f, emailuri: [...f.emailuri, emptyEmail()] }))
  const removeEmail = i  => setForm(f => ({ ...f, emailuri: f.emailuri.filter((_, idx) => idx !== i) }))

  // ── Modal ─────────────────────────────────────────────────────
  const openAdd = (tip = tab) => {
    setTipModal(tip)
    setForm(tip === 'PF' ? emptyFormPF() : emptyFormPJ())
    setEditId(null); setModal('add')
  }

  const openEdit = (c) => {
    setTipModal(c.tip || 'PJ')
    setForm({
      tip:      c.tip || 'PJ',
      nume:     c.nume     || '',
      cui:      c.cui      || '',
      cnp:      c.cnp      || '',
      regCom:   c.regCom   || '',
      adresa:   c.adresa   || '',
      platitorTVA: c.platitorTVA ?? null,
      banca:    c.banca    || '',
      iban:     c.iban     || '',
      telefon:  c.telefon  || '',
      email:    c.email    || '',
      whatsapp: c.whatsapp || '',
      spatiu:   c.spatiu   || '',
      contacte: c.contacte?.length ? c.contacte : [emptyContact()],
      emailuri: c.emailuri?.length ? c.emailuri : [emptyEmail()],
    })
    setEditId(c.id); setModal('edit')
  }

  const closeModal = () => { setModal(false); setEditId(null) }

  // ── Salvare ───────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.nume) { toast('Completează numele.', 'error'); return }
    if (form.tip === 'PJ') {
      const hasEmail = form.emailuri.some(e => e.adresa.trim())
      if (!hasEmail) { toast('Adaugă cel puțin un email.', 'error'); return }
    }
    setSaving(true)
    try {
      const data = {
        ...form,
        email:   form.tip === 'PJ'
          ? (form.emailuri.find(e => e.trimiteMail)?.adresa || form.emailuri[0]?.adresa || '')
          : form.email,
        telefon: form.tip === 'PJ'
          ? (form.contacte[0]?.telefon || '')
          : form.telefon,
      }
      if (modal === 'edit') { await updateClient(editId, data); toast('Client actualizat!') }
      else { await addClient(data); toast('Client adăugat!') }
      closeModal(); load()
    } catch { toast('Eroare la salvare.', 'error') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id, nume) => {
    if (!confirm(`Ștergi clientul "${nume}"?`)) return
    await deleteClient(id); toast('Client șters.'); load()
  }

  // ── Filtrare ──────────────────────────────────────────────────
  const filterFn = (c) =>
    !search ||
    c.nume?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.cui?.includes(search) || c.cnp?.includes(search) ||
    c.telefon?.includes(search)

  const clientiPJ = clienti.filter(c => (c.tip || 'PJ') === 'PJ' && filterFn(c))
  const clientiPF = clienti.filter(c => c.tip === 'PF' && filterFn(c))

  // ── Tabel PJ ─────────────────────────────────────────────────
  const TabelPJ = () => (
    <div className="card">
      <table>
        <thead>
          <tr>
            <th>Denumire firmă</th><th>CUI</th><th>TVA</th>
            <th>Contacte</th><th>Emailuri</th><th>Contact rapid</th><th></th>
          </tr>
        </thead>
        <tbody>
          {clientiPJ.length === 0 ? (
            <tr><td colSpan={7}>
              <div className="empty"><i className="ti ti-building-store" /><p>Nicio persoană juridică.</p></div>
            </td></tr>
          ) : clientiPJ.map(c => (
            <tr key={c.id}>
              <td style={{ fontWeight: 500 }}>{c.nume}</td>
              <td style={{ color: 'var(--slate)', fontSize: 12 }}>{c.cui || '—'}</td>
              <td>
                {c.platitorTVA === true
                  ? <span className="badge badge-green" style={{ fontSize: 10 }}>TVA</span>
                  : c.platitorTVA === false
                    ? <span className="badge badge-amber" style={{ fontSize: 10 }}>Fără TVA</span>
                    : <span className="badge badge-gray" style={{ fontSize: 10 }}>—</span>
                }
              </td>
              <td>
                {(c.contacte || []).filter(x => x.nume || x.telefon).map((ct, i) => (
                  <div key={i} style={{ fontSize: 12, marginBottom: 3 }}>
                    <span style={{ fontWeight: 500 }}>{ct.nume}</span>
                    {ct.functie && <span style={{ color: 'var(--slate)' }}> — {ct.functie}</span>}
                    <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
                      {ct.telefon && (
                        <a href={`tel:${ct.telefon}`} className="btn btn-ghost btn-sm" style={{ padding: '2px 6px' }}>
                          <i className="ti ti-phone" style={{ fontSize: 12 }} />
                        </a>
                      )}
                      {ct.trimiteMesaj && (ct.whatsapp || ct.telefon) && (
                        <a href={whatsappLink(ct.whatsapp || ct.telefon, `Bună ziua${ct.nume ? ', ' + ct.nume : ''}!`)}
                          target="_blank" rel="noreferrer" className="btn btn-success btn-sm" style={{ padding: '2px 6px' }}>
                          <i className="ti ti-brand-whatsapp" style={{ fontSize: 12 }} />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </td>
              <td>
                {(c.emailuri || [{ adresa: c.email, trimiteMail: true }]).filter(e => e.adresa).map((em, i) => (
                  <div key={i} style={{ fontSize: 12, marginBottom: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                    {em.trimiteMail && <span style={{ color: 'var(--green)', fontSize: 10 }}>●</span>}
                    <a href={`mailto:${em.adresa}`} style={{ color: 'var(--blue)', textDecoration: 'none' }}>{em.adresa}</a>
                  </div>
                ))}
              </td>
              <td>
                <div style={{ display: 'flex', gap: 4 }}>
                  {c.email && <a href={`mailto:${c.email}`} className="btn btn-ghost btn-sm"><i className="ti ti-mail" /></a>}
                  {c.telefon && <a href={`tel:${c.telefon}`} className="btn btn-ghost btn-sm"><i className="ti ti-phone" /></a>}
                </div>
              </td>
              <td>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => openEdit(c)}><i className="ti ti-pencil" /></button>
                  <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/clienti/${c.id}`)}>
                    <i className="ti ti-message-circle" />
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
  )

  // ── Tabel PF ─────────────────────────────────────────────────
  const TabelPF = () => (
    <div className="card">
      <table>
        <thead>
          <tr>
            <th>Nume</th><th>CNP</th><th>Telefon</th><th>Email</th><th>Spațiu</th><th>Contact rapid</th><th></th>
          </tr>
        </thead>
        <tbody>
          {clientiPF.length === 0 ? (
            <tr><td colSpan={7}>
              <div className="empty"><i className="ti ti-user" /><p>Nicio persoană fizică.</p></div>
            </td></tr>
          ) : clientiPF.map(c => (
            <tr key={c.id}>
              <td style={{ fontWeight: 500 }}>{c.nume}</td>
              <td style={{ color: 'var(--slate)', fontSize: 12 }}>{c.cnp || '—'}</td>
              <td style={{ fontSize: 13 }}>{c.telefon || '—'}</td>
              <td style={{ fontSize: 12 }}>
                {c.email
                  ? <a href={`mailto:${c.email}`} style={{ color: 'var(--blue)', textDecoration: 'none' }}>{c.email}</a>
                  : '—'
                }
              </td>
              <td style={{ color: 'var(--slate)', fontSize: 12 }}>{c.spatiu || '—'}</td>
              <td>
                <div style={{ display: 'flex', gap: 4 }}>
                  {c.email && <a href={`mailto:${c.email}`} className="btn btn-ghost btn-sm"><i className="ti ti-mail" /></a>}
                  {c.telefon && <a href={`tel:${c.telefon}`} className="btn btn-ghost btn-sm"><i className="ti ti-phone" /></a>}
                  {(c.whatsapp || c.telefon) && (
                    <a href={whatsappLink(c.whatsapp || c.telefon, `Bună ziua, ${c.nume}!`)}
                      target="_blank" rel="noreferrer" className="btn btn-success btn-sm">
                      <i className="ti ti-brand-whatsapp" />
                    </a>
                  )}
                </div>
              </td>
              <td>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => openEdit(c)}><i className="ti ti-pencil" /></button>
                  <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/clienti/${c.id}`)}>
                    <i className="ti ti-message-circle" />
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
  )

  return (
    <>
      <Topbar title="Clienți" subtitle="Gestionare chiriași și date de contact">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/import-clienti')}>
          <i className="ti ti-upload" /> Import FGO
        </button>
        <button className="btn btn-primary btn-sm" onClick={() => openAdd()}>
          <i className="ti ti-plus" /> Client nou
        </button>
      </Topbar>

      <div className="content">
        {/* Search */}
        <div className="toolbar" style={{ marginBottom: 16 }}>
          <input
            type="text" placeholder="Caută după nume, CUI, CNP, telefon, email…"
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ maxWidth: 360 }}
          />
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => openAdd('PJ')}>
              <i className="ti ti-building-store" /> Adaugă PJ
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => openAdd('PF')}>
              <i className="ti ti-user" /> Adaugă PF
            </button>
          </div>
        </div>

        {/* Tab-uri */}
        <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
          {[
            { key: 'PJ', icon: 'ti-building-store', label: `Persoane Juridice (${clientiPJ.length})` },
            { key: 'PF', icon: 'ti-user',            label: `Persoane Fizice (${clientiPF.length})` },
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

        {tab === 'PJ' ? <TabelPJ /> : <TabelPF />}
      </div>

      {/* ── Modal adăugare / editare ───────────────────────────── */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal-box" style={{ width: 640 }}>
            <div className="modal-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <h3>{modal === 'edit' ? 'Editează client' : 'Client nou'}</h3>
                {/* Tip selector în modal */}
                {modal === 'add' && (
                  <div style={{ display: 'flex', gap: 4 }}>
                    {['PJ', 'PF'].map(t => (
                      <button key={t} onClick={() => { setTipModal(t); setForm(t === 'PF' ? emptyFormPF() : emptyFormPJ()) }}
                        className={`btn btn-sm ${tipModal === t ? 'btn-primary' : 'btn-ghost'}`}>
                        {t === 'PJ' ? '🏢 Persoană Juridică' : '👤 Persoană Fizică'}
                      </button>
                    ))}
                  </div>
                )}
                {modal === 'edit' && (
                  <span className={`badge ${tipModal === 'PJ' ? 'badge-blue' : 'badge-green'}`}>
                    {tipModal === 'PJ' ? '🏢 Persoană Juridică' : '👤 Persoană Fizică'}
                  </span>
                )}
              </div>
              <button className="modal-close" onClick={closeModal}><i className="ti ti-x" /></button>
            </div>

            <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>

              {/* ── FORMULAR PJ ──────────────────────────────── */}
              {tipModal === 'PJ' && (
                <>
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--blue)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.5px' }}>
                      <i className="ti ti-building" /> Date firmă
                    </div>
                    <div className="form-grid">
                      <div className="form-group">
                        <label>Denumire firmă *</label>
                        <input value={form.nume} onChange={e => setField('nume', e.target.value)} placeholder="SC Alfa SRL" />
                      </div>
                      <div className="form-group">
                        <label>CUI</label>
                        <input value={form.cui || ''} onChange={e => setField('cui', e.target.value)} placeholder="RO12345678" />
                      </div>
                      <div className="form-group">
                        <label>Nr. Reg. Com.</label>
                        <input value={form.regCom || ''} onChange={e => setField('regCom', e.target.value)} placeholder="J40/1234/2020" />
                      </div>
                      <div className="form-group">
                        <label>Platitor TVA</label>
                        <select value={String(form.platitorTVA)} onChange={e => setField('platitorTVA', e.target.value === 'true' ? true : e.target.value === 'false' ? false : null)}>
                          <option value="null">Necunoscut</option>
                          <option value="true">Da — Platitor TVA</option>
                          <option value="false">Nu — Neplatitor TVA</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Bancă</label>
                        <input value={form.banca || ''} onChange={e => setField('banca', e.target.value)} placeholder="Banca Transilvania" />
                      </div>
                      <div className="form-group">
                        <label>IBAN</label>
                        <input value={form.iban || ''} onChange={e => setField('iban', e.target.value)} placeholder="RO49AAAA..." />
                      </div>
                      <div className="form-group full">
                        <label>Adresă sediu</label>
                        <input value={form.adresa} onChange={e => setField('adresa', e.target.value)} placeholder="Str. Exemplu, Nr. 1, București" />
                      </div>
                      <div className="form-group full">
                        <label>Spațiu închiriat</label>
                        <input value={form.spatiu || ''} onChange={e => setField('spatiu', e.target.value)} placeholder="ex. Et. 2 — Birou 204, 85 mp" />
                      </div>
                    </div>
                  </div>

                  {/* Persoane de contact */}
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--blue)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.5px', display: 'flex', justifyContent: 'space-between' }}>
                      <span><i className="ti ti-users" /> Persoane de contact</span>
                      <button className="btn btn-ghost btn-sm" onClick={addContact}><i className="ti ti-plus" /> Adaugă persoană</button>
                    </div>
                    {form.contacte.map((ct, i) => (
                      <div key={i} style={{ background: 'var(--slate-light)', borderRadius: 'var(--radius-sm)', padding: 12, marginBottom: 10, border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate)' }}>Persoana {i + 1}</span>
                          {form.contacte.length > 1 && <button className="remove-btn" onClick={() => removeContact(i)}><i className="ti ti-x" /></button>}
                        </div>
                        <div className="form-grid" style={{ gap: 10 }}>
                          <div className="form-group"><label>Nume</label><input value={ct.nume} onChange={e => setContact(i, 'nume', e.target.value)} placeholder="Ion Popescu" /></div>
                          <div className="form-group"><label>Funcție</label><input value={ct.functie} onChange={e => setContact(i, 'functie', e.target.value)} placeholder="Director / Contabil" /></div>
                          <div className="form-group"><label>Telefon</label><input value={ct.telefon} onChange={e => setContact(i, 'telefon', e.target.value)} placeholder="07xx xxx xxx" /></div>
                          <div className="form-group"><label>WhatsApp</label><input value={ct.whatsapp} onChange={e => setContact(i, 'whatsapp', e.target.value)} placeholder="07xx xxx xxx" /></div>
                          <div className="form-group full">
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                              <input type="checkbox" checked={ct.trimiteMesaj} onChange={e => setContact(i, 'trimiteMesaj', e.target.checked)} style={{ width: 16, height: 16 }} />
                              <span>Trimite WhatsApp acestei persoane</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Emailuri */}
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--blue)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.5px', display: 'flex', justifyContent: 'space-between' }}>
                      <span><i className="ti ti-mail" /> Adrese email</span>
                      <button className="btn btn-ghost btn-sm" onClick={addEmail}><i className="ti ti-plus" /> Adaugă email</button>
                    </div>
                    {form.emailuri.map((em, i) => (
                      <div key={i} style={{ background: 'var(--slate-light)', borderRadius: 'var(--radius-sm)', padding: 12, marginBottom: 10, border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                            <label>Email {i + 1}</label>
                            <input type="email" value={em.adresa} onChange={e => setEmailField(i, 'adresa', e.target.value)} placeholder="contabilitate@firma.ro" />
                          </div>
                          {form.emailuri.length > 1 && <button className="remove-btn" onClick={() => removeEmail(i)} style={{ marginTop: 18 }}><i className="ti ti-x" /></button>}
                        </div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 8, fontSize: 13 }}>
                          <input type="checkbox" checked={em.trimiteMail} onChange={e => setEmailField(i, 'trimiteMail', e.target.checked)} style={{ width: 16, height: 16 }} />
                          <span>Trimite facturile la această adresă</span>
                          {em.trimiteMail && <span style={{ color: 'var(--green)', fontSize: 11 }}>● Activ</span>}
                        </label>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* ── FORMULAR PF ──────────────────────────────── */}
              {tipModal === 'PF' && (
                <>
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--blue)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.5px' }}>
                      <i className="ti ti-user" /> Date personale
                    </div>
                    <div className="form-grid">
                      <div className="form-group full">
                        <label>Nume complet *</label>
                        <input value={form.nume} onChange={e => setField('nume', e.target.value)} placeholder="Ion Popescu" />
                      </div>
                      <div className="form-group">
                        <label>CNP</label>
                        <input value={form.cnp || ''} onChange={e => setField('cnp', e.target.value)} placeholder="1234567890123" maxLength={13} />
                      </div>
                      <div className="form-group">
                        <label>Telefon</label>
                        <input value={form.telefon || ''} onChange={e => setField('telefon', e.target.value)} placeholder="07xx xxx xxx" />
                      </div>
                      <div className="form-group">
                        <label>Email</label>
                        <input type="email" value={form.email || ''} onChange={e => setField('email', e.target.value)} placeholder="ion.popescu@gmail.com" />
                      </div>
                      <div className="form-group">
                        <label>WhatsApp (dacă diferit de telefon)</label>
                        <input value={form.whatsapp || ''} onChange={e => setField('whatsapp', e.target.value)} placeholder="07xx xxx xxx" />
                      </div>
                      <div className="form-group full">
                        <label>Adresă domiciliu</label>
                        <input value={form.adresa} onChange={e => setField('adresa', e.target.value)} placeholder="Str. Exemplu, Nr. 1, Ploiești" />
                      </div>
                      <div className="form-group full">
                        <label>Spațiu închiriat</label>
                        <input value={form.spatiu || ''} onChange={e => setField('spatiu', e.target.value)} placeholder="ex. Apartament 3, Et. 2" />
                      </div>
                    </div>
                  </div>
                </>
              )}

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
