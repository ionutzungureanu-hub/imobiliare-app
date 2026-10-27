import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './shared/context/AuthContext'
import { MeniuProvider, useMeniu } from './shared/context/MeniuContext'
import Garda from './shared/components/Garda'
import Layout from './shared/components/Layout'

// ── Shared (rute publice / pre-autentificare) ──────────────────
import Login from './shared/pages/Login'
import Portal from './shared/pages/Portal'
import FaraAcces from './shared/pages/FaraAcces'

// ── Modul Administrare (lazy-loaded) ───────────────────────────
const Dashboard          = lazy(() => import('./modules/administrare/pages/Dashboard'))
const Clienti             = lazy(() => import('./modules/administrare/pages/Clienti'))
const ClientDetail        = lazy(() => import('./modules/administrare/pages/ClientDetail'))
const Spatii               = lazy(() => import('./modules/administrare/pages/Spatii'))
const Comunicare = lazy(() => import('./modules/administrare/pages/Comunicare'))
const Citire = lazy(() => import('./modules/administrare/pages/Citire'))
const NotaCalcul               = lazy(() => import('./modules/administrare/pages/NotaCalcul'))
const NotaAdministratie          = lazy(() => import('./modules/administrare/pages/NotaAdministratie'))
const PortalSetari                   = lazy(() => import('./modules/administrare/pages/PortalSetari'))
const IstoricSpatiu                    = lazy(() => import('./modules/administrare/pages/IstoricSpatiu'))
const Biblioteca                         = lazy(() => import('./modules/administrare/pages/Biblioteca'))
const Contracte                            = lazy(() => import('./modules/administrare/pages/Contracte'))
const Rapoarte                               = lazy(() => import('./modules/administrare/pages/Rapoarte'))
const ImportClienti                            = lazy(() => import('./modules/administrare/pages/ImportClienti'))
const Utilizatori                                = lazy(() => import('./modules/administrare/pages/Utilizatori'))
const Config                                       = lazy(() => import('./modules/administrare/pages/Config'))
const AdministrareMeniu                              = lazy(() => import('./modules/administrare/pages/AdministrareMeniu'))
const AccesImobile                                   = lazy(() => import('./modules/administrare/pages/AccesImobile'))
const PortalChiriasi                                 = lazy(() => import('./modules/administrare/pages/PortalChiriasi'))

// ── Modul Facturare (lazy-loaded) ──────────────────────────────
const Facturi                = lazy(() => import('./modules/facturare/pages/Facturi'))
const FurnizoriFacturi           = lazy(() => import('./modules/facturare/pages/FurnizoriFacturi'))

// Păstrează parametrii din URL (ex. ?clientId=...) când redirecționează spre fila potrivită din Facturi
function RedirectFacturi({ tab }) {
  const loc = useLocation()
  const p = new URLSearchParams(loc.search)
  p.set('tab', tab)
  return <Navigate to={`/facturi?${p.toString()}`} replace />
}

// Pe desktop nota de calcul face parte din Facturi; pe telefon rămâne pagina separată (din bara de jos)
function RouteNota() {
  return window.innerWidth > 768
    ? <Garda k="facturi"><RedirectFacturi tab="nota" /></Garda>
    : <Garda k="nota_calcul"><NotaCalcul /></Garda>
}

function PrivateRoute({ children }) {
  const { user, faraAcces } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return faraAcces ? <FaraAcces /> : children
}

function PageLoading() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: 'var(--slate)', fontSize: 14 }}>
      <i className="ti ti-refresh" style={{ marginRight: 8, animation: 'spin 1s linear infinite' }} />
      Se încarcă...
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <MeniuProvider>
      <BrowserRouter>
        <Suspense fallback={<PageLoading />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/portal/:token" element={<Portal />} />
            <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
              <Route index element={<Navigate to="/dashboard" replace />} />

              {/* ── Administrare ── */}
              <Route path="dashboard"        element={<Dashboard />} />
              <Route path="clienti"          element={<Garda k="clienti"><Clienti /></Garda>} />
              <Route path="clienti/:id"      element={<Garda k="clienti"><ClientDetail /></Garda>} />
              <Route path="spatii"           element={<Garda k="spatii"><Spatii /></Garda>} />
              <Route path="comunicare"       element={<Garda k="comunicare"><Comunicare /></Garda>} />
              <Route path="citire"           element={<Garda k="citire"><Citire /></Garda>} />
              <Route path="utilitati"        element={<Navigate to="/citire" replace />} />
              <Route path="nota-calcul"      element={<RouteNota />} />
              <Route path="utilizatori"      element={<Garda k="utilizatori"><Utilizatori /></Garda>} />
              <Route path="acces"            element={<Garda k="acces"><AccesImobile /></Garda>} />
              <Route path="meniu"            element={<Garda k="meniu"><AdministrareMeniu /></Garda>} />
              <Route path="portal-chiriasi"  element={<Garda k="portal"><PortalChiriasi /></Garda>} />
              <Route path="config"           element={<Garda k="config"><Config /></Garda>} />
              <Route path="import-clienti"   element={<Garda k="clienti"><ImportClienti /></Garda>} />
              <Route path="biblioteca"       element={<Garda k="biblioteca"><Biblioteca /></Garda>} />
              <Route path="utilitati-mobile" element={<Navigate to="/citire" replace />} />
              <Route path="spatii/:spatiuId/istoric" element={<Garda k="spatii"><IstoricSpatiu /></Garda>} />
              <Route path="nota-administratie"       element={<Garda k="nota"><NotaAdministratie /></Garda>} />
              <Route path="contracte"                element={<Garda k="contracte"><Contracte /></Garda>} />
              <Route path="rapoarte"                 element={<Garda k="rapoarte"><Rapoarte /></Garda>} />
              <Route path="spatii/:spatiuId/portal"  element={<Garda k="spatii"><PortalSetari /></Garda>} />
              <Route path="validare-indexuri"        element={<Navigate to="/citire?tab=validare" replace />} />

              {/* ── Facturare ── */}
              <Route path="facturi"          element={<Garda k="facturi"><Facturi /></Garda>} />
              <Route path="emite"            element={<Garda k="facturi"><RedirectFacturi tab="chirie" /></Garda>} />
              <Route path="emite-utilitati"  element={<Garda k="facturi"><RedirectFacturi tab="utilitati" /></Garda>} />
              <Route path="emise"            element={<Garda k="facturi"><RedirectFacturi tab="istoric" /></Garda>} />
              <Route path="furnizori"        element={<Garda k="furnizori"><FurnizoriFacturi /></Garda>} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
      </MeniuProvider>
    </AuthProvider>
  )
}
