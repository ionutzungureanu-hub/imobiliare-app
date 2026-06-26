import { useState } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ToastProvider } from './Toast'

const NAV_ALL = [
  { to: '/dashboard',       icon: 'ti-layout-dashboard', label: 'Dashboard',        section: 'General',    adminOnly: false, mobile: true  },
  { to: '/clienti',         icon: 'ti-users',            label: 'Clienți',          section: 'Clienți',    adminOnly: false, mobile: true  },
  { to: '/spatii',          icon: 'ti-building',         label: 'Spații & Imobile', section: 'Imobile',    adminOnly: false, mobile: true  },
  { to: '/utilitati',       icon: 'ti-plug',             label: 'Utilități',        section: 'Imobile',    adminOnly: false, mobile: false },
  { to: '/nota-calcul',     icon: 'ti-calculator',       label: 'Notă calcul',      section: 'Documente',  adminOnly: false, mobile: true  },
  { to: '/emite',           icon: 'ti-file-plus',        label: 'Factură chirie',   section: 'Documente',  adminOnly: false, mobile: false },
  { to: '/emite-utilitati', icon: 'ti-receipt',          label: 'F. utilități',     section: 'Documente',  adminOnly: false, mobile: false },
  { to: '/emise',           icon: 'ti-files',            label: 'Facturi emise',    section: 'Documente',  adminOnly: false, mobile: false },
  { to: '/furnizori',       icon: 'ti-file-import',      label: 'Furnizori',        section: 'Documente',  adminOnly: true,  mobile: false },
  { to: '/utilizatori',     icon: 'ti-user-cog',         label: 'Utilizatori',      section: 'Setări',     adminOnly: true,  mobile: false },
  { to: '/config',          icon: 'ti-settings',         label: 'Configurare',      section: 'Setări',     adminOnly: true,  mobile: false },
]

// Bottom nav — doar 5 cele mai importante pentru mobil
const MOBILE_NAV = [
  { to: '/dashboard',   icon: 'ti-layout-dashboard', label: 'Acasă'    },
  { to: '/clienti',     icon: 'ti-users',            label: 'Clienți'  },
  { to: '/nota-calcul', icon: 'ti-calculator',       label: 'Notă'     },
  { to: '/spatii',      icon: 'ti-building',         label: 'Spații'   },
  { to: '/emite',       icon: 'ti-file-plus',        label: 'Factură'  },
]

export default function Layout() {
  const { user, profile, isAdmin, logout } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = async () => { await logout(); navigate('/login') }

  const nav = NAV_ALL.filter(item => !item.adminOnly || isAdmin)
  let lastSection = ''

  const closeSidebar = () => setSidebarOpen(false)

  return (
    <ToastProvider>
      <div className="app">

        {/* Sidebar overlay (mobile) */}
        <div
          className={`sidebar-overlay${sidebarOpen ? ' open' : ''}`}
          onClick={closeSidebar}
        />

        {/* Sidebar */}
        <aside className={`sidebar${sidebarOpen ? ' open' : ''}`}>
          <div className="sidebar-logo">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="sidebar-logo-mark">
                <i className="ti ti-building" />
                Imobiliare Admin
              </div>
              <button
                onClick={closeSidebar}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--slate)', padding: 4, display: 'none' }}
                className="sidebar-close-btn"
              >
                <i className="ti ti-x" />
              </button>
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
                    onClick={closeSidebar}
                  >
                    <i className={`ti ${item.icon}`} />
                    {item.label}
                  </NavLink>
                </div>
              )
            })}
          </nav>

          <div className="sidebar-footer">
            <div style={{ fontSize: 11, color: 'var(--slate)', marginBottom: 4, padding: '0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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

        {/* Main content */}
        <div className="main">
          {/* Topbar cu hamburger pe mobil */}
          <div className="topbar" style={{ position: 'sticky', top: 0, zIndex: 50 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button className="hamburger" onClick={() => setSidebarOpen(true)}>
                <i className="ti ti-menu-2" />
              </button>
              <div className="topbar-left">
                <h1>{getPageTitle(location.pathname)}</h1>
              </div>
            </div>
            <div className="topbar-right" id="topbar-actions" />
          </div>

          <Outlet />
        </div>

        {/* Bottom nav mobil */}
        <nav className="mobile-nav">
          <div className="mobile-nav-items">
            {MOBILE_NAV.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `mobile-nav-item${isActive ? ' active' : ''}`}
              >
                <i className={`ti ${item.icon}`} />
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>

      </div>
    </ToastProvider>
  )
}

function getPageTitle(path) {
  const map = {
    '/dashboard':       'Dashboard',
    '/clienti':         'Clienți',
    '/spatii':          'Spații & Imobile',
    '/utilitati':       'Utilități',
    '/nota-calcul':     'Notă de calcul',
    '/emite':           'Factură chirie',
    '/emite-utilitati': 'Factură utilități',
    '/emise':           'Facturi emise',
    '/furnizori':       'Furnizori',
    '/utilizatori':     'Utilizatori',
    '/config':          'Configurare',
  }
  return map[path] || map[path.split('/').slice(0, 2).join('/')] || 'Imobiliare Admin'
}
