import { useNavigate } from 'react-router-dom'
import Topbar from '../../../shared/components/Topbar'
import { useAuth } from '../../../shared/context/AuthContext'

// Butoane de navigare rapidă, grupate logic — fără duplicare de date din alte pagini.
// Rutele și iconițele sunt aliniate cu meniul din Layout.jsx pentru consistență.
const GRUPURI = [
  {
    titlu: 'Zilnic',
    culoare: '#1B4FD8',
    itemi: [
      { to: '/clienti',           icon: 'ti-users',    label: 'Clienți' },
      { to: '/utilitati-mobile',  icon: 'ti-bolt',      label: 'Citire rapidă' },
      { to: '/validare-indexuri', icon: 'ti-checks',   label: 'Validare indexuri' },
      { to: '/spatii',            icon: 'ti-building', label: 'Spații & Imobile', desktopOnly: true },
      { to: '/utilitati',         icon: 'ti-plug',     label: 'Utilități', desktopOnly: true },
    ],
  },
  {
    titlu: 'Documente',
    culoare: '#7c3aed',
    itemi: [
      { to: '/nota-calcul',        icon: 'ti-calculator', label: 'Notă calcul' },
      { to: '/nota-administratie', icon: 'ti-droplet',    label: 'Notă apă bloc' },
      { to: '/biblioteca',         icon: 'ti-books',      label: 'Bibliotecă' },
      { to: '/contracte',          icon: 'ti-file-text',  label: 'Contracte', desktopOnly: true },
      { to: '/rapoarte',           icon: 'ti-chart-bar',  label: 'Rapoarte', desktopOnly: true },
    ],
  },
  {
    titlu: 'Facturare',
    culoare: '#16a34a',
    itemi: [
      { to: '/emite',           icon: 'ti-file-plus', label: 'Factură chirie', desktopOnly: true },
      { to: '/emite-utilitati', icon: 'ti-receipt',   label: 'Factură utilități', desktopOnly: true },
      { to: '/emise',           icon: 'ti-files',     label: 'Facturi emise', desktopOnly: true },
      { to: '/furnizori',       icon: 'ti-file-import', label: 'Furnizori', adminOnly: true, desktopOnly: true },
    ],
  },
  {
    titlu: 'Setări',
    culoare: '#64748b',
    itemi: [
      { to: '/utilizatori', icon: 'ti-user-cog', label: 'Utilizatori', adminOnly: true, desktopOnly: true },
      { to: '/config',      icon: 'ti-settings',  label: 'Configurare', adminOnly: true, desktopOnly: true },
    ],
  },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const { profile, isAdmin } = useAuth()

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
        {GRUPURI.map(grup => {
          const itemiVizibili = grup.itemi.filter(item => !item.adminOnly || isAdmin)
          if (itemiVizibili.length === 0) return null

          return (
            <div key={grup.titlu} style={{ marginBottom: 28 }}>
              <div style={{
                fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.6px',
                color: grup.culoare, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <div style={{ width: 4, height: 14, borderRadius: 2, background: grup.culoare }} />
                {grup.titlu}
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                gap: 12,
              }}>
                {itemiVizibili.map(item => (
                  <button
                    key={item.to}
                    onClick={() => navigate(item.to)}
                    className={item.desktopOnly ? 'dashboard-btn dashboard-btn-desktop' : 'dashboard-btn'}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 10,
                      padding: '18px 16px', background: 'white', border: '1px solid var(--border)',
                      borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                      transition: 'border-color .15s, transform .1s',
                    }}
                  >
                    <div style={{
                      width: 38, height: 38, borderRadius: 10, background: grup.culoare + '18',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <i className={`ti ${item.icon}`} style={{ fontSize: 19, color: grup.culoare }} />
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Butoanele marcate desktopOnly se ascund pe ecrane înguste, consistent cu sidebar-ul */}
      <style>{`
        @media (max-width: 768px) {
          .dashboard-btn-desktop { display: none !important; }
        }
      `}</style>
    </>
  )
}
