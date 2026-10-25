import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Topbar from '../../../shared/components/Topbar'
import { useToast } from '../../../shared/components/Toast'
import { useAuth } from '../../../shared/context/AuthContext'
import {
  getClient, getSpatii, getImobile, getRegistru, getEmailuriClient, getComunicariClient, getNoteClient, addNota,
} from '../../../shared/firebase/firestore'
import { fmtDate, whatsappLink } from '../../../shared/utils'
import { mesajEroare } from '../../../shared/utils/eroare'
import { esteActiv } from '../services/registruUtils'

const fmtIso = d => d ? new Date(d + 'T00:00:00').toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'
const azi = () => new Date().toISOString().slice(0, 10)
const zileLa = d => d ? Math.ceil((new Date(d + 'T00:00:00') - new Date(azi() + 'T00:00:00')) / 86400000) : null

function Sectiune({ icon, titlu, nr, children, deschisImplicit = true }) {
  const [deschis, setDeschis] = useState(deschisImplicit)
  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <button onClick={() => setDeschis(o => !o)} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', background: 'none', border: 'none',
        cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
      }}>
        <i className={`ti ${icon}`} style={{ color: 'var(--blue)', fontSize: 18 }} />
        <span style={{ fontSize: 14, fontWeight: 600, flex: 1 }}>{titlu}{nr != null && <span style={{ color: 'var(--slate)', fontWeight: 400 }}> ({nr})</span>}</span>
        <i className="ti ti-chevron-right" style={{ transition: 'transform .15s', transform: deschis ? 'rotate(90deg)' : 'none', color: 'var(--slate)' }} />
      </button>
      {deschis && <div style={{ padding: '0 18px 16px', borderTop: '1px solid var(--border)', paddingTop: 14 }}>{children}</div>}
    </div>
  )
}

const Grila = ({ children }) => (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '14px 20px' }}>{children}</div>
)
const Info = ({ label, val, link }) => (
  <div>
    <div style={{ fontSize: 11, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 2 }}>{label}</div>
    <div style={{ fontSize: 14, wordBreak: 'break-word' }}>
      {val ? (link ? <a href={link} style={{ color: 'var(--blue)', textDecoration: 'none' }}>{val}</a> : val) : <span style={{ color: 'var(--slate)' }}>—</span>}
    </div>
  </div>
)

