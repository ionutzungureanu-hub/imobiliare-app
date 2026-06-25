import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ToastProvider } from './Toast'

const NAV = [
  { to: '/dashboard', icon: 'ti-layout-dashboard', label: 'Dashboard', section: 'General' },
  { to: '/clienti',   icon: 'ti-users',             label: 'Clienți',   section: 'General' },
  { to: '/emite',     icon: 'ti-file-plus',          label: 'Emite factură', section: 'Facturare' },
  { to: '/emise',     icon: 'ti-files',              label: 'Facturi emise', section: 'Facturare' },
  { to: '/furnizori', icon: 'ti-file-import',        label: 'De la furnizori', section: 'Facturare' },
  { to: '/config',    icon: 'ti-settings',           label: 'Configurare', section: 'Setări' },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  let lastSection = ''

  return (
    <ToastProvider>
      <div className="app">
        <aside className="sidebar">
          <div className="sidebar-logo">
            <div className="sidebar-logo-mark">
              <i className="ti ti-building" aria-hidden="true" />
              Imobiliare Admin
            </div>
            <div className="sidebar-logo-sub">Conectat cu FGO</div>
          </div>

          <nav className="sidebar-nav">
            {NAV.map(item => {
              const showSection = item.section !== lastSection
              if (showSection) lastSection = item.section
              return (
                <div key={item.to}>
                  {showSection && (
                    <div className="nav-section">{item.section}</div>
                  )}
                  <NavLink
                    to={item.to}
                    className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                  >
                    <i className={`ti ${item.icon}`} aria-hidden="true" />
                    {item.label}
                  </NavLink>
                </div>
              )
            })}
          </nav>

          <div className="sidebar-footer">
            <div style={{ fontSize: 11, color: 'var(--slate)', marginBottom: 8, padding: '0 4px' }}>
              {user?.email}
            </div>
            <button className="btn btn-ghost btn-sm" style={{ width: '100%' }} onClick={handleLogout}>
              <i className="ti ti-logout" aria-hidden="true" /> Deconectare
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
