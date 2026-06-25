import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Topbar from '../components/Topbar'
import { getClienti, addClient, deleteClient } from '../firebase/firestore'
import { useToast } from '../components/Toast'
import { whatsappLink } from '../utils'

const SPATII = [
  'Et. 1 — Birou A (120 mp)',
  'Et. 1 — Birou B (85 mp)',
  'Et. 2 — Spațiu comercial A',
  'Et. 2 — Spațiu comercial B',
  'Parter — Recepție',
]

const EMPTY = { nume: '', cui: '', regCom: '', email: '', telefon: '', whatsapp: '', adresa: '', spatiu: SPATII[0] }

export default function Clienti() {
  const navigate = useNavigate()
  const toast    = useToast()
  const [clienti, setClienti] = useState([])
  const [modal,   setModal]   = useState(false)
  const [form,    setForm]    = useState(EMPTY)
  const [saving,  setSaving]  = useState(false)
  const [search,  setSearch]  = useState('')

  const load = () => getClienti().then(setClienti)
  useEffect(() => { load() }, [])

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSave = async () => {
    if (!form.nume || !form.email) { toast('Completează numele și emailul.', 'error'); return }
    setSaving(true)
    try {
      await addClient(form)
      toast('Client adăugat!')
      setModal(false)
      setForm(EMPTY)
      load()
    } catch { toast('Eroare la salvare.', 'error') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id, nume) => {
    if (!confirm(`Ștergi clientul "${nume}"?`)) return
    await deleteClient(id)
    toast('Client șters.')
    load()
  }

  const filtered = clienti.filter(c =>
    c.nume?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <Topbar title="Clienți" subtitle="Gestionare chiriași și date de contact">
        <button className="btn btn-primary btn-sm" onClick={() => setModal(true)}>
          <i className="ti ti-plus" aria-hidden="true" /> Client nou
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
                <th>Denumire</th><th>CUI</th><th>Spațiu</th>
                <th>Email</th><th>Telefon</th><th>Contact rapid</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7}><div className="empty">
                  <i className="ti ti-users" />
                  <p>Niciun client. Adaugă primul chiriaș.</p>
                </div></td></tr>
              ) : filtered.map(c => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 500 }}>{c.nume}</td>
                  <td style={{ color: 'var(--slate)', fontSize: 12 }}>{c.cui}</td>
                  <td style={{ color: 'var(--slate)' }}>{c.spatiu}</td>
                  <td>
                    <a href={`mailto:${c.email}`} style={{ color: 'var(--blue)', textDecoration: 'none', fontSize: 13 }}>
                      {c.email}
                    </a>
                  </td>
                  <td>
                    <a href={`tel:${c.telefon}`} style={{ color: 'var(--slate)', textDecoration: 'none', fontSize: 13 }}>
                      {c.telefon}
                    </a>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <a
                        href={`mailto:${c.email}`}
                        className="btn btn-ghost btn-sm"
                        title="Trimite email"
                      ><i className="ti ti-mail" aria-hidden="true" /></a>
                      <a
                        href={`tel:${c.telefon}`}
                        className="btn btn-ghost btn-sm"
                        title="Sună"
                      ><i className="ti ti-phone" aria-hidden="true" /></a>
                      {c.whatsapp && (
                        <a
                          href={whatsappLink(c.whatsapp, `Bună ziua, ${c.nume}!`)}
                          target="_blank" rel="noreferrer"
                          className="btn btn-ghost btn-sm"
                          title="WhatsApp"
                        ><i className="ti ti-brand-whatsapp" aria-hidden="true" /></a>
                      )}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/clienti/${c.id}`)}>
                        <i className="ti ti-message-circle" aria-hidden="true" /> Conversație
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(c.id, c.nume)}>
                        <i className="ti ti-trash" aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal adaugare client */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal-box">
            <div className="modal-head">
              <h3>Client nou</h3>
              <button className="modal-close" onClick={() => setModal(false)}>
                <i className="ti ti-x" />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Denumire firmă / Nume *</label>
                  <input value={form.nume} onChange={set('nume')} placeholder="SC Alfa SRL" />
                </div>
                <div className="form-group">
                  <label>CUI</label>
                  <input value={form.cui} onChange={set('cui')} placeholder="RO12345678" />
                </div>
                <div className="form-group">
                  <label>Nr. Reg. Com.</label>
                  <input value={form.regCom} onChange={set('regCom')} placeholder="J40/1234/2020" />
                </div>
                <div className="form-group">
                  <label>Email *</label>
                  <input type="email" value={form.email} onChange={set('email')} placeholder="conta@firma.ro" />
                </div>
                <div className="form-group">
                  <label>Telefon</label>
                  <input value={form.telefon} onChange={set('telefon')} placeholder="07xx xxx xxx" />
                </div>
                <div className="form-group">
                  <label>WhatsApp (număr)</label>
                  <input value={form.whatsapp} onChange={set('whatsapp')} placeholder="07xx xxx xxx" />
                </div>
                <div className="form-group">
                  <label>Spațiu închiriat</label>
                  <select value={form.spatiu} onChange={set('spatiu')}>
                    {SPATII.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group full">
                  <label>Adresă</label>
                  <input value={form.adresa} onChange={set('adresa')} placeholder="Str. Exemplu, Nr. 1, București" />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModal(false)}>Anulează</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Se salvează…' : 'Salvează client'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
