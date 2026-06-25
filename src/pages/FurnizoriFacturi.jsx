import { useEffect, useState } from 'react'
import Topbar from '../components/Topbar'
import Badge from '../components/Badge'
import { getFacturiFurnizori } from '../services/fgoApi'
import { fmt } from '../utils'

const DEMO = [
  { furnizor: 'E.ON Energie România',  nr: 'E-2025-0441',   tip: 'Energie electrică', suma: 3200, scadenta: '2025-07-10', status: 'Neachitata' },
  { furnizor: 'Apa Nova București',    nr: 'APN-88231',      tip: 'Apă și canalizare', suma: 890,  scadenta: '2025-07-08', status: 'Scadenta'   },
  { furnizor: 'Distrigaz Sud Rețele',  nr: 'DGS-2025-1122',  tip: 'Gaz natural',       suma: 2150, scadenta: '2025-07-05', status: 'Scadenta'   },
  { furnizor: 'Servicii Curățenie SRL',nr: 'SC-2025-0312',   tip: 'Curățenie imobil',  suma: 1200, scadenta: '2025-07-15', status: 'Neachitata' },
  { furnizor: 'Pază și Protecție SA',  nr: 'PP-2025-0087',   tip: 'Pază imobil',       suma: 900,  scadenta: '2025-07-15', status: 'Neachitata' },
  { furnizor: 'E.ON Energie România',  nr: 'E-2025-0398',    tip: 'Energie electrică', suma: 3100, scadenta: '2025-06-10', status: 'Achitata'   },
  { furnizor: 'Apa Nova București',    nr: 'APN-87001',       tip: 'Apă și canalizare', suma: 810,  scadenta: '2025-06-08', status: 'Achitata'   },
]

export default function FurnizoriFacturi() {
  const [facturi,  setFacturi]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [status,   setStatus]   = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const data = await getFacturiFurnizori()
      setFacturi(Array.isArray(data) ? data : DEMO)
    } catch {
      setFacturi(DEMO)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = facturi.filter(f =>
    (!search || f.furnizor?.toLowerCase().includes(search.toLowerCase())) &&
    (!status || f.status === status)
  )

  const totalNeachitat = facturi.filter(f => f.status !== 'Achitata').reduce((s, f) => s + (f.suma || 0), 0)

  return (
    <>
      <Topbar title="Facturi de la furnizori" subtitle="Importate din FGO / SPV ANAF" />

      <div className="content">
        <div className="alert alert-info">
          <i className="ti ti-info-circle" aria-hidden="true" />
          <span>
            Facturile furnizorilor sunt preluate automat din FGO (SPV ANAF).
            Apasă „Import din FGO" pentru a actualiza lista.
          </span>
        </div>

        <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 20 }}>
          <div className="stat-card">
            <div className="stat-label">Total neachitat</div>
            <div className="stat-value">{fmt(totalNeachitat)} <span>RON</span></div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Scadente</div>
            <div className="stat-value" style={{ color: 'var(--red)' }}>
              {facturi.filter(f => f.status === 'Scadenta').length} <span style={{ fontSize: 14 }}>facturi</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Achitate (luna curentă)</div>
            <div className="stat-value" style={{ color: 'var(--green)' }}>
              {facturi.filter(f => f.status === 'Achitata').length} <span style={{ fontSize: 14 }}>facturi</span>
            </div>
          </div>
        </div>

        <div className="toolbar">
          <input
            type="text" placeholder="Caută furnizor…"
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ maxWidth: 220 }}
          />
          <select value={status} onChange={e => setStatus(e.target.value)} style={{ maxWidth: 160 }}>
            <option value="">Toate statusurile</option>
            <option value="Achitata">Achitate</option>
            <option value="Neachitata">Neachitate</option>
            <option value="Scadenta">Scadente</option>
          </select>
          <button className="btn btn-ghost btn-sm" onClick={load}>
            <i className="ti ti-refresh" aria-hidden="true" /> Import din FGO
          </button>
          <span className="ml-auto" style={{ fontSize: 13, color: 'var(--slate)' }}>
            {filtered.length} facturi
          </span>
        </div>

        <div className="card">
          {loading ? (
            <div className="empty"><i className="ti ti-refresh" /><p>Se importă din FGO…</p></div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Furnizor</th><th>Nr. factură</th><th>Tip serviciu</th>
                  <th>Sumă</th><th>Scadență</th><th>Status</th><th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7}><div className="empty"><i className="ti ti-file-off" /><p>Nicio factură găsită.</p></div></td></tr>
                ) : filtered.map((f, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 500 }}>{f.furnizor}</td>
                    <td style={{ color: 'var(--slate)', fontSize: 12 }}>{f.nr}</td>
                    <td>{f.tip}</td>
                    <td className="amount">{fmt(f.suma)} RON</td>
                    <td style={{
                      color: f.status === 'Scadenta' ? 'var(--red)' : 'var(--slate)',
                      fontSize: 12,
                      fontWeight: f.status === 'Scadenta' ? 600 : 400
                    }}>{f.scadenta}</td>
                    <td><Badge value={f.status} /></td>
                    <td>
                      <button className="btn btn-ghost btn-sm" title="Descarcă PDF">
                        <i className="ti ti-download" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  )
}
