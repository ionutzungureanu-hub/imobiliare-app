import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Topbar from '../components/Topbar'
import Badge from '../components/Badge'
import { getClienti } from '../firebase/firestore'
import { getFacturiEmise, getFacturiFurnizori } from '../services/fgoApi'
import { fmt } from '../utils'

export default function Dashboard() {
  const navigate = useNavigate()
  const [clienti,   setClienti]   = useState([])
  const [emise,     setEmise]     = useState([])
  const [furnizori, setFurnizori] = useState([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    Promise.all([
      getClienti(),
      getFacturiEmise().catch(() => DEMO_EMISE),
      getFacturiFurnizori().catch(() => DEMO_FURNIZORI),
    ]).then(([c, e, f]) => {
      setClienti(c)
      setEmise(Array.isArray(e) ? e : DEMO_EMISE)
      setFurnizori(Array.isArray(f) ? f : DEMO_FURNIZORI)
    }).finally(() => setLoading(false))
  }, [])

  const deIncasat   = emise.filter(f => f.status === 'In asteptare').reduce((s, f) => s + (f.suma || 0), 0)
  const incasat     = emise.filter(f => f.status === 'Achitata').reduce((s, f) => s + (f.suma || 0), 0)
  const furnNeplt   = furnizori.filter(f => f.status !== 'Achitata').reduce((s, f) => s + (f.suma || 0), 0)

  if (loading) return <div className="content" style={{ paddingTop: 48, textAlign: 'center', color: 'var(--slate)' }}>Se încarcă…</div>

  return (
    <>
      <Topbar title="Dashboard" subtitle="Situație generală">
        <button className="btn btn-primary btn-sm" onClick={() => navigate('/emite')}>
          <i className="ti ti-plus" aria-hidden="true" /> Factură nouă
        </button>
      </Topbar>

      <div className="content">
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-label">De încasat</div>
            <div className="stat-value">{fmt(deIncasat)} <span>RON</span></div>
            <div className="stat-meta">
              <span className="badge badge-amber">
                <i className="ti ti-clock" style={{ fontSize: 11 }} />
                {emise.filter(f => f.status === 'In asteptare').length} facturi în așteptare
              </span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Încasat (luna curentă)</div>
            <div className="stat-value">{fmt(incasat)} <span>RON</span></div>
            <div className="stat-meta">
              <span className="badge badge-green">
                <i className="ti ti-check" style={{ fontSize: 11 }} />
                {emise.filter(f => f.status === 'Achitata').length} achitate
              </span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Furnizori neachitați</div>
            <div className="stat-value">{fmt(furnNeplt)} <span>RON</span></div>
            <div className="stat-meta">
              <span className="badge badge-red">
                <i className="ti ti-alert-triangle" style={{ fontSize: 11 }} />
                {furnizori.filter(f => f.status === 'Scadenta').length} scadente
              </span>
            </div>
          </div>
        </div>

        <div className="two-col">
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Facturi emise recente</div>
                <div className="card-subtitle">Ultimele 5</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/emise')}>Vezi toate</button>
            </div>
            <table>
              <thead><tr><th>Client</th><th>Sumă</th><th>Status</th></tr></thead>
              <tbody>
                {emise.slice(0, 5).map((f, i) => (
                  <tr key={i}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{f.client}</div>
                      <div style={{ fontSize: 11, color: 'var(--slate)' }}>{f.nr}</div>
                    </td>
                    <td className="amount">{fmt(f.suma)} RON</td>
                    <td><Badge value={f.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Furnizori — scadente</div>
                <div className="card-subtitle">De plătit curând</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/furnizori')}>Vezi toate</button>
            </div>
            <table>
              <thead><tr><th>Furnizor</th><th>Sumă</th><th>Scadență</th></tr></thead>
              <tbody>
                {furnizori.filter(f => f.status !== 'Achitata').slice(0, 5).map((f, i) => (
                  <tr key={i}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{f.furnizor}</div>
                      <div style={{ fontSize: 11, color: 'var(--slate)' }}>{f.tip}</div>
                    </td>
                    <td className="amount">{fmt(f.suma)} RON</td>
                    <td style={{ color: f.status === 'Scadenta' ? 'var(--red)' : 'var(--slate)', fontSize: 12 }}>{f.scadenta}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-header">
            <div className="card-title">Clienți activi</div>
          </div>
          <table>
            <thead><tr><th>Client</th><th>Spațiu</th><th>Email</th><th>Telefon</th><th></th></tr></thead>
            <tbody>
              {clienti.length === 0 ? (
                <tr><td colSpan={5}><div className="empty"><i className="ti ti-users" /><p>Niciun client adăugat încă.</p></div></td></tr>
              ) : clienti.map(c => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 500 }}>{c.nume}</td>
                  <td style={{ color: 'var(--slate)' }}>{c.spatiu}</td>
                  <td style={{ color: 'var(--slate)' }}>{c.email}</td>
                  <td style={{ color: 'var(--slate)' }}>{c.telefon}</td>
                  <td>
                    <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/clienti/${c.id}`)}>
                      <i className="ti ti-chevron-right" aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

// Demo data when FGO not configured
const DEMO_EMISE = [
  { nr: 'FC-2025-0042', client: 'SC Beta Trading SRL', suma: 5800, status: 'Achitata' },
  { nr: 'FC-2025-0045', client: 'Delta Impex SRL',     suma: 4500, status: 'In asteptare' },
  { nr: 'FC-2025-0046', client: 'Alpha Tech SRL',      suma: 7200, status: 'In asteptare' },
  { nr: 'FC-2025-0048', client: 'Delta Impex SRL',     suma: 650,  status: 'In asteptare' },
  { nr: 'FC-2025-0039', client: 'Sigma Partners SRL',  suma: 6100, status: 'Restanta' },
]
const DEMO_FURNIZORI = [
  { furnizor: 'E.ON Energie România',  tip: 'Energie electrică', suma: 3200, scadenta: '2025-07-10', status: 'Neachitata' },
  { furnizor: 'Apa Nova București',    tip: 'Apă și canalizare', suma: 890,  scadenta: '2025-07-08', status: 'Scadenta' },
  { furnizor: 'Distrigaz Sud Rețele',  tip: 'Gaz natural',       suma: 2150, scadenta: '2025-07-05', status: 'Scadenta' },
]
