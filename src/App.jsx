import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
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
const Utilitati             = lazy(() => import('./modules/administrare/pages/Utilitati'))
const UtilitatiMobile        = lazy(() => import('./modules/administrare/pages/UtilitatiMobile'))
const NotaCalcul               = lazy(() => import('./modules/administrare/pages/NotaCalcul'))
const NotaAdministratie          = lazy(() => import('./modules/administrare/pages/NotaAdministratie'))
const ValidareIndexuri             = lazy(() => import('./modules/administrare/pages/ValidareIndexuri'))
const PortalSetari                   = lazy(() => import('./modules/administrare/pages/PortalSetari'))
const IstoricSpatiu                    = lazy(() => import('./modules/administrare/pages/IstoricSpatiu'))
const Biblioteca                         = lazy(() => import('./modules/administrare/pages/Biblioteca'))
const Contracte                            = lazy(() => import('./modules/administrare/pages/Contracte'))
const Rapoarte                               = lazy(() => import('./modules/administrare/pages/Rapoarte'))
const ImportClienti                            = lazy(() => import('./modules/administrare/pages/ImportClienti'))
const Utilizatori                                = lazy(() => import('./modules/administrare/pages/Utilizatori'))
const Config                                       = lazy(() => import('./modules/administrare/pages/Config'))

// ── Modul Facturare (lazy-loaded) ──────────────────────────────
const EmiteFactura          = lazy(() => import('./modules/facturare/pages/EmiteFactura'))
const EmiteFacturaUtilitati  = lazy(() => import('./modules/facturare/pages/EmiteFacturaUtilitati'))
const FacturiEmise             = lazy(() => import('./modules/facturare/pages/FacturiEmise'))
const FurnizoriFacturi           = lazy(() => import('./modules/facturare/pages/FurnizoriFacturi'))

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
              <Route path="utilitati"        element={<Utilitati />} />
              <Route path="nota-calcul"      element={<NotaCalcul />} />
              <Route path="utilizatori"      element={<Utilizatori />} />
              <Route path="config"           element={<Config />} />
              <Route path="import-clienti"   element={<ImportClienti />} />
              <Route path="biblioteca"       element={<Biblioteca />} />
              <Route path="utilitati-mobile" element={<UtilitatiMobile />} />
              <Route path="spatii/:spatiuId/istoric" element={<IstoricSpatiu />} />
              <Route path="nota-administratie"       element={<NotaAdministratie />} />
              <Route path="contracte"                element={<Contracte />} />
              <Route path="rapoarte"                 element={<Rapoarte />} />
              <Route path="spatii/:spatiuId/portal"  element={<PortalSetari />} />
              <Route path="validare-indexuri"        element={<ValidareIndexuri />} />

              {/* ── Facturare ── */}
              <Route path="emite"            element={<EmiteFactura />} />
              <Route path="emite-utilitati"  element={<EmiteFacturaUtilitati />} />
              <Route path="emise"            element={<FacturiEmise />} />
              <Route path="furnizori"        element={<FurnizoriFacturi />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  )
}
