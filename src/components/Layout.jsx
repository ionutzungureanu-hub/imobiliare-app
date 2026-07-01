import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ToastProvider } from './Toast'

const NAV_ALL = [
  { to: '/dashboard',       icon: 'ti-layout-dashboard', label: 'Dashboard',        section: 'General',    adminOnly: false },
  { to: '/clienti',         icon: 'ti-users',            label: 'Clienți',          section: 'Clienți',    adminOnly: false },
  { to: '/spatii',          icon: 'ti-building',         label: 'Spații & Imobile', section: 'Imobile',    adminOnly: false, desktopOnly: true },
  { to: '/utilitati',       icon: 'ti-plug',             label: 'Utilități',        section: 'Imobile',    adminOnly: false, desktopOnly: true },
  { to: '/utilitati-mobile',icon: 'ti-bolt',            label: 'Citire rapidă',    section: 'Imobile',    adminOnly: false },
  { to: '/nota-calcul',       icon: 'ti-calculator',     label: 'Notă calcul',      section: 'Documente',  adminOnly: false },
  { to: '/nota-administratie', icon: 'ti-droplet',       label: 'Notă apă bloc',    section: 'Documente',  adminOnly: false },
  { to: '/validare-indexuri',  icon: 'ti-checks',        label: 'Validare indexuri', section: 'Documente',  adminOnly: false },
  { to: '/emite',           icon: 'ti-file-plus',        label: 'Factură chirie',   section: 'Documente',  adminOnly: false, desktopOnly: true },
  { to: '/emite-utilitati', icon: 'ti-receipt',          label: 'F. utilități',     section: 'Documente',  adminOnly: false, desktopOnly: true },
  { to: '/emise',           icon: 'ti-files',            label: 'Facturi emise',    section: 'Documente',  adminOnly: false, desktopOnly: true },
  { to: '/furnizori',       icon: 'ti-file-import',      label: 'Furnizori',        section: 'Documente',  adminOnly: true,  desktopOnly: true },
  { to: '/biblioteca',      icon: 'ti-books',            label: 'Bibliotecă',       section: 'Bibliotecă', adminOnly: false, desktopOnly: true },
  { to: '/contracte',       icon: 'ti-file-text',        label: 'Contracte',        section: 'Bibliotecă', adminOnly: false, desktopOnly: true },
  { to: '/rapoarte',        icon: 'ti-chart-bar',        label: 'Rapoarte',         section: 'Rapoarte',   adminOnly: false, desktopOnly: true },
  { to: '/utilizatori',     icon: 'ti-user-cog',         label: 'Utilizatori',      section: 'Setări',     adminOnly: true,  desktopOnly: true },
  { to: '/config',          icon: 'ti-settings',         label: 'Configurare',      section: 'Setări',     adminOnly: true,  desktopOnly: true },
]

const MOBILE_NAV = [
  { to: '/dashboard',         icon: 'ti-layout-dashboard', label: 'Acasă'    },
  { to: '/clienti',           icon: 'ti-users',            label: 'Clienți'  },
  { to: '/nota-calcul',       icon: 'ti-calculator',       label: 'Notă'     },
  { to: '/utilitati-mobile',  icon: 'ti-bolt',             label: 'Index'    },
  { to: '/validare-indexuri', icon: 'ti-checks',           label: 'Validare' },
]

function AdminChirieLogo({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" rx="16" fill="#1B4FD8"/>
      <polygon points="50,18 80,40 80,75 20,75 20,40" fill="white"/>
      <rect x="40" y="55" width="20" height="20" rx="2" fill="#1B4FD8"/>
      <circle cx="58" cy="65" r="2" fill="white"/>
      <polyline points="16,43 50,15 84,43" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export default function Layout() {
  const { user, profile, isAdmin, logout } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = async () => { await logout(); navigate('/login') }
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  const nav = NAV_ALL.filter(item =>
    (!item.adminOnly || isAdmin) &&
    (!item.desktopOnly || !isMobile)
  )
  let lastSection = ''

  return (
    <ToastProvider>
      <div className="app">
        <div className={`sidebar-overlay${sidebarOpen ? ' open' : ''}`} onClick={() => setSidebarOpen(false)} />

        <aside className={`sidebar${sidebarOpen ? ' open' : ''}`}>
          <div className="sidebar-logo">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="sidebar-logo-mark" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <AdminChirieLogo size={28} />
                <span>AdminChirie</span>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="sidebar-close-btn"
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--slate)', padding: 4, display: 'none' }}>
                <i className="ti ti-x" />
              </button>
            </div>
            <div className="sidebar-logo-sub">Gestionare imobile</div>
          </div>

          <nav className="sidebar-nav">
            {nav.map(item => {
              const showSection = item.section !== lastSection
              if (showSection) lastSection = item.section
              return (
                <div key={item.to}>
                  {showSection && <div className="nav-section">{item.section}</div>}
                  <NavLink to={item.to} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                    onClick={() => setSidebarOpen(false)}>
                    <i className={`ti ${item.icon}`} />
                    {item.label}
                  </NavLink>
                </div>
              )
            })}
          </nav>

          <div className="sidebar-footer">
            <div style={{ fontSize: 11, color: 'var(--slate)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {profile?.nume || user?.email}
            </div>
            <div style={{ fontSize: 10, color: 'var(--blue)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px' }}>
              {isAdmin ? '⬤ Administrator' : '⬤ Manager'}
            </div>
            <button className="btn btn-ghost btn-sm" style={{ width: '100%' }} onClick={handleLogout}>
              <i className="ti ti-logout" /> Deconectare
            </button>
          </div>
        </aside>

        <div className="main">
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

        <nav className="mobile-nav">
          <div className="mobile-nav-items">
            {MOBILE_NAV.map(item => (
              <NavLink key={item.to} to={item.to}
                className={({ isActive }) => `mobile-nav-item${isActive ? ' active' : ''}`}>
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
    '/dashboard': 'Dashboard', '/clienti': 'Clienți',
    '/spatii': 'Spații & Imobile', '/utilitati': 'Utilități',
    '/nota-calcul': 'Notă de calcul', '/emite': 'Factură chirie',
    '/emite-utilitati': 'Factură utilități', '/emise': 'Facturi emise',
    '/furnizori': 'Furnizori', '/utilizatori': 'Utilizatori', '/config': 'Configurare',
  }
  return map[path] || map[path.split('/').slice(0, 2).join('/')] || 'AdminChirie'
}
