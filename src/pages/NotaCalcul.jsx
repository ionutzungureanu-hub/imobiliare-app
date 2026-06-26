import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Topbar from '../components/Topbar'
import { useToast } from '../components/Toast'
import { useAuth } from '../context/AuthContext'
import { useImobile } from '../hooks/useImobile'
import { getSpatii, getContoare, getCitiri, getClienti, saveEmail } from '../firebase/firestore'
import { trimiteMesaj } from '../services/emailService'
import { descarcaNotaCalcul, genereazaNotaCalcul } from '../services/pdfService'
import { fmt, defaultScadenta } from '../utils'

export default function NotaCalcul() {
  const navigate       = useNavigate()
  const toast          = useToast()
  const { user, profile } = useAuth()
  const { imobile }    = useImobile()

  const [spatii,    setSpatii]    = useState([])
  const [clienti,   setClienti]   = useState([])
  const [spatiuId,  setSpatiuId]  = useState('')
  const [chirie,    setChirie]    = useState('')
  const [linii,     setLinii]     = useState([])
  const [scadenta,  setScadenta]  = useState(defaultScadenta(15))
  const [perioada,  setPerioada]  = useState(() => new Date().toISOString().slice(0, 7))
  const [loading,   setLoading]   = useState(false)
  const [sending,   setSending]   = useState(false)
  const [preview,   setPreview]   = useState(false)
  const [modalEmail,setModalEmail]= useState(false)
  const [emailDest, setEmailDest] = useState('')

  useEffect(() => {
    Promise.all([getSpatii(), getClienti()]).then(([sp, cl]) => {
      // Filtrare spații pe imobilele permise
      const imobileIds = imobile.map(im => im.id)
      setSpatii(sp.filter(s => imobileIds.includes(s.imobilId)))
      setClienti(cl)
    })
  }, [imobile])

  useEffect(() => {
    if (!spatiuId) { setLinii([]); return }
    setLoading(true)
    getContoare(spatiuId).then(async ct => {
      const rows = await Promise.all(ct.map(async c => {
        const citiri = await getCitiri(c.id)
        const ultima = citiri[0]
        return {
          contorId:   c.id,
          tip:        c.tip,
          um:         c.um,
          fix:        c.fix,
          mod:        ultima?.mod || (c.fix ? 'valoare' : 'index'),
          consum:     ultima?.consum ?? '',
          valoare:    ultima?.valoare ?? '',
          pret:       '',
          total:      0,
          activ:      true,
          dataCitire: ultima?.data || '',
        }
      }))
      setLinii(rows)
      setLoading(false)
    })
  }, [spatiuId])

  const spatiu  = spatii.find(s => s.id === spatiuId)
  const imobil  = imobile.find(im => im.id === spatiu?.imobilId)
  const client  = clienti.find(c => c.id === spatiu?.clientId)

  useEffect(() => {
    if (client?.email) setEmailDest(client.email)
  }, [client])

  const updateLinie = (i, k, v) => setLinii(prev => prev.map((l, idx) => {
    if (idx !== i) return l
    const updated = { ...l, [k]: v }
    if (updated.fix || updated.mod === 'valoare') {
      updated.total = Number(updated.valoare) || 0
    } else {
      updated.total = (Number(updated.consum) || 0) * (Number(updated.pret) || 0)
    }
    return updated
  }))

  const liniiActive  = linii.filter(l => l.activ)
  const totalUtil    = liniiActive.reduce((s, l) => s + (l.total || 0), 0)
  const totalGeneral = (Number(chirie) || 0) + totalUtil

  const pdfParams = {
    imobil,
    spatiu,
    client,
    chirie,
    liniiUtilitati: liniiActive,
    scadenta,
    perioada,
    userNume: profile?.nume || user?.email,
  }

  const handleDescarcare = () => {
    if (!spatiuId) { toast('Selectează un spațiu.', 'error'); return }
    try { descarcaNotaCalcul(pdfParams); toast('PDF generat!') }
    catch { toast('Eroare la generare PDF.', 'error') }
  }

  const handleTrimiteEmail = async () => {
    if (!emailDest) { toast('Introdu adresa de email.', 'error'); return }
    setSending(true)
    try {
      const { doc, nr } = genereazaNotaCalcul(pdfParams)
      // Trimite email cu detaliile notei
      await trimiteMesaj({
        toEmail: emailDest,
        toName:  client?.nume || emailDest,
        subiect: `Notă de calcul ${nr} — ${spatiu?.denumire} — ${perioada}`,
        mesaj:   `Bună ziua,\n\nVă transmitem nota de calcul pentru perioada ${perioada}.\n\nChirie: ${fmt(chirie || 0)} RON\nUtilități: ${fmt(totalUtil)} RON\nTotal de plată: ${fmt(totalGeneral)} RON\nScadență: ${scadenta}\n\nNotă: PDF-ul poate fi descărcat din aplicație sau vi-l trimitem separat.\n\nCu respect,\n${profile?.nume || user?.email}`,
      })
      // Salvează în Firestore
      if (client) {
        await saveEmail({
          clientId: client.id,
          toEmail:  emailDest,
          subiect:  `Notă de calcul ${nr} — ${perioada}`,
          mesaj:    `Total: ${fmt(totalGeneral)} RON | Scadență: ${scadenta}`,
          tip:      'nota_calcul',
          nr,
        })
      }
      toast('Email trimis!')
      setModalEmail(false)
      doc.save(`Nota_Calcul_${nr}.pdf`)
    } catch (err) {
      toast('Eroare la trimitere. Verifică EmailJS.', 'error')
    } finally { setSending(false) }
  }

  return (
    <>
      <Topbar title="Notă de calcul" subtitle="Pentru persoane fizice — chirie și utilități">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/dashboard')}>Înapoi</button>
      </Topbar>

      <div className="content">
        {/* Selector spațiu */}
        <div className="form-section">
          <div className="form-section-title"><i className="ti ti-home" /> Spațiu și chiriaș</div>
          <div className="form-grid">
            <div className="form-group full">
              <label>Selectează spațiu (persoană fizică) *</label>
              <select value={spatiuId} onChange={e => setSpatiuId(e.target.value)}>
                <option value="">— Alege spațiu —</option>
                {imobile.map(im => (
                  <optgroup key={im.id} label={im.nume}>
                    {spatii.filter(s => s.imobilId === im.id).map(s => (
                      <option key={s.id} value={s.id}>
                        {s.denumire}{s.suprafata ? ` (${s.suprafata} mp)` : ''}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {client && (
              <div className="form-group full">
                <div style={{ background: 'var(--blue-light)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: 13 }}>
                  <strong>{client.nume}</strong>
                  {client.email && <span style={{ color: 'var(--slate)', marginLeft: 12 }}>{client.email}</span>}
                  {client.telefon && <span style={{ color: 'var(--slate)', marginLeft: 12 }}>{client.telefon}</span>}
                </div>
              </div>
            )}

            {spatiuId && !client && (
              <div className="form-group full">
                <div className="alert" style={{ background: 'var(--amber-light)', color: 'var(--amber)', border: '1px solid #fcd34d' }}>
                  <i className="ti ti-alert-triangle" />
                  <span>Spațiul nu are chiriaș asociat. Asociază un client în secțiunea Spații.</span>
                </div>
              </div>
            )}

            <div className="form-group">
              <label>Perioadă</label>
              <input type="month" value={perioada} onChange={e => setPerioada(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Scadență plată</label>
              <input type="date" value={scadenta} onChange={e => setScadenta(e.target.value)} />
            </div>
          </div>
        </div>

        {spatiuId && (
          <>
            {/* Chirie */}
            <div className="form-section">
              <div className="form-section-title"><i className="ti ti-home" /> Chirie lunară</div>
              <div className="form-grid">
                <div className="form-group">
                  <label>Sumă chirie (RON)</label>
                  <input
                    type="number"
                    value={chirie}
                    onChange={e => setChirie(e.target.value)}
                    placeholder="ex. 500"
                    step="0.01"
                  />
                </div>
                <div className="form-group" style={{ justifyContent: 'flex-end', paddingBottom: 2 }}>
                  {chirie && <div style={{ fontSize: 13, color: 'var(--slate)', paddingTop: 22 }}>
                    Chirie: <strong style={{ color: 'var(--text)' }}>{fmt(chirie)} RON</strong>
                  </div>}
                </div>
              </div>
            </div>

            {/* Utilități */}
            <div className="form-section">
              <div className="form-section-title"><i className="ti ti-plug" /> Utilități</div>
              {loading ? (
                <div style={{ color: 'var(--slate)', fontSize: 13 }}>Se încarcă contoarele…</div>
              ) : linii.length === 0 ? (
                <div style={{ color: 'var(--slate)', fontSize: 13 }}>
                  Niciun contor configurat.
                  <button className="btn btn-ghost btn-sm" style={{ marginLeft: 10 }} onClick={() => navigate('/utilitati')}>
                    Configurează utilități
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '30px 1fr 100px 100px 100px 110px', gap: 8, marginBottom: 6 }}>
                    {['', 'Utilitate', 'Consum/Val.', 'UM', 'Preț/UM', 'Total RON'].map((h, i) => (
                      <span key={i} style={{ fontSize: 11, fontWeight: 600, color: 'var(--slate)', textTransform: 'uppercase' }}>{h}</span>
                    ))}
                  </div>
                  {linii.map((l, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '30px 1fr 100px 100px 100px 110px', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                      <input type="checkbox" checked={l.activ} onChange={e => updateLinie(i, 'activ', e.target.checked)} style={{ width: 16, height: 16 }} />
                      <div style={{ fontSize: 13 }}>
                        <div style={{ fontWeight: 500 }}>{l.tip}</div>
                        {l.dataCitire && <div style={{ fontSize: 11, color: 'var(--slate)' }}>Citire: {l.dataCitire}</div>}
                      </div>
                      {l.fix || l.mod === 'valoare' ? (
                        <input type="number" value={l.valoare} onChange={e => updateLinie(i, 'valoare', e.target.value)} placeholder="RON" disabled={!l.activ} style={{ opacity: l.activ ? 1 : .4 }} />
                      ) : (
                        <input type="number" value={l.consum} onChange={e => updateLinie(i, 'consum', e.target.value)} placeholder="consum" disabled={!l.activ} style={{ opacity: l.activ ? 1 : .4 }} />
                      )}
                      <div style={{ fontSize: 12, color: 'var(--slate)' }}>{l.um}</div>
                      {l.fix || l.mod === 'valoare' ? (
                        <div style={{ fontSize: 12, color: 'var(--slate)' }}>—</div>
                      ) : (
                        <input type="number" value={l.pret} onChange={e => updateLinie(i, 'pret', e.target.value)} placeholder="0.00" step="0.01" disabled={!l.activ} style={{ opacity: l.activ ? 1 : .4 }} />
                      )}
                      <div style={{ fontSize: 13, fontWeight: 600, textAlign: 'right', color: l.activ && l.total > 0 ? 'var(--text)' : 'var(--slate)' }}>
                        {l.activ && l.total > 0 ? fmt(l.total) + ' RON' : '—'}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* Total */}
            <div className="form-section" style={{ background: 'var(--blue-light)', border: '1px solid var(--blue-mid)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, color: 'var(--slate)' }}>Chirie: <strong>{fmt(chirie || 0)} RON</strong></div>
                  <div style={{ fontSize: 13, color: 'var(--slate)' }}>Utilități: <strong>{fmt(totalUtil)} RON</strong></div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 12, color: 'var(--slate)' }}>TOTAL DE PLATĂ</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--blue)' }}>{fmt(totalGeneral)} RON</div>
                  <div style={{ fontSize: 11, color: 'var(--slate)' }}>Scadență: {scadenta}</div>
                </div>
              </div>
            </div>

            {/* Acțiuni */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <button className="btn btn-ghost" onClick={() => setPreview(true)}>
                <i className="ti ti-eye" /> Previzualizare
              </button>
              <button className="btn btn-ghost" onClick={handleDescarcare}>
                <i className="ti ti-download" /> Descarcă PDF
              </button>
              <button className="btn btn-primary" onClick={() => setModalEmail(true)}>
                <i className="ti ti-send" /> Trimite pe email
              </button>
            </div>
          </>
        )}
      </div>

      {/* Modal previzualizare */}
      {preview && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setPreview(false)}>
          <div className="modal-box" style={{ width: 500 }}>
            <div className="modal-head">
              <h3>Previzualizare notă de calcul</h3>
              <button className="modal-close" onClick={() => setPreview(false)}><i className="ti ti-x" /></button>
            </div>
            <div className="modal-body">
              {imobil?.antetNota && (
                <div style={{ textAlign: 'center', marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{imobil.antetNota}</div>
                  {imobil.subAntetNota && <div style={{ fontSize: 12, color: 'var(--slate)' }}>{imobil.subAntetNota}</div>}
                </div>
              )}
              <div style={{ textAlign: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--blue)' }}>NOTĂ DE CALCUL</div>
                <div style={{ fontSize: 12, color: 'var(--slate)' }}>Perioada: {perioada} | Scadență: {scadenta}</div>
              </div>
              <div style={{ background: 'var(--slate-light)', borderRadius: 6, padding: 10, marginBottom: 10, fontSize: 13 }}>
                <div><strong>Chiriaș:</strong> {client?.nume || '—'}</div>
                <div><strong>Spațiu:</strong> {spatiu?.denumire}</div>
              </div>
              {Number(chirie) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                  <span>Chirie lunară</span><strong>{fmt(chirie)} RON</strong>
                </div>
              )}
              {liniiActive.map((l, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                  <div>
                    <div>{l.tip}</div>
                    {!l.fix && l.mod !== 'valoare' && l.consum && (
                      <div style={{ color: 'var(--slate)' }}>{l.consum} {l.um} × {l.pret} RON/{l.um}</div>
                    )}
                  </div>
                  <strong>{fmt(l.total || l.valoare)} RON</strong>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', marginTop: 4, background: 'var(--blue)', borderRadius: 6, paddingLeft: 10, paddingRight: 10 }}>
                <strong style={{ color: '#fff' }}>TOTAL DE PLATĂ</strong>
                <strong style={{ color: '#fff', fontSize: 16 }}>{fmt(totalGeneral)} RON</strong>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setPreview(false)}>Închide</button>
              <button className="btn btn-ghost" onClick={handleDescarcare}><i className="ti ti-download" /> Descarcă PDF</button>
              <button className="btn btn-primary" onClick={() => { setPreview(false); setModalEmail(true) }}><i className="ti ti-send" /> Trimite email</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal email */}
      {modalEmail && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalEmail(false)}>
          <div className="modal-box" style={{ width: 420 }}>
            <div className="modal-head">
              <h3>Trimite nota de calcul</h3>
              <button className="modal-close" onClick={() => setModalEmail(false)}><i className="ti ti-x" /></button>
            </div>
            <div className="modal-body">
              <div className="alert alert-info" style={{ marginBottom: 14 }}>
                <i className="ti ti-info-circle" />
                <span>Se va trimite un email cu detaliile și se va descărca PDF-ul automat.</span>
              </div>
              <div className="form-group">
                <label>Adresă email destinatar</label>
                <input type="email" value={emailDest} onChange={e => setEmailDest(e.target.value)} placeholder="chiriaș@email.com" />
              </div>
              <div style={{ marginTop: 10, padding: 12, background: 'var(--slate-light)', borderRadius: 6, fontSize: 13 }}>
                <div style={{ color: 'var(--slate)', marginBottom: 4 }}>Rezumat:</div>
                <div>Chirie: <strong>{fmt(chirie || 0)} RON</strong></div>
                <div>Utilități: <strong>{fmt(totalUtil)} RON</strong></div>
                <div style={{ borderTop: '1px solid var(--border)', marginTop: 6, paddingTop: 6, fontWeight: 700 }}>
                  Total: {fmt(totalGeneral)} RON
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModalEmail(false)}>Anulează</button>
              <button className="btn btn-primary" onClick={handleTrimiteEmail} disabled={sending}>
                <i className="ti ti-send" /> {sending ? 'Se trimite…' : 'Trimite și descarcă PDF'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
