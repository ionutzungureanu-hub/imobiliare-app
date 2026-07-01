import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Topbar from '../components/Topbar'
import { getClienti, addClient, updateClient, deleteClient, toggleClientActiv, getSpatii } from '../firebase/firestore'
import { useToast } from '../components/Toast'
import { whatsappLink } from '../utils'

const emptyContact = () => ({ nume: '', functie: '', telefon: '', whatsapp: '', trimiteMesaj: false })
const emptyEmail   = () => ({ adresa: '', trimiteMail: false })

const emptyFormPJ = () => ({
  tip: 'PJ', activ: true, nume: '', cui: '', regCom: '', adresa: '',
  platitorTVA: null, banca: '', iban: '', spatiu: '', spatiuId: '',
  contacte: [emptyContact()], emailuri: [emptyEmail()],
})
const emptyFormPF = () => ({
  tip: 'PF', activ: true, nume: '', cnp: '', adresa: '',
  telefon: '', email: '', whatsapp: '', spatiu: '', spatiuId: '',
  contacte: [emptyContact()], emailuri: [emptyEmail()],
})

// ── Toggle activ button ───────────────────────────────────────
function ToggleActiv({ client, onToggle }) {
  const [loading, setLoading] = useState(false)
  const toast = useToast()
  const handle = async (e) => {
    e.stopPropagation()
    setLoading(true)
    try {
      await toggleClientActiv(client.id, !client.activ, client.spatiuId || null)
      toast(client.activ ? 'Client dezactivat — spațiu eliberat.' : 'Client reactivat!')
      onToggle()
    } catch { toast('Eroare.', 'error') }
    finally { setLoading(false) }
  }
  return (
    <button
      className={`btn btn-sm ${client.activ !== false ? 'btn-ghost' : 'btn-ghost'}`}
      onClick={handle} disabled={loading}
      title={client.activ !== false ? 'Dezactivează client' : 'Reactivează client'}
      style={{ color: client.activ !== false ? 'var(--green)' : 'var(--slate)', padding: '4px 8px' }}
    >
      <i className={`ti ${client.activ !== false ? 'ti-toggle-right' : 'ti-toggle-left'}`} style={{ fontSize: 18 }} />
    </button>
  )
}

