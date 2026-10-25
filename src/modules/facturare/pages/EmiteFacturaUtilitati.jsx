import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Topbar from '../../../shared/components/Topbar'
import { useToast } from '../../../shared/components/Toast'
import { getSpatii, getImobile, getContoare, getCitiri, getClienti, saveEmail } from '../../../shared/firebase/firestore'
import { trimiteMail } from '../../../shared/services/emailService'
import { fmt, defaultScadenta } from '../../../shared/utils'

export default function EmiteFacturaUtilitati() {
  const navigate = useNavigate()
  const toast    = useToast()

  const [imobile,   setImobile]   = useState([])
  const [spatii,    setSpatii]    = useState([])
  const [clienti,   setClienti]   = useState([])
  const [spatiuId,  setSpatiuId]  = useState('')
  const [linii,     setLinii]     = useState([])
  const [scadenta,  setScadenta]  = useState(defaultScadenta(30))
  const [perioada,  setPerioada]  = useState(() => new Date().toISOString().slice(0, 7))
  const [obs,       setObs]       = useState('')
  const [loading,   setLoading]   = useState(false)
  const [sending,   setSending]   = useState(false)
  const [preview,   setPreview]   = useState(false)

  useEffect(() => {
    Promise.all([getImobile(), getSpatii(), getClienti()]).then(([im, sp, cl]) => {
      setImobile(im); setSpatii(sp); setClienti(cl)
    })
  }, [])

  // Când se schimbă spațiul — încarcă contoarele și ultima citire
  useEffect(() => {
    if (!spatiuId) { setLinii([]); return }
    setLoading(true)
    getContoare(spatiuId).then(async (ct) => {
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
          pret:       '',   // de completat manual
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
  const client  = clienti.find(c => c.id === spatiu?.clientId)

  const updateLinie = (i, k, v) => setLinii(prev => prev.map((l, idx) => {
    if (idx !== i) return l
    const updated = { ...l, [k]: v }
    // recalculeaza total
    if (updated.mod === 'valoare' || updated.fix) {
      updated.total = Number(updated.valoare) || 0
    } else {
      updated.total = (Number(updated.consum) || 0) * (Number(updated.pret) || 0)
    }
    return updated
  }))

  const liniiActive = linii.filter(l => l.activ)
  const subtotal    = liniiActive.reduce((s, l) => s + (l.total || 0), 0)
  const tva         = subtotal * 0.19
  const total       = subtotal + tva

  const handleTrimite = async () => {
    if (!client) { toast('Spațiul nu are client asociat.', 'error'); return }
    if (liniiActive.length === 0) { toast('Nu există utilități active.', 'error'); return }
    setSending(true)
    try {
      const nrFactura = 'FU-' + Date.now().toString().slice(-6)
      await trimiteMail({
        toEmail:    client.email,
        toName:     client.nume,
        nrFactura,
        suma:       fmt(total) + ' RON',
        scadenta,
        observatii: obs,
      })
      await saveEmail({
        clientId: client.id,
        toEmail:  client.email,
        subiect:  `Factură utilități ${nrFactura} — ${spatiu?.denumire}`,
        mesaj:    `Factură utilități ${nrFactura}\nSumă: ${fmt(total)} RON\nScadență: ${scadenta}`,
        tip:      'factura_utilitati',
        nrFactura,
      })
      toast(`Factură utilități ${nrFactura} trimisă!`)
      setTimeout(() => navigate('/emise'), 1200)
    } catch { toast('Eroare la trimitere. Verifică EmailJS.', 'error') }
    finally { setSending(false) }
  }

  return (
    <>
      <Topbar title="Emite factură utilități" subtitle="Facturare pe baza citirilor de contor">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/emise')}>Anulează</button>
      </Topbar>

      <div className="content">
        <div className="alert alert-info">
          <i className="ti ti-info-circle" />
          <span>Liniile se pre-completează din ultima citire per contor. Verifică și ajustează prețul/unitate unde e cazul.</span>
        </div>

        {/* Selector spațiu */}
        <div className="form-section">
          <div className="form-section-title"><i className="ti ti-building-store" /> Spațiu și client</div>
          <div className="form-grid">
            <div className="form-group full">
              <label>Selectează spațiu *</label>
              <select value={spatiuId} onChange={e => setSpatiuId(e.target.value)}>
                <option value="">— Alege spațiu —</option>
                {imobile.map(im => (
                  <optgroup key={im.id} label={im.nume}>
                    {spatii.filter(s => s.imobilId === im.id).map(s => (
                      <option key={s.id} value={s.id}>{s.denumire}{s.suprafata ? ` (${s.suprafata} mp)` : ''}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            {client && (
              <>
                <div className="form-group">
                  <label>Client</label>
                  <input value={client.nume} readOnly style={{ background: 'var(--slate-light)', color: 'var(--slate)' }} />
                </div>
                <div className="form-group">
                  <label>Email factură</label>
                  <input value={client.email} readOnly style={{ background: 'var(--slate-light)', color: 'var(--slate)' }} />
                </div>
              </>
            )}
            {spatiuId && !client && (
              <div className="form-group full">
                <div className="alert" style={{ background: 'var(--amber-light)', color: 'var(--amber)', border: '1px solid #fcd34d' }}>
                  <i className="ti ti-alert-triangle" />
                  <span>Acest spațiu nu are client asociat. Asociază un client în secțiunea Spații.</span>
                </div>
              </div>
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
              <textarea value={obs} onChange={e => setObs(e.target.value)} placeholder={`Utilități aferente lunii ${perioada}, spațiu ${spatiu?.denumire || ''}`} />
            </div>
          </div>
        </div>

        {/* Linii utilități */}
        {spatiuId && (
          <div className="form-section">
            <div className="form-section-title"><i className="ti ti-list" /> Utilități</div>

            {loading ? (
              <div style={{ color: 'var(--slate)', fontSize: 13 }}>Se încarcă contoarele…</div>
            ) : linii.length === 0 ? (
              <div style={{ color: 'var(--slate)', fontSize: 13 }}>
                Niciun contor configurat pentru acest spațiu.
                <button className="btn btn-ghost btn-sm" style={{ marginLeft: 10 }} onClick={() => navigate('/utilitati')}>
                  Configurează utilități
                </button>
              </div>
            ) : (
              <>
                {/* Header */}
                <div style={{ display: 'grid', gridTemplateColumns: '30px 1fr 100px 100px 100px 120px', gap: 8, marginBottom: 6 }}>
                  {['', 'Utilitate', 'Consum/Val.', 'UM', 'Preț/UM', 'Total RON'].map((h, i) => (
                    <span key={i} style={{ fontSize: 11, fontWeight: 600, color: 'var(--slate)', textTransform: 'uppercase', letterSpacing: '.5px' }}>{h}</span>
                  ))}
                </div>

                {linii.map((l, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '30px 1fr 100px 100px 100px 120px', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                    {/* Bifă activ */}
                    <input type="checkbox" checked={l.activ} onChange={e => updateLinie(i, 'activ', e.target.checked)} style={{ width: 16, height: 16 }} />

                    {/* Denumire */}
                    <div style={{ fontSize: 13 }}>
                      <div style={{ fontWeight: 500 }}>{l.tip}</div>
                      {l.dataCitire && <div style={{ fontSize: 11, color: 'var(--slate)' }}>Citire: {l.dataCitire}</div>}
                    </div>

                    {/* Consum sau valoare */}
                    {l.fix || l.mod === 'valoare' ? (
                      <input
                        type="number"
                        value={l.valoare}
                        onChange={e => updateLinie(i, 'valoare', e.target.value)}
                        placeholder="RON"
                        disabled={!l.activ}
                        style={{ opacity: l.activ ? 1 : .4 }}
                      />
                    ) : (
                      <input
                        type="number"
                        value={l.consum}
                        onChange={e => updateLinie(i, 'consum', e.target.value)}
                        placeholder="consum"
                        disabled={!l.activ}
                        style={{ opacity: l.activ ? 1 : .4 }}
                      />
                    )}

                    {/* UM */}
                    <div style={{ fontSize: 12, color: 'var(--slate)', padding: '8px 0' }}>{l.um}</div>

                    {/* Preț/unitate */}
                    {l.fix || l.mod === 'valoare' ? (
                      <div style={{ fontSize: 12, color: 'var(--slate)', padding: '8px 0' }}>—</div>
                    ) : (
                      <input
                        type="number"
                        value={l.pret}
                        onChange={e => updateLinie(i, 'pret', e.target.value)}
                        placeholder="0.00"
                        step="0.01"
                        disabled={!l.activ}
                        style={{ opacity: l.activ ? 1 : .4 }}
                      />
                    )}

                    {/* Total */}
                    <div style={{
                      fontSize: 13, fontWeight: 600, textAlign: 'right',
                      color: l.activ ? 'var(--color-text-primary, #0f172a)' : 'var(--slate)'
                    }}>
                      {l.activ && l.total > 0 ? fmt(l.total) + ' RON' : '—'}
                    </div>
                  </div>
                ))}

                {/* Totale */}
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)', display: 'flex', gap: 24, justifyContent: 'flex-end', fontSize: 13 }}>
                  <span style={{ color: 'var(--slate)' }}>Subtotal: <strong>{fmt(subtotal)} RON</strong></span>
                  <span style={{ color: 'var(--slate)' }}>TVA 19%: <strong>{fmt(tva)} RON</strong></span>
                  <span style={{ fontSize: 16, fontWeight: 700 }}>Total: {fmt(total)} RON</span>
                </div>
              </>
            )}
          </div>
        )}

        {spatiuId && linii.length > 0 && (
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" onClick={() => setPreview(true)}>
              <i className="ti ti-eye" /> Previzualizare
            </button>
            <button className="btn btn-primary" onClick={handleTrimite} disabled={sending || !client}>
              <i className="ti ti-send" /> {sending ? 'Se trimite…' : 'Emite și trimite'}
            </button>
          </div>
        )}
      </div>

      {/* Modal previzualizare */}
      {preview && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setPreview(false)}>
          <div className="modal-box">
            <div className="modal-head">
              <h3>Previzualizare factură utilități</h3>
              <button className="modal-close" onClick={() => setPreview(false)}><i className="ti ti-x" /></button>
            </div>
            <div className="modal-body">
              <div style={{ fontSize: 13, marginBottom: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                <div><span style={{ color: 'var(--slate)' }}>Client: </span>{client?.nume || '—'}</div>
                <div><span style={{ color: 'var(--slate)' }}>Spațiu: </span>{spatiu?.denumire || '—'}</div>
                <div><span style={{ color: 'var(--slate)' }}>Perioadă: </span>{perioada}</div>
                <div><span style={{ color: 'var(--slate)' }}>Scadență: </span>{scadenta}</div>
              </div>
              <table style={{ fontSize: 13, borderCollapse: 'collapse', width: '100%', marginBottom: 14 }}>
                <thead>
                  <tr style={{ background: 'var(--slate-light)' }}>
                    <th style={{ padding: '6px 8px', textAlign: 'left' }}>Utilitate</th>
                    <th style={{ padding: '6px 8px' }}>Consum</th>
                    <th style={{ padding: '6px 8px' }}>Preț/UM</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {liniiActive.map((l, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '6px 8px' }}>{l.tip}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                        {l.fix || l.mod === 'valoare' ? `${l.valoare} RON` : `${l.consum} ${l.um}`}
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                        {l.fix || l.mod === 'valoare' ? '—' : `${l.pret} RON/${l.um}`}
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600 }}>{fmt(l.total)} RON</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ textAlign: 'right', fontSize: 13 }}>
                <div>Subtotal: {fmt(subtotal)} RON</div>
                <div>TVA 19%: {fmt(tva)} RON</div>
                <div style={{ fontSize: 17, fontWeight: 700, marginTop: 6 }}>Total: {fmt(total)} RON</div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setPreview(false)}>Închide</button>
              <button className="btn btn-primary" onClick={() => { setPreview(false); handleTrimite() }} disabled={sending}>
                <i className="ti ti-send" /> Emite și trimite
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
