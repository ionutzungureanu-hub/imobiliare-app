import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './shared/context/AuthContext'
import Layout from './shared/components/Layout'

// ── Shared (rute publice / pre-autentificare) ──────────────────
import Login from './shared/pages/Login'
import Portal from './shared/pages/Portal'

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
  return window.innerWidth > 768 ? <RedirectFacturi tab="nota" /> : <NotaCalcul />
}

function PrivateRoute({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" replace />
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
      <BrowserRouter>
        <Suspense fallback={<PageLoading />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/portal/:token" element={<Portal />} />
            <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
              <Route index element={<Navigate to="/dashboard" replace />} />

              {/* ── Administrare ── */}
              <Route path="dashboard"        element={<Dashboard />} />
              <Route path="clienti"          element={<Clienti />} />
              <Route path="clienti/:id"      element={<ClientDetail />} />
              <Route path="spatii"           element={<Spatii />} />
              <Route path="comunicare"       element={<Comunicare />} />
              <Route path="citire"           element={<Citire />} />
              <Route path="utilitati"        element={<Navigate to="/citire" replace />} />
              <Route path="nota-calcul"      element={<RouteNota />} />
              <Route path="utilizatori"      element={<Utilizatori />} />
              <Route path="config"           element={<Config />} />
              <Route path="import-clienti"   element={<ImportClienti />} />
              <Route path="biblioteca"       element={<Biblioteca />} />
              <Route path="utilitati-mobile" element={<Navigate to="/citire" replace />} />
              <Route path="spatii/:spatiuId/istoric" element={<IstoricSpatiu />} />
              <Route path="nota-administratie"       element={<NotaAdministratie />} />
              <Route path="contracte"                element={<Contracte />} />
              <Route path="rapoarte"                 element={<Rapoarte />} />
              <Route path="spatii/:spatiuId/portal"  element={<PortalSetari />} />
              <Route path="validare-indexuri"        element={<Navigate to="/citire?tab=validare" replace />} />

              {/* ── Facturare ── */}
              <Route path="facturi"          element={<Facturi />} />
              <Route path="emite"            element={<RedirectFacturi tab="chirie" />} />
              <Route path="emite-utilitati"  element={<RedirectFacturi tab="utilitati" />} />
              <Route path="emise"            element={<RedirectFacturi tab="istoric" />} />
              <Route path="furnizori"        element={<FurnizoriFacturi />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  )
}
