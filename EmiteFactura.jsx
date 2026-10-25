import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Topbar from '../../../shared/components/Topbar'
import { useToast } from '../../../shared/components/Toast'
import { useAuth } from '../../../shared/context/AuthContext'
import { useImobile } from '../../../shared/hooks/useImobile'
import { getClienti, getSpatii, getConfig, saveEmail } from '../../../shared/firebase/firestore'
import { trimiteMail } from '../../../shared/services/emailService'
import { emiteFactura } from '../../../shared/services/facturareApi'
import { fmt, defaultScadenta } from '../../../shared/utils'

export default function EmiteFactura() {
  const navigate      = useNavigate()
  const toast         = useToast()
  const [params]      = useSearchParams()
  const prefillId     = params.get('clientId')
  const { profile }   = useAuth()
  const { imobile }   = useImobile()

  const [clienti,    setClienti]    = useState([])
  const [spatii,     setSpatii]     = useState([])
  const [config,     setConfig]     = useState(null)
  const [clientSel,  setClientSel]  = useState('')
  const [spatiuSel,  setSpatiuSel]  = useState('')
  const [perioada,   setPerioada]   = useState(() => new Date().toISOString().slice(0, 7))
  const [scadenta,   setScadenta]   = useState(defaultScadenta(30))
  const [observatii, setObservatii] = useState('')
  const [linii,      setLinii]      = useState([{ desc: 'Chirie spațiu — ', cant: 1, pret: 0 }])
  const [sending,    setSending]    = useState(false)
  const [showPreview,setShowPreview]= useState(false)

  useEffect(() => {
    const imobileIds = imobile.map(im => im.id)
    Promise.all([getClienti(), getSpatii(), getConfig()]).then(([cl, sp, cfg]) => {
      setClienti(cl)
      setSpatii(sp.filter(s => imobileIds.includes(s.imobilId)))
      setConfig(cfg)
      if (prefillId) {
        const c = cl.find(x => x.id === prefillId)
        if (c) setClientSel(c.id)
      }
    })
  }, [imobile, prefillId])

  const client = clienti.find(c => c.id === clientSel)
  const spatiu = spatii.find(s => s.id === spatiuSel)

  const updateLine = (i, field, val) =>
    setLinii(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: field === 'desc' ? val : Number(val) } : l))
  const removeLine = i => setLinii(prev => prev.filter((_, idx) => idx !== i))
  const addLine    = () => setLinii(prev => [...prev, { desc: '', cant: 1, pret: 0 }])

  const subtotal = linii.reduce((s, l) => s + l.cant * l.pret, 0)
  const tva      = subtotal * 0.19
  const total    = subtotal + tva

  const handleTrimite = async () => {
    if (!client) { toast('Selectează un client.', 'error'); return }
    if (linii.length === 0) { toast('Adaugă cel puțin un articol.', 'error'); return }
    setSending(true)
    try {
      let nrFactura = 'FC-' + Date.now().toString().slice(-6)
      let trimisaSPV = false

      // Încearcă emitere via furnizor configurat
      if (config?.furnizorId && config?.token) {
        try {
          const payload = {
            Client: { Denumire: client.nume, CUI: client.cui, Email: client.email, Adresa: client.adresa },
            Continut: linii.map(l => ({ Denumire: l.desc, NrProduse: l.cant, PretUnitar: l.pret, CotaTVA: 19 })),
            DataScadenta: scadenta,
            Observatii: observatii,
          }
          const res = await emiteFactura(config, payload)
          if (res?.NrFactura) { nrFactura = res.NrFactura; trimisaSPV = true }
        } catch {
          toast('Furnizorul de facturare nu a răspuns — factura se salvează local.', 'error')
        }
      }

      // Trimite email
      await trimiteMail({
        toEmail:    client.email,
        toName:     client.nume,
        nrFactura,
        suma:       fmt(total) + ' RON',
        scadenta,
        observatii,
      })

      // Salvează în Firestore
      await saveEmail({
        clientId: client.id,
        toEmail:  client.email,
        subiect:  `Factură ${nrFactura}${spatiu ? ` — ${spatiu.denumire}` : ''}`,
        mesaj:    `Factură ${nrFactura}\nSumă: ${fmt(total)} RON\nScadență: ${scadenta}\n${observatii}`,
        tip:      'factura',
        nrFactura,
        trimisaSPV,
        suma:     total,
        status:   'In asteptare',
      })

      toast(`Factură ${nrFactura} emisă${trimisaSPV ? ' și trimisă în SPV!' : ' și trimisă pe email!'}`)
      setTimeout(() => navigate('/emise'), 1200)
    } catch (err) {
      toast('Eroare: ' + err.message, 'error')
    } finally { setSending(false) }
  }

  return (
    <>
      <Topbar title="Emite factură chirie" subtitle="Factură fiscală pentru persoane juridice">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/emise')}>Anulează</button>
      </Topbar>

      <div className="content">
        {!config?.furnizorId && (
          <div className="alert" style={{ background: 'var(--amber-light)', color: 'var(--amber)', border: '1px solid #fcd34d', marginBottom: 16 }}>
            <i className="ti ti-alert-triangle" />
            <span>
              Niciun furnizor de facturare configurat. Factura se va salva local și trimite pe email,
              dar <strong>nu va fi transmisă în SPV ANAF</strong>.
              <a href="/config" style={{ color: 'var(--amber)', marginLeft: 8, fontWeight: 600 }}>Configurează →</a>
            </span>
          </div>
        )}

        {/* Date client */}
        <div className="form-section">
          <div className="form-section-title"><i className="ti ti-user" /> Client</div>
          <div className="form-grid">
            <div className="form-group">
              <label>Client *</label>
              <select value={clientSel} onChange={e => setClientSel(e.target.value)}>
                <option value="">— Alege client —</option>
                {clienti.map(c => <option key={c.id} value={c.id}>{c.nume}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Spațiu</label>
              <select value={spatiuSel} onChange={e => setSpatiuSel(e.target.value)}>
                <option value="">— Alege spațiu —</option>
                {imobile.map(im => (
                  <optgroup key={im.id} label={im.nume}>
                    {spatii.filter(s => s.imobilId === im.id).map(s => (
                      <option key={s.id} value={s.id}>{s.denumire}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            {client && (
              <>
                <div className="form-group">
                  <label>Email</label>
                  <input value={client.email} readOnly style={{ background: 'var(--slate-light)', color: 'var(--slate)' }} />
                </div>
                <div className="form-group">
                  <label>CUI</label>
                  <input value={client.cui || '—'} readOnly style={{ background: 'var(--slate-light)', color: 'var(--slate)' }} />
                </div>
              </>
            )}
            <div className="form-group">
              <label>Perioadă facturată</label>
              <input type="month" value={perioada} onChange={e => setPerioada(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Dată scadență</label>
              <input type="date" value={scadenta} onChange={e => setScadenta(e.target.value)} />
            </div>
            <div className="form-group full">
              <label>Observații</label>
              <textarea value={observatii} onChange={e => setObservatii(e.target.value)}
                placeholder={`Chirie aferentă lunii ${perioada}${spatiu ? `, ${spatiu.denumire}` : ''}`} />
            </div>
          </div>
        </div>

        {/* Articole */}
        <div className="form-section">
          <div className="form-section-title"><i className="ti ti-list" /> Articole</div>
          <div className="line-item-header">
            <span>Descriere</span><span>Cant.</span><span>Preț unitar</span><span>Total</span><span />
          </div>
          {linii.map((l, i) => (
            <div className="line-item" key={i}>
              <input value={l.desc} onChange={e => updateLine(i, 'desc', e.target.value)} />
              <input type="number" value={l.cant} min={1} onChange={e => updateLine(i, 'cant', e.target.value)} style={{ textAlign: 'center' }} />
              <input type="number" value={l.pret} step="0.01" onChange={e => updateLine(i, 'pret', e.target.value)} />
              <input value={fmt(l.cant * l.pret) + ' RON'} readOnly style={{ background: 'var(--slate-light)', color: 'var(--slate)' }} />
              <button className="remove-btn" onClick={() => removeLine(i)}><i className="ti ti-x" /></button>
            </div>
          ))}
          <button className="btn btn-ghost btn-sm" onClick={addLine} style={{ marginTop: 8 }}>
            <i className="ti ti-plus" /> Adaugă rând
          </button>
          <div className="totals-row">
            <span style={{ color: 'var(--slate)' }}>Subtotal: <strong>{fmt(subtotal)} RON</strong></span>
            <span style={{ color: 'var(--slate)' }}>TVA 19%: <strong>{fmt(tva)} RON</strong></span>
            <span style={{ fontSize: 16, fontWeight: 700 }}>Total: {fmt(total)} RON</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={() => setShowPreview(true)}>
            <i className="ti ti-eye" /> Previzualizare
          </button>
          <button className="btn btn-primary" onClick={handleTrimite} disabled={sending}>
            <i className="ti ti-send" /> {sending ? 'Se trimite…' : 'Emite și trimite'}
          </button>
        </div>
      </div>

      {/* Modal previzualizare */}
      {showPreview && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowPreview(false)}>
          <div className="modal-box">
            <div className="modal-head">
              <h3>Previzualizare factură</h3>
              <button className="modal-close" onClick={() => setShowPreview(false)}><i className="ti ti-x" /></button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14, fontSize: 13 }}>
                <div><span style={{ color: 'var(--slate)' }}>Client: </span>{client?.nume || '—'}</div>
                <div><span style={{ color: 'var(--slate)' }}>CUI: </span>{client?.cui || '—'}</div>
                <div><span style={{ color: 'var(--slate)' }}>Spațiu: </span>{spatiu?.denumire || '—'}</div>
                <div><span style={{ color: 'var(--slate)' }}>Scadență: </span>{scadenta}</div>
              </div>
              <table style={{ fontSize: 13, borderCollapse: 'collapse', width: '100%', marginBottom: 14 }}>
                <thead><tr style={{ background: 'var(--slate-light)' }}>
                  <th style={{ padding: '6px 8px', textAlign: 'left' }}>Descriere</th>
                  <th style={{ padding: '6px 8px', textAlign: 'center' }}>Cant.</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right' }}>Preț</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right' }}>Total</th>
                </tr></thead>
                <tbody>{linii.map((l, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '6px 8px' }}>{l.desc}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'center' }}>{l.cant}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right' }}>{fmt(l.pret)} RON</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>{fmt(l.cant * l.pret)} RON</td>
                  </tr>
                ))}</tbody>
              </table>
              <div style={{ textAlign: 'right', fontSize: 13 }}>
                <div>Subtotal: {fmt(subtotal)} RON</div>
                <div>TVA 19%: {fmt(tva)} RON</div>
                <div style={{ fontSize: 17, fontWeight: 700, marginTop: 6 }}>Total: {fmt(total)} RON</div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowPreview(false)}>Închide</button>
              <button className="btn btn-primary" onClick={() => { setShowPreview(false); handleTrimite() }} disabled={sending}>
                <i className="ti ti-send" /> Emite și trimite
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
