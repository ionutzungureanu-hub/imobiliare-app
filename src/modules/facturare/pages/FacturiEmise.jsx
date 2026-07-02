import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import Topbar from '../../../shared/components/Topbar'
import Badge from '../../../shared/components/Badge'
import { useToast } from '../../../shared/components/Toast'

import { fmt } from '../../../shared/utils'

const DEMO = [
  { nr: 'FC-2025-0042', client: 'SC Beta Trading SRL', tip: 'Chirie',           perioada: 'Mai 2025', suma: 5800,  scadenta: '2025-06-05', status: 'Achitata'     },
  { nr: 'FC-2025-0043', client: 'Omega Consulting SRL', tip: 'Chirie',           perioada: 'Mai 2025', suma: 3200,  scadenta: '2025-06-05', status: 'Achitata'     },
  { nr: 'FC-2025-0044', client: 'SC Beta Trading SRL', tip: 'Utilități',         perioada: 'Mai 2025', suma: 920,   scadenta: '2025-06-15', status: 'Achitata'     },
  { nr: 'FC-2025-0045', client: 'Delta Impex SRL',     tip: 'Chirie',           perioada: 'Iun 2025', suma: 4500,  scadenta: '2025-07-01', status: 'In asteptare' },
  { nr: 'FC-2025-0046', client: 'Alpha Tech SRL',      tip: 'Chirie + Utilități',perioada: 'Iun 2025', suma: 7200,  scadenta: '2025-07-01', status: 'In asteptare' },
  { nr: 'FC-2025-0047', client: 'Omega Consulting SRL', tip: 'Chirie',           perioada: 'Iun 2025', suma: 3200,  scadenta: '2025-07-01', status: 'In asteptare' },
  { nr: 'FC-2025-0048', client: 'Delta Impex SRL',     tip: 'Utilități',         perioada: 'Iun 2025', suma: 650,   scadenta: '2025-07-05', status: 'In asteptare' },
  { nr: 'FC-2025-0039', client: 'Sigma Partners SRL',  tip: 'Chirie',           perioada: 'Apr 2025', suma: 6100,  scadenta: '2025-05-05', status: 'Restanta'     },
]

export default function FacturiEmise() {
  const navigate   = useNavigate()
  const toast      = useToast()
  const [qp]       = useSearchParams()
  const [facturi,  setFacturi]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState(qp.get('client') || '')
  const [status,   setStatus]   = useState('')
  const [luna,     setLuna]     = useState('')

  const load = async () => {
    setLoading(true)
    try {
      // date locale
      const data = []
      setFacturi(Array.isArray(data) ? data : DEMO)
    } catch {
      setFacturi(DEMO)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = facturi.filter(f =>
    (!search || f.client?.toLowerCase().includes(search.toLowerCase()) || f.nr?.toLowerCase().includes(search.toLowerCase())) &&
    (!status || f.status === status) &&
    (!luna   || f.perioada?.includes(luna))
  )

  const totalFiltrat = filtered.reduce((s, f) => s + (f.suma || 0), 0)

  return (
    <>
      <Topbar title="Facturi emise" subtitle="Toate facturile emise din FGO">
        <button className="btn btn-primary btn-sm" onClick={() => navigate('/emite')}>
          <i className="ti ti-plus" aria-hidden="true" /> Factură nouă
        </button>
      </Topbar>

      <div className="content">
        <div className="toolbar">
          <input
            type="text" placeholder="Caută client sau număr…"
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ maxWidth: 220 }}
          />
          <select value={status} onChange={e => setStatus(e.target.value)} style={{ maxWidth: 160 }}>
            <option value="">Toate statusurile</option>
            <option value="Achitata">Achitate</option>
            <option value="In asteptare">În așteptare</option>
            <option value="Restanta">Restante</option>
          </select>
          <input
            type="month" value={luna} onChange={e => setLuna(e.target.value)}
            title="Filtrează după lună" style={{ maxWidth: 160 }}
          />
          <button className="btn btn-ghost btn-sm" onClick={load}>
            <i className="ti ti-refresh" aria-hidden="true" /> Sincronizează FGO
          </button>
          <span className="ml-auto" style={{ fontSize: 13, color: 'var(--slate)' }}>
            {filtered.length} facturi · <strong>{fmt(totalFiltrat)} RON</strong>
          </span>
        </div>

        <div className="card">
          {loading ? (
            <div className="empty"><i className="ti ti-refresh" /><p>Se încarcă din FGO…</p></div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Nr. factură</th><th>Client</th><th>Tip</th>
                  <th>Perioadă</th><th>Sumă</th><th>Scadență</th><th>Status</th><th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={8}><div className="empty"><i className="ti ti-file-off" /><p>Nicio factură găsită.</p></div></td></tr>
                ) : filtered.map((f, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 500 }}>{f.nr}</td>
                    <td>{f.client}</td>
                    <td><span className="badge badge-blue">{f.tip}</span></td>
                    <td style={{ color: 'var(--slate)', fontSize: 12 }}>{f.perioada}</td>
                    <td className="amount">{fmt(f.suma)} RON</td>
                    <td style={{ color: 'var(--slate)', fontSize: 12 }}>{f.scadenta}</td>
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
