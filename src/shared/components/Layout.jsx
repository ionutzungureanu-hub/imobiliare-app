import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ToastProvider, useToast } from './Toast'
import GlobalSearch from './GlobalSearch'
import { getIndexuriPrimite } from '../firebase/firestore'
import { useMeniu } from '../context/MeniuContext'

const Badge = ({ n }) => n > 0 ? (
  <span style={{ marginLeft: 'auto', background: '#9B2C2C', color: '#fff', borderRadius: 10, fontSize: 11, fontWeight: 700, padding: '1px 7px' }}>{n}</span>
) : null

// Salut o singură dată pe sesiune, cu apelativul ales în Configurare
function Salut() {
  const toast = useToast()
  const { profile } = useAuth()
  useEffect(() => {
    if (!profile?.apelativ) return
    try {
      if (sessionStorage.getItem('salut')) return
      sessionStorage.setItem('salut', '1')
    } catch {}
    const h = new Date().getHours()
    const m = h < 5 ? 'Noapte bună' : h < 12 ? 'Bună dimineața' : h < 18 ? 'Bună ziua' : 'Bună seara'
    toast(`${m}, ${profile.apelativ}!`)
  }, [profile?.apelativ])
  return null
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
  const [inAsteptare, setInAsteptare] = useState(0)
  useEffect(() => {
    getIndexuriPrimite('asteptare').then(l => setInAsteptare(l.length)).catch(() => {})
  }, [location.pathname])
  const [inchise, setInchise] = useState(() => {
    try { return JSON.parse(localStorage.getItem('nav_inchise') || '[]') } catch { return [] }
  })
  const toggleGrup = sec => setInchise(prev => {
    const nou = prev.includes(sec) ? prev.filter(x => x !== sec) : [...prev, sec]
    try { localStorage.setItem('nav_inchise', JSON.stringify(nou)) } catch {}
    return nou
  })
  const { moduleMeniu, bara } = useMeniu()
  // Meniul decide ce se vede (Setări → Administrare meniu)
  const nav = moduleMeniu().map(m => ({ to: m.to, icon: m.icon, label: m.label, section: m.section, badge: m.badge }))
  const MOBILE_NAV = bara().map(m => ({ to: m.to, icon: m.icon, label: m.scurt || m.label, badge: m.badge }))
  let lastSection = ''

  return (
    <ToastProvider>
      <Salut />
      <div className="app">
        <div className={`sidebar-overlay${sidebarOpen ? ' open' : ''}`} onClick={() => setSidebarOpen(false)} />

        <aside className={`sidebar${sidebarOpen ? ' open' : ''}`}>
          <div className="sidebar-logo">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <img src="/logo-rentis-mark-light.png" alt="Rentis" style={{ width: 168, height: 'auto', display: 'block' }} />
              <button onClick={() => setSidebarOpen(false)} className="sidebar-close-btn"
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#D9BF8A', padding: 4, display: 'none' }}>
                <i className="ti ti-x" />
              </button>
            </div>
            <div className="sidebar-logo-sub">Intelligent Property Management</div>
          </div>

          <nav className="sidebar-nav">
            {nav.map(item => {
              const showSection = item.section !== lastSection
              if (showSection) lastSection = item.section
              const activ = nav.some(n => n.section === item.section && location.pathname.startsWith(n.to))
              const inchis = inchise.includes(item.section) && !activ
              const singur = nav.filter(n => n.section === item.section).length === 1
              return (
                <div key={item.to}>
                  {showSection && (
                    <div className="nav-section" onClick={() => !singur && toggleGrup(item.section)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: singur ? 'default' : 'pointer', userSelect: 'none', marginTop: 8 }}>
                      {item.section}
                      {!singur && <i className={`ti ${inchis ? 'ti-chevron-right' : 'ti-chevron-down'}`} style={{ fontSize: 12 }} />}
                    </div>
                  )}
                  {!inchis && (
                    <NavLink to={item.to} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                      onClick={() => setSidebarOpen(false)}>
                      <i className={`ti ${item.icon}`} />
                      {item.label}
                      {item.badge && <Badge n={inAsteptare} />}
                    </NavLink>
                  )}
                </div>
              )
            })}
          </nav>

          <div className="sidebar-footer">
            <div style={{ fontSize: 12, color: '#F3EEE3', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {profile?.nume || user?.email}
            </div>
            <div style={{ fontSize: 10, color: '#D9BF8A', marginBottom: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.16em' }}>
              {isAdmin ? '⬤ Administrator' : '⬤ Manager'}
            </div>
            <button className="btn btn-ghost btn-sm sidebar-logout" style={{ width: '100%' }} onClick={handleLogout}>
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
            <GlobalSearch isAdmin={isAdmin} isMobile={isMobile} />
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
                {item.badge && inAsteptare > 0 && (
                  <span style={{ position: 'absolute', top: 2, right: '22%', background: '#9B2C2C', color: '#fff', borderRadius: 10, fontSize: 10, fontWeight: 700, padding: '0 5px' }}>{inAsteptare}</span>
                )}
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
    '/utilitati-mobile': 'Citire rapidă', '/citire': 'Citire indexuri', '/comunicare': 'Comunicare', '/facturi': 'Facturi',
    '/nota-calcul': 'Notă de calcul', '/nota-administratie': 'Notă apă bloc',
    '/validare-indexuri': 'Validare indexuri',
    '/biblioteca': 'Bibliotecă', '/contracte': 'Contracte', '/rapoarte': 'Rapoarte',
    '/emite': 'Factură chirie',
    '/emite-utilitati': 'Factură utilități', '/emise': 'Facturi emise',
    '/furnizori': 'Furnizori', '/utilizatori': 'Utilizatori', '/config': 'Configurare',
    '/acces': 'Acces imobile', '/meniu': 'Administrare meniu', '/portal-chiriasi': 'Portal chiriași',
  }
  return map[path] || map[path.split('/').slice(0, 2).join('/')] || 'Rentis'
}