// ── Separator activi/inactivi ─────────────────────────────────
function SeparatorInactivi({ count }) {
  return (
    <tr>
      <td colSpan={20} style={{ padding: '8px 16px', background: 'var(--slate-light)', borderTop: '2px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 600, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '.5px' }}>
          <i className="ti ti-archive" style={{ fontSize: 13 }} />
          Arhivă — Inactivi ({count})
        </div>
      </td>
    </tr>
  )
}

export default function Clienti() {
  const navigate = useNavigate()
  const toast    = useToast()

  const [clienti,  setClienti]  = useState([])
  const [spatii,   setSpatii]   = useState([])
  const [tab,      setTab]      = useState('PJ')
  const [modal,    setModal]    = useState(false)
  const [tipModal, setTipModal] = useState('PJ')
  const [editId,   setEditId]   = useState(null)
  const [form,     setForm]     = useState(emptyFormPJ())
  const [saving,   setSaving]   = useState(false)
  const [search,   setSearch]   = useState('')

  const load = async () => {
    const [cl, sp] = await Promise.all([getClienti(), getSpatii()])
    setClienti(cl)
    setSpatii(sp)
  }
  useEffect(() => { load() }, [])

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const setContact    = (i, k, v) => setForm(f => { const a = [...f.contacte]; a[i] = { ...a[i], [k]: v }; return { ...f, contacte: a } })
  const addContact    = () => setForm(f => ({ ...f, contacte: [...f.contacte, emptyContact()] }))
  const removeContact = i  => setForm(f => ({ ...f, contacte: f.contacte.filter((_, idx) => idx !== i) }))
  const setEmailField = (i, k, v) => setForm(f => { const a = [...f.emailuri]; a[i] = { ...a[i], [k]: v }; return { ...f, emailuri: a } })
  const addEmail      = () => setForm(f => ({ ...f, emailuri: [...f.emailuri, emptyEmail()] }))
  const removeEmail   = i  => setForm(f => ({ ...f, emailuri: f.emailuri.filter((_, idx) => idx !== i) }))

  const openAdd = (tip = tab) => {
    setTipModal(tip)
    setForm(tip === 'PF' ? emptyFormPF() : emptyFormPJ())
    setEditId(null); setModal('add')
  }
  const openEdit = (c) => {
    setTipModal(c.tip || 'PJ')
    setForm({
      tip: c.tip || 'PJ', activ: c.activ !== false,
      nume: c.nume || '', cui: c.cui || '', cnp: c.cnp || '',
      regCom: c.regCom || '', adresa: c.adresa || '',
      platitorTVA: c.platitorTVA ?? null, banca: c.banca || '', iban: c.iban || '',
      telefon: c.telefon || '', email: c.email || '', whatsapp: c.whatsapp || '',
      spatiu: c.spatiu || '', spatiuId: c.spatiuId || '',
      contacte: c.contacte?.length ? c.contacte : [emptyContact()],
      emailuri: c.emailuri?.length ? c.emailuri : [emptyEmail()],
    })
    setEditId(c.id); setModal('edit')
  }
  const closeModal = () => { setModal(false); setEditId(null) }

  const handleSave = async () => {
    if (!form.nume) { toast('Completează numele.', 'error'); return }
    setSaving(true)
    try {
      const data = {
        ...form,
        email:   form.tip === 'PJ'
          ? (form.emailuri.find(e => e.trimiteMail)?.adresa || form.emailuri[0]?.adresa || '')
          : form.email,
        telefon: form.tip === 'PJ' ? (form.contacte[0]?.telefon || '') : form.telefon,
        activ:   form.activ !== false,
      }
      if (modal === 'edit') { await updateClient(editId, data); toast('Client actualizat!') }
      else { await addClient(data); toast('Client adăugat!') }
      closeModal(); load()
    } catch { toast('Eroare la salvare.', 'error') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id, nume) => {
    if (!confirm(`Ștergi definitiv clientul "${nume}"?\nAceastă acțiune nu poate fi anulată.`)) return
    await deleteClient(id); toast('Client șters.'); load()
  }

  const filterFn = c =>
    !search ||
    c.nume?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()) ||
    c.cui?.includes(search) || c.cnp?.includes(search) ||
    c.telefon?.includes(search)

  const clientiPJ = clienti.filter(c => (c.tip || 'PJ') === 'PJ' && filterFn(c))
  const clientiPF = clienti.filter(c => c.tip === 'PF' && filterFn(c))

  const activiPJ   = clientiPJ.filter(c => c.activ !== false)
  const inactiviPJ = clientiPJ.filter(c => c.activ === false)
  const activiPF   = clientiPF.filter(c => c.activ !== false)
  const inactiviPF = clientiPF.filter(c => c.activ === false)

  // ── Row PJ ───────────────────────────────────────────────────
  const RowPJ = ({ c }) => (
    <tr key={c.id} style={{ opacity: c.activ === false ? 0.55 : 1 }}>
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ToggleActiv client={c} onToggle={load} />
          <div>
            <div style={{ fontWeight: 500 }}>{c.nume}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
              {/* Email(uri) principale sub nume */}
              {(c.emailuri?.length ? c.emailuri : c.email ? [{ adresa: c.email, trimiteMail: true }] : [])
                .filter(e => e.adresa)
                .map((em, i) => (
                  <a key={i} href={`mailto:${em.adresa}`}
                    style={{ fontSize: 11, color: 'var(--blue)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
                    <i className="ti ti-mail" style={{ fontSize: 11 }} />{em.adresa}
                  </a>
                ))
              }
            </div>
          </div>
        </div>
      </td>
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
          <div key={i} style={{ fontSize: 12, marginBottom: 2 }}>
            <span style={{ fontWeight: 500 }}>{ct.nume}</span>
            {ct.functie && <span style={{ color: 'var(--slate)' }}> — {ct.functie}</span>}
            <div style={{ display: 'flex', gap: 3, marginTop: 2 }}>
              {ct.telefon && <a href={`tel:${ct.telefon}`} className="btn btn-ghost btn-sm" style={{ padding: '2px 5px' }}><i className="ti ti-phone" style={{ fontSize: 11 }} /></a>}
              {ct.trimiteMesaj && (ct.whatsapp || ct.telefon) && (
                <a href={whatsappLink(ct.whatsapp || ct.telefon, `Bună ziua${ct.nume ? ', ' + ct.nume : ''}!`)}
                  target="_blank" rel="noreferrer" className="btn btn-success btn-sm" style={{ padding: '2px 5px' }}>
                  <i className="ti ti-brand-whatsapp" style={{ fontSize: 11 }} />
                </a>
              )}
            </div>
          </div>
        ))}
      </td>

      <td>
        <div style={{ display: 'flex', gap: 4 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(c)}><i className="ti ti-pencil" /></button>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/clienti/${c.id}`)}><i className="ti ti-message-circle" /></button>
          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(c.id, c.nume)}><i className="ti ti-trash" /></button>
        </div>
      </td>
    </tr>
  )

  // ── Row PF ───────────────────────────────────────────────────
  const RowPF = ({ c }) => (
    <tr key={c.id} style={{ opacity: c.activ === false ? 0.55 : 1 }}>
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ToggleActiv client={c} onToggle={load} />
          <div>
            <div style={{ fontWeight: 500 }}>{c.nume}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
              {c.telefon && (
                <a href={`tel:${c.telefon}`} style={{ fontSize: 11, color: 'var(--slate)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <i className="ti ti-phone" style={{ fontSize: 11 }} />{c.telefon}
                </a>
              )}
              {c.email && (
                <a href={`mailto:${c.email}`} style={{ fontSize: 11, color: 'var(--blue)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <i className="ti ti-mail" style={{ fontSize: 11 }} />{c.email}
                </a>
              )}
              {(c.whatsapp || c.telefon) && (
                <a href={whatsappLink(c.whatsapp || c.telefon, `Bună ziua, ${c.nume}!`)} target="_blank" rel="noreferrer"
                  style={{ fontSize: 11, color: '#16a34a', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <i className="ti ti-brand-whatsapp" style={{ fontSize: 11 }} />WA
                </a>
              )}
            </div>
          </div>
        </div>
      </td>
      <td style={{ color: 'var(--slate)', fontSize: 12 }}>{c.cnp || '—'}</td>
      <td style={{ fontSize: 13 }}>{c.telefon || '—'}</td>
      <td style={{ color: 'var(--slate)', fontSize: 12 }}>{c.spatiu || '—'}</td>
      <td>
        <div style={{ display: 'flex', gap: 4 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/nota-calcul?clientId=${c.id}`)} title="Notă calcul">
            <i className="ti ti-calculator" />
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(c)}><i className="ti ti-pencil" /></button>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/clienti/${c.id}`)}><i className="ti ti-message-circle" /></button>
          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(c.id, c.nume)}><i className="ti ti-trash" /></button>
        </div>
      </td>
    </tr>
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
        <div className="toolbar" style={{ marginBottom: 16 }}>
          <input type="text" placeholder="Caută după nume, CUI, CNP, telefon, email…"
            value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 360 }} />
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
            { key: 'PJ', icon: 'ti-building-store', label: `Persoane Juridice`, activi: activiPJ.length, inactivi: inactiviPJ.length },
            { key: 'PF', icon: 'ti-user',            label: `Persoane Fizice`,  activi: activiPF.length, inactivi: inactiviPF.length },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: '9px 20px', fontSize: 13, fontWeight: 500, border: 'none', background: 'none',
              cursor: 'pointer', borderBottom: `2px solid ${tab === t.key ? 'var(--blue)' : 'transparent'}`,
              color: tab === t.key ? 'var(--blue)' : 'var(--slate)', marginBottom: -1,
              display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit'
            }}>
              <i className={`ti ${t.icon}`} />
              {t.label}
              <span className="badge badge-green" style={{ fontSize: 10 }}>{t.activi} activi</span>
              {t.inactivi > 0 && <span className="badge badge-gray" style={{ fontSize: 10 }}>{t.inactivi} arhivă</span>}
            </button>
          ))}
        </div>

        {/* Tabel PJ */}
        {tab === 'PJ' && (
          <div className="card">
            <table>
              <thead>
                <tr><th>Denumire</th><th>CUI</th><th>TVA</th><th>Contacte</th><th></th></tr>
              </thead>
              <tbody>
                {activiPJ.length === 0 && inactiviPJ.length === 0 ? (
                  <tr><td colSpan={7}><div className="empty"><i className="ti ti-building-store" /><p>Nicio persoană juridică.</p></div></td></tr>
                ) : (
                  <>
                    {activiPJ.map(c => <RowPJ key={c.id} c={c} />)}
                    {inactiviPJ.length > 0 && (
                      <>
                        <SeparatorInactivi count={inactiviPJ.length} />
                        {inactiviPJ.map(c => <RowPJ key={c.id} c={c} />)}
                      </>
                    )}
                  </>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tabel PF */}
        {tab === 'PF' && (
          <div className="card">
            <table>
              <thead>
                <tr><th>Nume</th><th>CNP</th><th>Telefon</th><th>Spațiu</th><th></th></tr>
              </thead>
              <tbody>
                {activiPF.length === 0 && inactiviPF.length === 0 ? (
                  <tr><td colSpan={7}><div className="empty"><i className="ti ti-user" /><p>Nicio persoană fizică.</p></div></td></tr>
                ) : (
                  <>
                    {activiPF.map(c => <RowPF key={c.id} c={c} />)}
                    {inactiviPF.length > 0 && (
                      <>
                        <SeparatorInactivi count={inactiviPF.length} />
                        {inactiviPF.map(c => <RowPF key={c.id} c={c} />)}
                      </>
                    )}
                  </>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal ─────────────────────────────────────────────── */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal-box" style={{ width: 640 }}>
            <div className="modal-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h3>{modal === 'edit' ? 'Editează client' : 'Client nou'}</h3>
                {modal === 'add' ? (
                  <div style={{ display: 'flex', gap: 4 }}>
                    {['PJ', 'PF'].map(t => (
                      <button key={t} onClick={() => { setTipModal(t); setForm(t === 'PF' ? emptyFormPF() : emptyFormPJ()) }}
                        className={`btn btn-sm ${tipModal === t ? 'btn-primary' : 'btn-ghost'}`}>
                        {t === 'PJ' ? '🏢 PJ' : '👤 PF'}
                      </button>
                    ))}
                  </div>
                ) : (
                  <span className={`badge ${tipModal === 'PJ' ? 'badge-blue' : 'badge-green'}`}>
                    {tipModal === 'PJ' ? '🏢 Persoană Juridică' : '👤 Persoană Fizică'}
                  </span>
                )}
                {/* Toggle activ în modal */}
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginLeft: 8, fontSize: 13 }}>
                  <input type="checkbox" checked={form.activ !== false}
                    onChange={e => setField('activ', e.target.checked)}
                    style={{ width: 16, height: 16 }} />
                  <span style={{ color: form.activ !== false ? 'var(--green)' : 'var(--slate)', fontWeight: 500 }}>
                    {form.activ !== false ? '● Activ' : '○ Inactiv'}
                  </span>
                </label>
              </div>
              <button className="modal-close" onClick={closeModal}><i className="ti ti-x" /></button>
            </div>

            <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>

              {/* FORMULAR PJ */}
              {tipModal === 'PJ' && (
                <>
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--blue)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.5px' }}>
                      <i className="ti ti-building" /> Date firmă
                    </div>
                    <div className="form-grid">
                      <div className="form-group"><label>Denumire firmă *</label><input value={form.nume} onChange={e => setField('nume', e.target.value)} placeholder="SC Alfa SRL" /></div>
                      <div className="form-group"><label>CUI</label><input value={form.cui || ''} onChange={e => setField('cui', e.target.value)} placeholder="RO12345678" /></div>
                      <div className="form-group"><label>Nr. Reg. Com.</label><input value={form.regCom || ''} onChange={e => setField('regCom', e.target.value)} placeholder="J40/1234/2020" /></div>
                      <div className="form-group">
                        <label>Platitor TVA</label>
                        <select value={String(form.platitorTVA)} onChange={e => setField('platitorTVA', e.target.value === 'true' ? true : e.target.value === 'false' ? false : null)}>
                          <option value="null">Necunoscut</option>
                          <option value="true">Da — Platitor TVA</option>
                          <option value="false">Nu — Neplatitor TVA</option>
                        </select>
                      </div>
                      <div className="form-group"><label>Bancă</label><input value={form.banca || ''} onChange={e => setField('banca', e.target.value)} placeholder="Banca Transilvania" /></div>
                      <div className="form-group"><label>IBAN</label><input value={form.iban || ''} onChange={e => setField('iban', e.target.value)} placeholder="RO49AAAA..." /></div>
                      <div className="form-group full"><label>Adresă sediu</label><input value={form.adresa} onChange={e => setField('adresa', e.target.value)} placeholder="Str. Exemplu, Nr. 1" /></div>
                      <div className="form-group full"><label>Spațiu închiriat</label><input value={form.spatiu || ''} onChange={e => setField('spatiu', e.target.value)} placeholder="ex. Et. 2 — Birou 204" /></div>
                    </div>
                  </div>

                  {/* Contacte */}
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--blue)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.5px', display: 'flex', justifyContent: 'space-between' }}>
                      <span><i className="ti ti-users" /> Persoane de contact</span>
                      <button className="btn btn-ghost btn-sm" onClick={addContact}><i className="ti ti-plus" /> Adaugă</button>
                    </div>
                    {form.contacte.map((ct, i) => (
                      <div key={i} style={{ background: 'var(--slate-light)', borderRadius: 8, padding: 12, marginBottom: 10, border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate)' }}>Persoana {i + 1}</span>
                          {form.contacte.length > 1 && <button className="remove-btn" onClick={() => removeContact(i)}><i className="ti ti-x" /></button>}
                        </div>
                        <div className="form-grid" style={{ gap: 10 }}>
                          <div className="form-group"><label>Nume</label><input value={ct.nume} onChange={e => setContact(i, 'nume', e.target.value)} placeholder="Ion Popescu" /></div>
                          <div className="form-group"><label>Funcție</label><input value={ct.functie} onChange={e => setContact(i, 'functie', e.target.value)} placeholder="Director" /></div>
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
                      <button className="btn btn-ghost btn-sm" onClick={addEmail}><i className="ti ti-plus" /> Adaugă</button>
                    </div>
                    {form.emailuri.map((em, i) => (
                      <div key={i} style={{ background: 'var(--slate-light)', borderRadius: 8, padding: 12, marginBottom: 10, border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                            <label>Email {i + 1}</label>
                            <input type="email" value={em.adresa} onChange={e => setEmailField(i, 'adresa', e.target.value)} placeholder="office@firma.ro" />
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

              {/* FORMULAR PF */}
              {tipModal === 'PF' && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--blue)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.5px' }}>
                    <i className="ti ti-user" /> Date personale
                  </div>
                  <div className="form-grid">
                    <div className="form-group full"><label>Nume complet *</label><input value={form.nume} onChange={e => setField('nume', e.target.value)} placeholder="Ion Popescu" /></div>
                    <div className="form-group"><label>CNP</label><input value={form.cnp || ''} onChange={e => setField('cnp', e.target.value)} placeholder="1234567890123" maxLength={13} /></div>
                    <div className="form-group"><label>Telefon</label><input value={form.telefon || ''} onChange={e => setField('telefon', e.target.value)} placeholder="07xx xxx xxx" /></div>
                    <div className="form-group"><label>Email</label><input type="email" value={form.email || ''} onChange={e => setField('email', e.target.value)} placeholder="ion.popescu@gmail.com" /></div>
                    <div className="form-group"><label>WhatsApp (dacă diferit)</label><input value={form.whatsapp || ''} onChange={e => setField('whatsapp', e.target.value)} placeholder="07xx xxx xxx" /></div>
                    <div className="form-group full"><label>Adresă domiciliu</label><input value={form.adresa} onChange={e => setField('adresa', e.target.value)} placeholder="Str. Exemplu, Nr. 1, Ploiești" /></div>
                    <div className="form-group full"><label>Spațiu închiriat</label><input value={form.spatiu || ''} onChange={e => setField('spatiu', e.target.value)} placeholder="ex. Apartament 3, Et. 2" /></div>
                  </div>
                </div>
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
