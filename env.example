import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Topbar from '../components/Topbar'
import Badge from '../components/Badge'
import { useAuth } from '../context/AuthContext'
import { useImobile } from '../hooks/useImobile'
import { getClienti, getSpatii, getEmailuriClient } from '../firebase/firestore'
import { fmt } from '../utils'

export default function Dashboard() {
  const navigate       = useNavigate()
  const { profile, isAdmin } = useAuth()
  const { imobile }    = useImobile()

  const [clienti,  setClienti]  = useState([])
  const [spatii,   setSpatii]   = useState([])
  const [emailuri, setEmailuri] = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    const imobileIds = imobile.map(im => im.id)
    Promise.all([getClienti(), getSpatii()]).then(async ([cl, sp]) => {
      const spFiltrate = sp.filter(s => imobileIds.includes(s.imobilId))
      setClienti(cl)
      setSpatii(spFiltrate)
      // Ultimele emailuri/facturi trimise
      const toate = []
      for (const c of cl.slice(0, 5)) {
        const em = await getEmailuriClient(c.id)
        toate.push(...em.map(e => ({ ...e, clientNume: c.nume })))
      }
      setEmailuri(toate.sort((a, b) => (b.trimisLa?.seconds || 0) - (a.trimisLa?.seconds || 0)).slice(0, 8))
      setLoading(false)
    })
  }, [imobile])

  const spatiiOcupate = spatii.filter(s => s.status === 'Ocupat').length
  const spatiiLibere  = spatii.filter(s => s.status === 'Liber').length

  if (loading) return (
    <div className="content" style={{ paddingTop: 48, textAlign: 'center', color: 'var(--slate)' }}>
      Se încarcă…
    </div>
  )

  return (
    <>
      <Topbar title="Dashboard" subtitle={`Bun venit, ${profile?.nume || 'Utilizator'}!`}>
        <button className="btn btn-primary btn-sm" onClick={() => navigate('/nota-calcul')}>
          <i className="ti ti-calculator" /> Notă de calcul
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/emite')}>
          <i className="ti ti-file-plus" /> Factură nouă
        </button>
      </Topbar>

      <div className="content">
        {/* Stat cards */}
        <div className="stat-grid" style={{ marginBottom: 24 }}>
          <div className="stat-card">
            <div className="stat-label">Imobile accesibile</div>
            <div className="stat-value">{imobile.length} <span>imobile</span></div>
            <div className="stat-meta">
              <span className="badge badge-blue">{isAdmin ? 'Acces total' : 'Acces parțial'}</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Spații ocupate</div>
            <div className="stat-value" style={{ color: 'var(--green)' }}>
              {spatiiOcupate} <span style={{ fontSize: 14 }}>/ {spatii.length}</span>
            </div>
            <div className="stat-meta">
              <span className="badge badge-amber">{spatiiLibere} libere</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Clienți activi</div>
            <div className="stat-value">{clienti.length} <span>clienți</span></div>
            <div className="stat-meta">
              <span className="badge badge-green">
                <i className="ti ti-users" style={{ fontSize: 11 }} /> în baza de date
              </span>
            </div>
          </div>
        </div>

        <div className="two-col">
          {/* Spații */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Spații</div>
                <div className="card-subtitle">Status per imobil</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/spatii')}>
                Vezi toate
              </button>
            </div>
            <table>
              <thead><tr><th>Spațiu</th><th>Imobil</th><th>Client</th><th>Status</th></tr></thead>
              <tbody>
                {spatii.length === 0 ? (
                  <tr><td colSpan={4}>
                    <div className="empty"><i className="ti ti-building" /><p>Niciun spațiu adăugat.</p></div>
                  </td></tr>
                ) : spatii.slice(0, 6).map(sp => {
                  const im = imobile.find(i => i.id === sp.imobilId)
                  const cl = clienti.find(c => c.id === sp.clientId)
                  return (
                    <tr key={sp.id}>
                      <td style={{ fontWeight: 500 }}>{sp.denumire}</td>
                      <td style={{ fontSize: 12, color: 'var(--slate)' }}>{im?.nume || '—'}</td>
                      <td style={{ fontSize: 12 }}>{cl?.nume || <span style={{ color: 'var(--slate)' }}>—</span>}</td>
                      <td>
                        <span className={`badge ${sp.status === 'Ocupat' ? 'badge-green' : sp.status === 'Rezervat' ? 'badge-amber' : 'badge-gray'}`}>
                          {sp.status || 'Liber'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Activitate recentă */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Activitate recentă</div>
                <div className="card-subtitle">Ultimele documente trimise</div>
              </div>
            </div>
            <table>
              <thead><tr><th>Client</th><th>Tip</th><th>Subiect</th></tr></thead>
              <tbody>
                {emailuri.length === 0 ? (
                  <tr><td colSpan={3}>
                    <div className="empty"><i className="ti ti-mail" /><p>Nicio activitate recentă.</p></div>
                  </td></tr>
                ) : emailuri.map((em, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 500, fontSize: 12 }}>{em.clientNume}</td>
                    <td>
                      <span className={`badge ${
                        em.tip === 'factura' ? 'badge-blue' :
                        em.tip === 'nota_calcul' ? 'badge-green' :
                        'badge-gray'
                      }`} style={{ fontSize: 10 }}>
                        {em.tip === 'factura' ? 'Factură' :
                         em.tip === 'nota_calcul' ? 'Notă calcul' :
                         em.tip === 'factura_utilitati' ? 'Utilități' : 'Email'}
                      </span>
                    </td>
                    <td style={{ fontSize: 11, color: 'var(--slate)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {em.subiect}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Clienți rapizi */}
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-header">
            <div className="card-title">Clienți</div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/clienti')}>
              Vezi toți
            </button>
          </div>
          <table>
            <thead><tr><th>Denumire</th><th>Email</th><th>Telefon</th><th></th></tr></thead>
            <tbody>
              {clienti.length === 0 ? (
                <tr><td colSpan={4}>
                  <div className="empty"><i className="ti ti-users" /><p>Niciun client adăugat.</p></div>
                </td></tr>
              ) : clienti.slice(0, 5).map(c => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 500 }}>{c.nume}</td>
                  <td style={{ color: 'var(--slate)', fontSize: 12 }}>{c.email}</td>
                  <td style={{ color: 'var(--slate)', fontSize: 12 }}>{c.telefon}</td>
                  <td>
                    <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/clienti/${c.id}`)}>
                      <i className="ti ti-message-circle" />
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
