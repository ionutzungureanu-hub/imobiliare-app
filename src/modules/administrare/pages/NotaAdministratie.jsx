import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Topbar from '../../../shared/components/Topbar'
import { useToast } from '../../../shared/components/Toast'
import { useAuth } from '../../../shared/context/AuthContext'
import { useImobile } from '../../../shared/hooks/useImobile'
import { getSpatii, getClienti, getContoareSpatiu, getCitiriContor } from '../../../shared/firebase/firestore'
import { descarcaNotaAdministratie, genereazaNotaAdministratie } from '../services/pdfNotaAdministratie'

const TIPURI_APA = ['Apă rece baie', 'Apă caldă baie', 'Apă rece bucătărie', 'Apă caldă bucătărie']

export default function NotaAdministratie() {
  const navigate     = useNavigate()
  const [params]     = useSearchParams()
  const toast        = useToast()
  const { user, profile } = useAuth()
  const { imobile }  = useImobile()

  const [spatii,     setSpatii]     = useState([])
  const [clienti,    setClienti]    = useState([])
  const [imobilId,   setImobilId]   = useState(params.get('imobilId') || '')
  const [spatiuId,   setSpatiuId]   = useState(params.get('spatiuId') || '')
  const [citiriApa,  setCitiriApa]  = useState([]) // citiri filtrate apă
  const [perioada,   setPerioada]   = useState(() => new Date().toISOString().slice(0, 7))
  const [loading,    setLoading]    = useState(false)
  const [preview,    setPreview]    = useState(false)

  useEffect(() => {
    Promise.all([getSpatii(), getClienti()]).then(([sp, cl]) => {
      setSpatii(sp); setClienti(cl)
    })
  }, [imobile])

  // Când se schimbă spațiul → încarcă citirile de apă
  useEffect(() => {
    if (!spatiuId) { setCitiriApa([]); return }
    setLoading(true)
    getContoareSpatiu(spatiuId).then(async ct => {
      const contoareApa = ct.filter(c => TIPURI_APA.includes(c.denumire || c.tip) && c.mod === 'index')
      const toateCitirile = []
      for (const c of contoareApa) {
        const citiri = await getCitiriContor(c.id)
        if (citiri.length > 0) {
          // Cea mai recentă citire
          toateCitirile.push({ ...citiri[0], tip: c.denumire || c.tip, um: c.um })
        }
      }
      setCitiriApa(toateCitirile)
      setLoading(false)
    })
  }, [spatiuId])

  const spatiiImobil = spatii.filter(s => s.imobilId === imobilId)
  const spatiu  = spatii.find(s => s.id === spatiuId)
  const imobil  = imobile.find(im => im.id === imobilId)
  const client  = clienti.find(c =>
    spatiu?.clienti?.find(sc => sc.clientId === c.id && sc.rol === 'Chiriaș principal') ||
    c.id === spatiu?.clientId
  )

  const totalRece = citiriApa
    .filter(c => c.tip.includes('rece'))
    .reduce((s, c) => s + (Number(c.consum) || 0), 0)

  const totalCald = citiriApa
    .filter(c => c.tip.includes('cald'))
    .reduce((s, c) => s + (Number(c.consum) || 0), 0)

  const pdfParams = {
    spatiu, imobil, client,
    citiri: citiriApa,
    perioada,
    userNume: profile?.nume || user?.email,
  }

  const handleDescarcare = () => {
    if (!spatiuId) { toast('Selectează un spațiu.', 'error'); return }
    if (citiriApa.length === 0) { toast('Nu există citiri de apă pentru acest spațiu.', 'error'); return }
    try { descarcaNotaAdministratie(pdfParams); toast('PDF generat!') }
    catch (err) { toast('Eroare: ' + err.message, 'error') }
  }

  return (
    <>
      <Topbar title="Notă consum apă" subtitle="Comunicare către administrația blocului">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>← Înapoi</button>
      </Topbar>

      <div className="content" style={{ maxWidth: 640 }}>

        {/* Selector */}
        <div className="card" style={{ marginBottom: 16, padding: 16 }}>
          <div className="form-grid">
            <div className="form-group">
              <label>Imobil</label>
              <select value={imobilId} onChange={e => { setImobilId(e.target.value); setSpatiuId('') }}>
                <option value="">— Alege imobil —</option>
                {imobile.map(im => <option key={im.id} value={im.id}>{im.nume}</option>)}
              </select>
            </div>
            {imobilId && (
              <div className="form-group">
                <label>Spațiu</label>
                <select value={spatiuId} onChange={e => setSpatiuId(e.target.value)}>
                  <option value="">— Alege spațiu —</option>
                  {spatiiImobil.map(s => <option key={s.id} value={s.id}>{s.denumire}</option>)}
                </select>
              </div>
            )}
            <div className="form-group">
              <label>Perioada</label>
              <input type="month" value={perioada} onChange={e => setPerioada(e.target.value)} />
            </div>
          </div>

          {client && (
            <div style={{ marginTop: 12, padding: '8px 12px', background: 'var(--blue-light)', borderRadius: 8, fontSize: 13 }}>
              <strong>{client.nume}</strong>
              <span style={{ color: 'var(--slate)', marginLeft: 12 }}>{spatiu?.denumire}{spatiu?.etaj ? `, ${spatiu.etaj}` : ''}</span>
            </div>
          )}
        </div>

        {/* Citiri apă */}
        {spatiuId && (
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header">
              <div className="card-title">Citiri apă — ultima înregistrare</div>
              {citiriApa.length === 0 && !loading && (
                <span className="badge badge-amber">Nicio citire</span>
              )}
            </div>

            {loading ? (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--slate)' }}>Se încarcă...</div>
            ) : citiriApa.length === 0 ? (
              <div className="empty">
                <i className="ti ti-droplet-off" />
                <p>
                  Nu există contoare de apă configurate pentru acest spațiu.<br />
                  <span style={{ fontSize: 12 }}>Adaugă contoare de apă în secțiunea Utilități.</span>
                </p>
              </div>
            ) : (
              <>
                <table>
                  <thead>
                    <tr>
                      <th>Tip</th>
                      <th>Index anterior</th>
                      <th>Index nou</th>
                      <th>Consum</th>
                      <th>Data citire</th>
                    </tr>
                  </thead>
                  <tbody>
                    {citiriApa.map((cit, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 500 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <i className="ti ti-droplet" style={{ color: cit.tip.includes('cald') ? '#f97316' : '#3b82f6', fontSize: 14 }} />
                            {cit.tip}
                          </div>
                        </td>
                        <td style={{ color: 'var(--slate)', fontSize: 13 }}>
                          {cit.indexPrecedent != null ? `${cit.indexPrecedent} mc` : '—'}
                        </td>
                        <td style={{ fontWeight: 600 }}>
                          {cit.index != null ? `${cit.index} mc` : '—'}
                        </td>
                        <td>
                          <span style={{ color: 'var(--blue)', fontWeight: 700, fontSize: 14 }}>
                            {cit.consum != null ? `${cit.consum} mc` : '—'}
                          </span>
                        </td>
                        <td style={{ color: 'var(--slate)', fontSize: 12 }}>{cit.data || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Totaluri */}
                <div style={{ padding: '12px 20px', background: 'var(--blue-light)', borderTop: '1px solid var(--blue-mid)', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 13 }}>
                    <span style={{ color: 'var(--slate)' }}>Total apă rece: </span>
                    <strong style={{ color: '#3b82f6', fontSize: 15 }}>{totalRece.toFixed(2)} mc</strong>
                  </div>
                  <div style={{ fontSize: 13 }}>
                    <span style={{ color: 'var(--slate)' }}>Total apă caldă: </span>
                    <strong style={{ color: '#f97316', fontSize: 15 }}>{totalCald.toFixed(2)} mc</strong>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>
                    Total general: {(totalRece + totalCald).toFixed(2)} mc
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Acțiuni */}
        {spatiuId && citiriApa.length > 0 && (
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" onClick={() => setPreview(true)}>
              <i className="ti ti-eye" /> Previzualizare
            </button>
            <button className="btn btn-primary" onClick={handleDescarcare}>
              <i className="ti ti-download" /> Descarcă PDF
            </button>
          </div>
        )}

        {!spatiuId && imobilId && (
          <div className="empty"><i className="ti ti-droplet" /><p>Selectează un spațiu.</p></div>
        )}
        {!imobilId && (
          <div className="empty"><i className="ti ti-building" /><p>Selectează un imobil.</p></div>
        )}
      </div>

      {/* Modal previzualizare */}
      {preview && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setPreview(false)}>
          <div className="modal-box" style={{ width: 540 }}>
            <div className="modal-head">
              <h3>Previzualizare — Notă consum apă</h3>
              <button className="modal-close" onClick={() => setPreview(false)}><i className="ti ti-x" /></button>
            </div>
            <div className="modal-body">
              {imobil?.antetNota && (
                <div style={{ textAlign: 'center', marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{imobil.antetNota}</div>
                  {imobil.adresa && <div style={{ fontSize: 12, color: 'var(--slate)' }}>{imobil.adresa}</div>}
                </div>
              )}
              <div style={{ textAlign: 'center', marginBottom: 14 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--blue)' }}>NOTĂ DE CONSUM APĂ</div>
                <div style={{ fontSize: 11, color: 'var(--slate)' }}>Comunicare către administrația blocului · {perioada}</div>
              </div>
              <div style={{ background: 'var(--slate-light)', borderRadius: 8, padding: '8px 12px', marginBottom: 14, fontSize: 13 }}>
                <div><strong>Spațiu:</strong> {spatiu?.denumire}{spatiu?.etaj ? `, ${spatiu.etaj}` : ''}</div>
              </div>
              <table style={{ fontSize: 13, width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--blue)', color: '#fff' }}>
                    <th style={{ padding: '6px 10px', textAlign: 'left' }}>Tip</th>
                    <th style={{ padding: '6px 10px' }}>Index ant.</th>
                    <th style={{ padding: '6px 10px' }}>Index nou</th>
                    <th style={{ padding: '6px 10px' }}>Consum</th>
                    <th style={{ padding: '6px 10px' }}>Data</th>
                  </tr>
                </thead>
                <tbody>
                  {citiriApa.map((cit, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : 'var(--slate-light)', borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '6px 10px', fontWeight: 500 }}>{cit.tip}</td>
                      <td style={{ padding: '6px 10px', textAlign: 'center', color: 'var(--slate)' }}>{cit.indexPrecedent ?? '—'}</td>
                      <td style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 600 }}>{cit.index ?? '—'}</td>
                      <td style={{ padding: '6px 10px', textAlign: 'center', color: 'var(--blue)', fontWeight: 700 }}>{cit.consum != null ? `${cit.consum} mc` : '—'}</td>
                      <td style={{ padding: '6px 10px', textAlign: 'center', fontSize: 11, color: 'var(--slate)' }}>{cit.data}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--blue-light)', borderRadius: 8, display: 'flex', gap: 20 }}>
                <div style={{ fontSize: 13 }}>Apă rece: <strong style={{ color: '#3b82f6' }}>{totalRece.toFixed(2)} mc</strong></div>
                <div style={{ fontSize: 13 }}>Apă caldă: <strong style={{ color: '#f97316' }}>{totalCald.toFixed(2)} mc</strong></div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>Total: {(totalRece + totalCald).toFixed(2)} mc</div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setPreview(false)}>Închide</button>
              <button className="btn btn-primary" onClick={() => { setPreview(false); handleDescarcare() }}>
                <i className="ti ti-download" /> Descarcă PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