export default function ClientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { user } = useAuth()

  const [client, setClient] = useState(null)
  const [spatii, setSpatii] = useState([])
  const [imobile, setImobile] = useState([])
  const [registru, setRegistru] = useState([])
  const [emailuri, setEmailuri] = useState([])
  const [note, setNote] = useState([])
  const [notaText, setNotaText] = useState('')
  const [eroare, setEroare] = useState('')

  const loadData = async () => {
    try {
      const [c, sp, im, rc, rr, e, com, n] = await Promise.all([
        getClient(id), getSpatii(), getImobile(), getRegistru('comercial'), getRegistru('rezidential'),
        getEmailuriClient(id), getComunicariClient(id).catch(() => []), getNoteClient(id),
      ])
      setClient(c); setSpatii(sp); setImobile(im); setRegistru([...rc, ...rr].filter(r => r.clientId === id))
      setEmailuri([...e, ...com]); setNote(n)
      if (!c) setEroare('Clientul nu a fost găsit.')
    } catch (e) { console.error(e); setEroare(mesajEroare(e, 'Încărcarea a eșuat')) }
  }
  useEffect(() => { loadData() }, [id])

  const spatiuLabel = sid => {
    const s = spatii.find(x => x.id === sid); if (!s) return '—'
    const im = imobile.find(x => x.id === s.imobilId)
    return im ? `${im.nume} · ${s.denumire || ''}` : (s.denumire || '—')
  }

  const conversatie = [
    ...emailuri.map(e => ({ ...e, _tip: 'email' })),
    ...note.map(n => ({ ...n, _tip: 'nota' })),
  ].sort((a, b) => (a.trimisLa?.seconds || a.creatLa?.seconds || 0) - (b.trimisLa?.seconds || b.creatLa?.seconds || 0))

  const handleAddNota = async () => {
    if (!notaText.trim()) return
    try { await addNota(id, notaText, user.email); toast('Notă adăugată.'); setNotaText(''); loadData() }
    catch (e) { console.error(e); toast(mesajEroare(e, 'Salvarea notei a eșuat'), 'error') }
  }

  if (eroare) return <div className="content" style={{ paddingTop: 48, textAlign: 'center', color: 'var(--slate)' }}>{eroare}</div>
  if (!client) return <div className="content" style={{ paddingTop: 48, textAlign: 'center', color: 'var(--slate)' }}>Se încarcă…</div>

  const pj = (client.tip || 'PJ') === 'PJ'
  const contacte = (client.contacte || []).filter(c => c.nume || c.telefon || c.whatsapp)
  const adreseEmail = pj
    ? (client.emailuri || []).filter(e => e.adresa)
    : [client.email && { adresa: client.email, trimiteMail: true }, ...(client.emailuri || []).filter(e => e.adresa)].filter(Boolean)
  const telefonPrincipal = client.telefon || contacte.find(c => c.telefon)?.telefon
  const emailPrincipal = adreseEmail[0]?.adresa
  const wa = client.whatsapp || contacte.find(c => c.whatsapp)?.whatsapp || telefonPrincipal
  const asocieri = spatii.filter(s => (s.clienti || []).some(a => a.clientId === id))
  const contractPrincipal = registru.find(esteActiv) || registru[0]
  const zile = contractPrincipal && esteActiv(contractPrincipal) ? zileLa(contractPrincipal.dataFinal) : null

  return (
    <>
      <Topbar title={client.nume} subtitle={pj ? 'Persoană juridică' : 'Persoană fizică'}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/clienti')}><i className="ti ti-arrow-left" /> Înapoi</button>
        <button className="btn btn-primary btn-sm" onClick={() => navigate('/clienti', { state: { editId: id } })}><i className="ti ti-pencil" /> Editează</button>
      </Topbar>

      <div className="content" style={{ maxWidth: 920, margin: '0 auto' }}>
        {/* Antet */}
        <div className="card" style={{ marginBottom: 12, padding: 18 }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ width: 52, height: 52, borderRadius: 12, background: 'var(--blue-light)', color: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 700 }}>
              {(client.nume || '?').trim().charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{client.nume}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                <span className={`badge ${pj ? 'badge-blue' : 'badge-green'}`}>{pj ? '🏢 PJ' : '👤 PF'}</span>
                <span className={`badge ${client.activ === false ? 'badge-gray' : 'badge-green'}`}>{client.activ === false ? 'Inactiv' : 'Activ'}</span>
                {contractPrincipal && (
                  <span className={`badge ${esteActiv(contractPrincipal) ? (zile !== null && zile <= 60 ? 'badge-amber' : 'badge-green') : 'badge-gray'}`}>
                    {esteActiv(contractPrincipal) ? (zile !== null && zile <= 60 ? `Contract expiră în ${zile} zile` : 'Contract activ') : 'Contract încheiat'}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
            {telefonPrincipal && <a className="btn btn-ghost btn-sm" href={`tel:${telefonPrincipal}`}><i className="ti ti-phone" /> Sună</a>}
            {wa && <a className="btn btn-success btn-sm" href={whatsappLink(wa, `Bună ziua, ${client.nume}!`)} target="_blank" rel="noreferrer"><i className="ti ti-brand-whatsapp" /> WhatsApp</a>}
            {emailPrincipal && <a className="btn btn-ghost btn-sm" href={`mailto:${emailPrincipal}`}><i className="ti ti-mail" /> Email</a>}
            <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/comunicare?client=${id}`)}><i className="ti ti-send" /> Scrie mesaj</button>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate(pj ? `/facturi?tab=chirie&clientId=${id}` : `/facturi?tab=nota&clientId=${id}`)}>
              <i className={`ti ${pj ? 'ti-file-plus' : 'ti-calculator'}`} /> {pj ? 'Emite factură' : 'Notă de calcul'}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/facturi?tab=istoric&client=${encodeURIComponent(client.nume)}`)}><i className="ti ti-files" /> Istoric facturi</button>
          </div>
        </div>

        <Sectiune icon="ti-id-badge" titlu="Date de identificare">
          <Grila>
            {pj ? (
              <>
                <Info label="CUI" val={client.cui} />
                <Info label="Nr. Reg. Com." val={client.regCom} />
                <Info label="Plătitor TVA" val={client.platitorTVA === true ? 'Da' : client.platitorTVA === false ? 'Nu' : ''} />
                <Info label="Bancă" val={client.banca} />
                <Info label="IBAN" val={client.iban} />
              </>
            ) : <Info label="CNP" val={client.cnp} />}
            <Info label={pj ? 'Adresă sediu' : 'Adresă'} val={client.adresa} />
            {client.spatiu && <Info label="Spațiu (câmp client)" val={client.spatiu} />}
          </Grila>
        </Sectiune>

        <Sectiune icon="ti-users" titlu={pj ? 'Persoane de contact' : 'Contact'} nr={pj ? contacte.length : null}>
          {pj ? (
            contacte.length === 0 ? <div style={{ color: 'var(--slate)', fontSize: 13 }}>Nicio persoană de contact.</div> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {contacte.map((c, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8 }}>
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <div style={{ fontWeight: 600 }}>{c.nume || '—'}</div>
                      {c.functie && <div style={{ fontSize: 12, color: 'var(--slate)' }}>{c.functie}</div>}
                    </div>
                    <div style={{ fontSize: 13 }}>{c.telefon || ''}</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {c.telefon && <a className="btn btn-ghost btn-sm" href={`tel:${c.telefon}`}><i className="ti ti-phone" /></a>}
                      {(c.whatsapp || c.telefon) && <a className="btn btn-success btn-sm" target="_blank" rel="noreferrer" href={whatsappLink(c.whatsapp || c.telefon, `Bună ziua${c.nume ? ', ' + c.nume : ''}!`)}><i className="ti ti-brand-whatsapp" /></a>}
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <Grila>
              <Info label="Telefon" val={client.telefon} link={client.telefon && `tel:${client.telefon}`} />
              <Info label="WhatsApp" val={client.whatsapp} />
              <Info label="Email" val={client.email} link={client.email && `mailto:${client.email}`} />
            </Grila>
          )}
        </Sectiune>

        {pj && (
          <Sectiune icon="ti-mail" titlu="Adrese de email" nr={adreseEmail.length}>
            {adreseEmail.length === 0 ? <div style={{ color: 'var(--slate)', fontSize: 13 }}>Nicio adresă de email.</div> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {adreseEmail.map((e, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 14 }}>
                    <a href={`mailto:${e.adresa}`} style={{ color: 'var(--blue)', textDecoration: 'none' }}>{e.adresa}</a>
                    {e.trimiteMail && <span className="badge badge-green" style={{ fontSize: 10 }}>primește mesaje</span>}
                  </div>
                ))}
              </div>
            )}
          </Sectiune>
        )}

        <Sectiune icon="ti-file-text" titlu="Contracte și spații" nr={registru.length || asocieri.length}>
          {registru.length === 0 && asocieri.length === 0 && (
            <div style={{ color: 'var(--slate)', fontSize: 13 }}>Niciun contract în registru și niciun spațiu asociat.</div>
          )}
          {registru.map(r => {
            const activ = esteActiv(r); const z = activ ? zileLa(r.dataFinal) : null
            return (
              <div key={r.id} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 14, marginBottom: 10 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
                  <strong style={{ color: 'var(--blue)' }}>{r.numar || 'Fără număr'}</strong>
                  <span className="badge badge-gray" style={{ fontSize: 10 }}>{r.registru === 'comercial' ? 'Comercial' : 'Rezidențial'}</span>
                  <span className={`badge ${activ ? (z !== null && z <= 60 ? 'badge-amber' : 'badge-green') : 'badge-gray'}`}>
                    {activ ? (z !== null && z <= 60 ? `expiră în ${z} zile` : 'Activ') : 'Inactiv'}
                  </span>
                </div>
                <Grila>
                  <Info label="Spațiu" val={spatiuLabel(r.spatiuId)} />
                  <Info label="Început" val={fmtIso(r.dataStart)} />
                  <Info label="Final" val={fmtIso(r.dataFinal)} />
                  <Info label="Chirie lunară" val={r.chirie ? `${r.chirie} ${r.moneda || ''}` : ''} />
                  <Info label="Garanție" val={r.garantie ? `${r.garantie} ${r.moneda || ''}` : ''} />
                  <Info label="Indexare" val={r.indexare} />
                  <Info label="Încasează" val={r.entitate} />
                  {r.administrator && <Info label="Administrator" val={r.administrator} />}
                  {r.observatii && <Info label="Observații" val={r.observatii} />}
                </Grila>
              </div>
            )
          })}
          {registru.length === 0 && asocieri.map(s => {
            const a = (s.clienti || []).find(x => x.clientId === id)
            return (
              <div key={s.id} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 14, marginBottom: 10 }}>
                <Grila>
                  <Info label="Spațiu" val={spatiuLabel(s.id)} />
                  <Info label="Rol" val={a?.rol} />
                  <Info label="Început" val={fmtIso(a?.dataStart)} />
                  <Info label="Final" val={fmtIso(a?.dataFinal)} />
                </Grila>
              </div>
            )
          })}
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/contracte')}><i className="ti ti-external-link" /> Deschide registrul de contracte</button>
        </Sectiune>

        <Sectiune icon="ti-messages" titlu="Conversație și note" nr={conversatie.length} deschisImplicit={conversatie.length > 0}>
          {conversatie.length === 0 ? (
            <div style={{ color: 'var(--slate)', fontSize: 13, marginBottom: 10 }}>Nicio comunicare înregistrată încă.</div>
          ) : (
            <div className="chat-wrap">
              {conversatie.map((item, i) => (
                <div key={i} className={`chat-msg ${item._tip === 'nota' ? 'note' : 'sent'}`}>
                  {item._tip === 'email' ? (
                    <>
                      <div style={{ fontSize: 11, color: 'var(--slate)', marginBottom: 3 }}>
                        <i className="ti ti-mail" style={{ fontSize: 12, marginRight: 3 }} />
                        Email {item.stare === 'esuat' ? 'EȘUAT' : 'trimis'} → {item.toEmail}
                      </div>
                      <div className="chat-bubble">
                        <div style={{ fontWeight: 500, marginBottom: 4, fontSize: 12 }}>{item.subiect}</div>
                        <div style={{ whiteSpace: 'pre-wrap' }}>{item.mesaj}</div>
                      </div>
                      <div className="chat-meta">{fmtDate(item.trimisLa)} · {item.expeditorEmail || item.trimisde}</div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 11, color: 'var(--slate)', marginBottom: 3 }}><i className="ti ti-pencil" style={{ fontSize: 12, marginRight: 3 }} />Notă internă</div>
                      <div className="chat-bubble">{item.text}</div>
                      <div className="chat-meta">{fmtDate(item.creatLa)} · {item.autor}</div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
          <div style={{ borderTop: conversatie.length ? '1px solid var(--border)' : 'none', marginTop: 14, paddingTop: 14 }}>
            <div style={{ fontSize: 12, color: 'var(--slate)', marginBottom: 6 }}>Adaugă notă internă</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <textarea style={{ flex: 1, minHeight: 52 }} placeholder="Notă despre acest client…" value={notaText} onChange={e => setNotaText(e.target.value)} />
              <button className="btn btn-ghost" onClick={handleAddNota} style={{ alignSelf: 'flex-end' }}><i className="ti ti-send" /></button>
            </div>
          </div>
        </Sectiune>
      </div>
    </>
  )
}
