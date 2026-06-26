import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ToastProvider } from './Toast'

export default function Layout() {
  const { user, profile, isAdmin, logout } = useAuth()
  const navigate = useNavigate()
  const handleLogout = async () => { await logout(); navigate('/login') }

  const NAV_ALL = [
    { to: '/dashboard',        icon: 'ti-layout-dashboard', label: 'Dashboard',         section: 'General',     adminOnly: false },
    { to: '/clienti',          icon: 'ti-users',            label: 'Clienți',           section: 'Clienți',     adminOnly: false },
    { to: '/spatii',           icon: 'ti-building',         label: 'Spații & Imobile',  section: 'Imobile',     adminOnly: false },
    { to: '/utilitati',        icon: 'ti-plug',             label: 'Utilități',         section: 'Imobile',     adminOnly: false },
    { to: '/nota-calcul',      icon: 'ti-calculator',       label: 'Notă de calcul',    section: 'Documente',   adminOnly: false },
    { to: '/emite',            icon: 'ti-file-plus',        label: 'Factură chirie',    section: 'Documente',   adminOnly: false },
    { to: '/emite-utilitati',  icon: 'ti-receipt',          label: 'Factură utilități', section: 'Documente',   adminOnly: false },
    { to: '/emise',            icon: 'ti-files',            label: 'Facturi emise',     section: 'Documente',   adminOnly: false },
    { to: '/furnizori',        icon: 'ti-file-import',      label: 'De la furnizori',   section: 'Documente',   adminOnly: true  },
    { to: '/utilizatori',      icon: 'ti-user-cog',         label: 'Utilizatori',       section: 'Setări',      adminOnly: true  },
    { to: '/config',           icon: 'ti-settings',         label: 'Configurare',       section: 'Setări',      adminOnly: true  },
  ]

  const nav = NAV_ALL.filter(item => !item.adminOnly || isAdmin)
  let lastSection = ''

  return (
    <ToastProvider>
      <div className="app">
        <aside className="sidebar">
          <div className="sidebar-logo">
            <div className="sidebar-logo-mark">
              <i className="ti ti-building" />
              Imobiliare Admin
            </div>
            <div className="sidebar-logo-sub">KADO Excelsior</div>
          </div>

          <nav className="sidebar-nav">
            {nav.map(item => {
              const showSection = item.section !== lastSection
              if (showSection) lastSection = item.section
              return (
                <div key={item.to}>
                  {showSection && <div className="nav-section">{item.section}</div>}
                  <NavLink
                    to={item.to}
                    className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                  >
                    <i className={`ti ${item.icon}`} />
                    {item.label}
                  </NavLink>
                </div>
              )
            })}
          </nav>

          <div className="sidebar-footer">
            <div style={{ fontSize: 11, color: 'var(--slate)', marginBottom: 4, padding: '0 4px' }}>
              {profile?.nume || user?.email}
            </div>
            <div style={{ fontSize: 10, color: 'var(--blue)', marginBottom: 8, padding: '0 4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px' }}>
              {isAdmin ? '⬤ Administrator' : '⬤ Manager'}
            </div>
            <button className="btn btn-ghost btn-sm" style={{ width: '100%' }} onClick={handleLogout}>
              <i className="ti ti-logout" /> Deconectare
            </button>
          </div>
        </aside>

        <div className="main">
          <Outlet />
        </div>
      </div>
    </ToastProvider>
  )
}
