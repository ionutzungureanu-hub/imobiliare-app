import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Topbar from '../../../shared/components/Topbar'
import { useToast } from '../../../shared/components/Toast'
import { useAuth } from '../../../shared/context/AuthContext'
import { getClient, getEmailuriClient, getNoteClient, addNota, saveEmail } from '../../../shared/firebase/firestore'
import { trimiteMesaj } from '../../../shared/services/emailService'
import { fmtDate, whatsappLink } from '../../../shared/utils'

export default function ClientDetail() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const toast    = useToast()
  const { user } = useAuth()

  const [client,   setClient]   = useState(null)
  const [emailuri, setEmailuri] = useState([])
  const [note,     setNote]     = useState([])
  const [tab,      setTab]      = useState('conversatie') // conversatie | email
  const [notaText, setNotaText] = useState('')
  const [mailForm, setMailForm] = useState({ subiect: '', mesaj: '' })
  const [sending,  setSending]  = useState(false)

  const loadData = async () => {
    const [c, e, n] = await Promise.all([
      getClient(id),
      getEmailuriClient(id),
      getNoteClient(id),
    ])
    setClient(c)
    setEmailuri(e)
    setNote(n)
  }

  useEffect(() => { loadData() }, [id])

  // Combina emailuri + note sortate dupa timp
  const conversatie = [
    ...emailuri.map(e => ({ ...e, _tip: 'email' })),
    ...note.map(n => ({ ...n, _tip: 'nota' })),
  ].sort((a, b) => {
    const ta = a.trimisLa?.seconds || a.creatLa?.seconds || 0
    const tb = b.trimisLa?.seconds || b.creatLa?.seconds || 0
    return ta - tb
  })

  const handleAddNota = async () => {
    if (!notaText.trim()) return
    await addNota(id, notaText, user.email)
    toast('Notă adăugată.')
    setNotaText('')
    loadData()
  }

  const handleSendEmail = async () => {
    if (!mailForm.subiect || !mailForm.mesaj) {
      toast('Completează subiectul și mesajul.', 'error')
      return
    }
    setSending(true)
    try {
      await trimiteMesaj({
        toEmail: client.email,
        toName:  client.nume,
        subiect: mailForm.subiect,
        mesaj:   mailForm.mesaj,
      })
      await saveEmail({
        clientId: id,
        toEmail:  client.email,
        subiect:  mailForm.subiect,
        mesaj:    mailForm.mesaj,
        trimisde: user.email,
        tip:      'mesaj',
      })
      toast(`Email trimis către ${client.email}!`)
      setMailForm({ subiect: '', mesaj: '' })
      setTab('conversatie')
      loadData()
    } catch (err) {
      toast('Eroare la trimiterea emailului. Verifică configurarea EmailJS.', 'error')
    } finally {
      setSending(false)
    }
  }

  if (!client) return <div className="content" style={{ paddingTop: 48, textAlign: 'center', color: 'var(--slate)' }}>Se încarcă…</div>

  return (
    <>
      <Topbar title={client.nume} subtitle={client.spatiu}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/clienti')}>
          <i className="ti ti-arrow-left" aria-hidden="true" /> Înapoi
        </button>
        <button className="btn btn-primary btn-sm" onClick={() => navigate(`/emite?clientId=${id}`)}>
          <i className="ti ti-file-plus" aria-hidden="true" /> Emite factură
        </button>
      </Topbar>

      <div className="content">
        <div className="two-col-3">

          {/* Coloana stânga — conversație */}
          <div>
            {/* Tab-uri */}
            <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
              {[['conversatie', 'Conversație'], ['email', 'Email nou']].map(([k, l]) => (
                <button
                  key={k}
                  onClick={() => setTab(k)}
                  style={{
                    padding: '9px 18px', fontSize: 13, fontWeight: 500, border: 'none', background: 'none',
                    cursor: 'pointer', borderBottom: `2px solid ${tab === k ? 'var(--blue)' : 'transparent'}`,
                    color: tab === k ? 'var(--blue)' : 'var(--slate)', marginBottom: -1,
                  }}
                >{l}</button>
              ))}
            </div>

            {/* Conversație */}
            {tab === 'conversatie' && (
              <div className="card">
                <div className="card-body">
                  {conversatie.length === 0 ? (
                    <div className="empty">
                      <i className="ti ti-messages" />
                      <p>Nicio comunicare înregistrată încă.</p>
                    </div>
                  ) : (
                    <div className="chat-wrap">
                      {conversatie.map((item, i) => (
                        <div key={i} className={`chat-msg ${item._tip === 'nota' ? 'note' : 'sent'}`}>
                          {item._tip === 'email' ? (
                            <>
                              <div style={{ fontSize: 11, color: 'var(--slate)', marginBottom: 3 }}>
                                <i className="ti ti-mail" style={{ fontSize: 12, marginRight: 3 }} />
                                Email trimis → {item.toEmail}
                              </div>
                              <div className="chat-bubble">
                                <div style={{ fontWeight: 500, marginBottom: 4, fontSize: 12 }}>{item.subiect}</div>
                                <div style={{ whiteSpace: 'pre-wrap' }}>{item.mesaj}</div>
                              </div>
                              <div className="chat-meta">{fmtDate(item.trimisLa)} · {item.trimisde}</div>
                            </>
                          ) : (
                            <>
                              <div style={{ fontSize: 11, color: 'var(--slate)', marginBottom: 3 }}>
                                <i className="ti ti-pencil" style={{ fontSize: 12, marginRight: 3 }} />
                                Notă internă
                              </div>
                              <div className="chat-bubble">{item.text}</div>
                              <div className="chat-meta">{fmtDate(item.creatLa)} · {item.autor}</div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Adaugă notă */}
                  <div style={{ borderTop: '1px solid var(--border)', marginTop: 16, paddingTop: 16 }}>
                    <div style={{ fontSize: 12, color: 'var(--slate)', marginBottom: 6 }}>Adaugă notă internă</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <textarea
                        style={{ flex: 1, minHeight: 52 }}
                        placeholder="Notă despre această conversație…"
                        value={notaText}
                        onChange={e => setNotaText(e.target.value)}
                      />
                      <button className="btn btn-ghost" onClick={handleAddNota} style={{ alignSelf: 'flex-end' }}>
                        <i className="ti ti-send" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Email nou */}
            {tab === 'email' && (
              <div className="card">
                <div className="card-body">
                  <div className="alert alert-info">
                    <i className="ti ti-info-circle" aria-hidden="true" />
                    <span>Emailul va fi trimis din <strong>kado.excelsior@yahoo.com</strong> către <strong>{client.email}</strong>. Răspunsurile clientului ajung în Yahoo Mail.</span>
                  </div>
                  <div className="form-group" style={{ marginBottom: 12 }}>
                    <label>Subiect</label>
                    <input
                      value={mailForm.subiect}
                      onChange={e => setMailForm(f => ({ ...f, subiect: e.target.value }))}
                      placeholder="ex. Factură chirie iunie 2025"
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 16 }}>
                    <label>Mesaj</label>
                    <textarea
                      style={{ minHeight: 140 }}
                      value={mailForm.mesaj}
                      onChange={e => setMailForm(f => ({ ...f, mesaj: e.target.value }))}
                      placeholder={`Bună ziua, ${client.nume},\n\n`}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                    <button className="btn btn-ghost" onClick={() => setTab('conversatie')}>Anulează</button>
                    <button className="btn btn-primary" onClick={handleSendEmail} disabled={sending}>
                      <i className="ti ti-send" aria-hidden="true" />
                      {sending ? 'Se trimite…' : 'Trimite email'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Coloana dreapta — date contact */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="card">
              <div className="card-header"><div className="card-title">Date contact</div></div>
              <div className="card-body" style={{ fontSize: 13 }}>
                <table style={{ width: '100%' }}>
                  <tbody>
                    <InfoRow icon="ti-id-badge" label="CUI" val={client.cui} />
                    <InfoRow icon="ti-file-text" label="Reg. Com." val={client.regCom} />
                    <InfoRow icon="ti-building-store" label="Spațiu" val={client.spatiu} />
                    <InfoRow icon="ti-map-pin" label="Adresă" val={client.adresa} />
                    <InfoRow icon="ti-mail" label="Email" val={client.email} link={`mailto:${client.email}`} />
                    <InfoRow icon="ti-phone" label="Telefon" val={client.telefon} link={`tel:${client.telefon}`} />
                  </tbody>
                </table>

                <div className="contact-actions">
                  <a href={`mailto:${client.email}`} className="btn btn-ghost btn-sm">
                    <i className="ti ti-mail" aria-hidden="true" /> Email
                  </a>
                  <a href={`tel:${client.telefon}`} className="btn btn-ghost btn-sm">
                    <i className="ti ti-phone" aria-hidden="true" /> Sună
                  </a>
                  {client.whatsapp && (
                    <a
                      href={whatsappLink(client.whatsapp, `Bună ziua, ${client.nume}!`)}
                      target="_blank" rel="noreferrer"
                      className="btn btn-success btn-sm"
                    >
                      <i className="ti ti-brand-whatsapp" aria-hidden="true" /> WhatsApp
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header"><div className="card-title">Acțiuni rapide</div></div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button className="btn btn-primary btn-sm" style={{ justifyContent: 'flex-start' }}
                  onClick={() => navigate(`/emite?clientId=${id}`)}>
                  <i className="ti ti-file-plus" aria-hidden="true" /> Emite factură chirie
                </button>
                <button className="btn btn-ghost btn-sm" style={{ justifyContent: 'flex-start' }}
                  onClick={() => setTab('email')}>
                  <i className="ti ti-mail" aria-hidden="true" /> Trimite email
                </button>
                <button className="btn btn-ghost btn-sm" style={{ justifyContent: 'flex-start' }}
                  onClick={() => navigate(`/emise?client=${client.nume}`)}>
                  <i className="ti ti-files" aria-hidden="true" /> Facturi emise
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function InfoRow({ icon, label, val, link }) {
  return (
    <tr>
      <td style={{ color: 'var(--slate)', padding: '5px 0', width: 30 }}>
        <i className={`ti ${icon}`} style={{ fontSize: 15 }} aria-hidden="true" />
      </td>
      <td style={{ color: 'var(--slate)', padding: '5px 8px', fontSize: 12, width: 90 }}>{label}</td>
      <td style={{ padding: '5px 0' }}>
        {link
          ? <a href={link} style={{ color: 'var(--blue)', textDecoration: 'none' }}>{val || '—'}</a>
          : <span>{val || '—'}</span>
        }
      </td>
    </tr>
  )
}
