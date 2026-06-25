import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Topbar from '../components/Topbar'
import { useToast } from '../components/Toast'
import { getClienti, saveEmail } from '../firebase/firestore'
import { emiteFactura, buildPayload } from '../services/fgoApi'
import { trimiteMail } from '../services/emailService'
import { fmt, defaultScadenta } from '../utils'

const SPATII = [
  'Et. 1 — Birou A (120 mp)',
  'Et. 1 — Birou B (85 mp)',
  'Et. 2 — Spațiu comercial A',
  'Et. 2 — Spațiu comercial B',
  'Parter — Recepție',
]

const TEMPLATES = {
  chirie:   [{ desc: 'Chirie spațiu — ', cant: 1, pret: 3500 }],
  utilitati:[{ desc: 'Energie electrică', cant: 1, pret: 800 }, { desc: 'Apă și canalizare', cant: 1, pret: 150 }],
  mixta:    [{ desc: 'Chirie spațiu — ', cant: 1, pret: 3500 }, { desc: 'Energie electrică', cant: 1, pret: 800 }, { desc: 'Apă și canalizare', cant: 1, pret: 150 }],
}

export default function EmiteFactura() {
  const navigate      = useNavigate()
  const toast         = useToast()
  const [params]      = useSearchParams()
  const prefillId     = params.get('clientId')

  const [clienti,     setClienti]     = useState([])
  const [clientSel,   setClientSel]   = useState('')
  const [tip,         setTip]         = useState('chirie')
  const [spatiu,      setSpatiu]      = useState(SPATII[0])
  const [perioada,    setPerioada]    = useState(() => new Date().toISOString().slice(0, 7))
  const [scadenta,    setScadenta]    = useState(defaultScadenta(30))
  const [observatii,  setObservatii]  = useState('')
  const [linii,       setLinii]       = useState(TEMPLATES.chirie)
  const [sending,     setSending]     = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    getClienti().then(list => {
      setClienti(list)
      if (prefillId) {
        const c = list.find(x => x.id === prefillId)
        if (c) { setClientSel(c.id); if (c.spatiu) setSpatiu(c.spatiu) }
      }
    })
  }, [prefillId])

  // Actualizează liniile când se schimbă tipul sau spațiul
  useEffect(() => {
    const tpl = TEMPLATES[tip].map(l => ({
      ...l,
      desc: l.desc.endsWith('— ') ? l.desc + spatiu : l.desc,
    }))
    setLinii(tpl)
  }, [tip, spatiu])

  const client = clienti.find(c => c.id === clientSel)

  const updateLine = (i, field, val) =>
    setLinii(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: field === 'desc' ? val : Number(val) } : l))

  const removeLine = (i) => setLinii(prev => prev.filter((_, idx) => idx !== i))
  const addLine    = ()  => setLinii(prev => [...prev, { desc: '', cant: 1, pret: 0 }])

  const subtotal   = linii.reduce((s, l) => s + l.cant * l.pret, 0)
  const tva        = subtotal * 0.19
  const total      = subtotal + tva

  const handleTrimite = async () => {
    if (!client) { toast('Selectează un client.', 'error'); return }
    if (linii.length === 0) { toast('Adaugă cel puțin un articol.', 'error'); return }
    setSending(true)
    try {
      const payload = buildPayload({ client, linii, scadenta, observatii })
      let nrFactura = 'FC-DEMO'
      try {
        const res = await emiteFactura(payload)
        if (res.Success) nrFactura = res.NrFactura || nrFactura
        else throw new Error(res.Message)
      } catch {
        // FGO nu e configurat — continuăm cu număr demo
      }

      // Trimite email cu factura
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
        subiect:  `Factură ${nrFactura} — ${client.spatiu}`,
        mesaj:    `Factură ${nrFactura}\nSumă: ${fmt(total)} RON\nScadență: ${scadenta}\n${observatii}`,
        tip:      'factura',
        nrFactura,
      })

      toast(`Factură ${nrFactura} emisă și trimisă pe email!`)
      setTimeout(() => navigate('/emise'), 1200)
    } catch (err) {
      toast('Eroare: ' + err.message, 'error')
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <Topbar title="Emite factură" subtitle="Completează și trimite via FGO">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/emise')}>Anulează</button>
      </Topbar>

      <div className="content">
        <div className="alert alert-info">
          <i className="ti ti-info-circle" aria-hidden="true" />
          <span>Factura va fi emisă via API FGO, trimisă în SPV ANAF și pe emailul clientului automat.</span>
        </div>

        {/* Date client */}
        <div className="form-section">
          <div className="form-section-title">
            <i className="ti ti-user" aria-hidden="true" /> Client chiriaș
          </div>
          <div className="form-grid">
            <div className="form-group full">
              <label>Selectează client *</label>
              <select value={clientSel} onChange={e => {
                setClientSel(e.target.value)
                const c = clienti.find(x => x.id === e.target.value)
                if (c?.spatiu) setSpatiu(c.spatiu)
              }}>
                <option value="">— Alege client —</option>
                {clienti.map(c => <option key={c.id} value={c.id}>{c.nume} — {c.spatiu}</option>)}
              </select>
            </div>
            {client && (
              <>
                <div className="form-group">
                  <label>Email (destinatar factură)</label>
                  <input value={client.email} readOnly style={{ background: 'var(--slate-light)', color: 'var(--slate)' }} />
                </div>
                <div className="form-group">
                  <label>CUI</label>
                  <input value={client.cui} readOnly style={{ background: 'var(--slate-light)', color: 'var(--slate)' }} />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Detalii factură */}
        <div className="form-section">
          <div className="form-section-title">
            <i className="ti ti-building-store" aria-hidden="true" /> Detalii factură
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label>Tip factură</label>
              <select value={tip} onChange={e => setTip(e.target.value)}>
                <option value="chirie">Chirie</option>
                <option value="utilitati">Utilități</option>
                <option value="mixta">Chirie + Utilități</option>
              </select>
            </div>
            <div className="form-group">
              <label>Spațiu</label>
              <select value={spatiu} onChange={e => setSpatiu(e.target.value)}>
                {SPATII.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Perioadă facturată</label>
              <input type="month" value={perioada} onChange={e => setPerioada(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Dată scadență</label>
              <input type="date" value={scadenta} onChange={e => setScadenta(e.target.value)} />
            </div>
            <div className="form-group full">
              <label>Observații (apar pe factură și email)</label>
              <textarea
                value={observatii}
                onChange={e => setObservatii(e.target.value)}
                placeholder={`Chirie aferentă lunii ${perioada}, spațiu ${spatiu}`}
              />
            </div>
          </div>
        </div>

        {/* Articole */}
        <div className="form-section">
          <div className="form-section-title">
            <i className="ti ti-list" aria-hidden="true" /> Articole
          </div>
          <div className="line-item-header">
            <span>Descriere</span><span>Cant.</span><span>Preț unitar</span><span>Total</span><span />
          </div>
          {linii.map((l, i) => (
            <div className="line-item" key={i}>
              <input value={l.desc} onChange={e => updateLine(i, 'desc', e.target.value)} />
              <input type="number" value={l.cant} min={1} onChange={e => updateLine(i, 'cant', e.target.value)} style={{ textAlign: 'center' }} />
              <input type="number" value={l.pret} step="0.01" onChange={e => updateLine(i, 'pret', e.target.value)} />
              <input value={fmt(l.cant * l.pret) + ' RON'} readOnly style={{ background: 'var(--slate-light)', color: 'var(--slate)' }} />
              <button className="remove-btn" onClick={() => removeLine(i)}>
                <i className="ti ti-x" aria-hidden="true" />
              </button>
            </div>
          ))}
          <button className="btn btn-ghost btn-sm" onClick={addLine} style={{ marginTop: 8 }}>
            <i className="ti ti-plus" aria-hidden="true" /> Adaugă rând
          </button>

          <div className="totals-row">
            <span style={{ color: 'var(--slate)' }}>Subtotal: <strong>{fmt(subtotal)} RON</strong></span>
            <span style={{ color: 'var(--slate)' }}>TVA 19%: <strong>{fmt(tva)} RON</strong></span>
            <span style={{ fontSize: 16, fontWeight: 700 }}>Total: {fmt(total)} RON</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={() => setShowPreview(true)}>
            <i className="ti ti-eye" aria-hidden="true" /> Previzualizare
          </button>
          <button className="btn btn-primary" onClick={handleTrimite} disabled={sending}>
            <i className="ti ti-send" aria-hidden="true" />
            {sending ? 'Se trimite…' : 'Emite și trimite'}
          </button>
        </div>
      </div>

      {/* Modal previzualizare */}
      {showPreview && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowPreview(false)}>
          <div className="modal-box">
            <div className="modal-head">
              <h3>Previzualizare factură</h3>
              <button className="modal-close" onClick={() => setShowPreview(false)}>
                <i className="ti ti-x" />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ fontSize: 12, color: 'var(--slate)', marginBottom: 12 }}>
                Va fi trimisă via FGO → email: <strong>{client?.email || '—'}</strong>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14, fontSize: 13 }}>
                <div><span style={{ color: 'var(--slate)' }}>Client: </span>{client?.nume || '—'}</div>
                <div><span style={{ color: 'var(--slate)' }}>CUI: </span>{client?.cui || '—'}</div>
                <div><span style={{ color: 'var(--slate)' }}>Spațiu: </span>{spatiu}</div>
                <div><span style={{ color: 'var(--slate)' }}>Scadență: </span>{scadenta}</div>
                <div style={{ gridColumn: '1/-1' }}><span style={{ color: 'var(--slate)' }}>Observații: </span>{observatii || '—'}</div>
              </div>
              <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--slate-light)' }}>
                    <th style={{ textAlign: 'left', padding: '6px 8px' }}>Descriere</th>
                    <th style={{ padding: '6px 8px', textAlign: 'center' }}>Cant.</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>Preț</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {linii.map((l, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '6px 8px' }}>{l.desc}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'center' }}>{l.cant}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right' }}>{fmt(l.pret)} RON</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>{fmt(l.cant * l.pret)} RON</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ textAlign: 'right', marginTop: 14, fontSize: 13 }}>
                <div>Subtotal: {fmt(subtotal)} RON</div>
                <div>TVA 19%: {fmt(tva)} RON</div>
                <div style={{ fontSize: 17, fontWeight: 700, marginTop: 6 }}>Total: {fmt(total)} RON</div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowPreview(false)}>Închide</button>
              <button className="btn btn-primary" onClick={() => { setShowPreview(false); handleTrimite() }} disabled={sending}>
                <i className="ti ti-send" aria-hidden="true" /> Emite și trimite
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
