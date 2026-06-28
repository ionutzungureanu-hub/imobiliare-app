import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Clienti from './pages/Clienti'
import ClientDetail from './pages/ClientDetail'
import Spatii from './pages/Spatii'
import Utilitati from './pages/Utilitati'
import NotaCalcul from './pages/NotaCalcul'
import EmiteFactura from './pages/EmiteFactura'
import EmiteFacturaUtilitati from './pages/EmiteFacturaUtilitati'
import FacturiEmise from './pages/FacturiEmise'
import FurnizoriFacturi from './pages/FurnizoriFacturi'
import Utilizatori from './pages/Utilizatori'
import Config from './pages/Config'
import ImportClienti from './pages/ImportClienti'
import Biblioteca from './pages/Biblioteca'
import UtilitatiMobile from './pages/UtilitatiMobile'
import IstoricSpatiu from './pages/IstoricSpatiu'
import NotaAdministratie from './pages/NotaAdministratie'
import Portal from './pages/Portal'
import PortalSetari from './pages/PortalSetari'
import ValidareIndexuri from './pages/ValidareIndexuri'

function PrivateRoute({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/portal/:token" element={<Portal />} />
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard"        element={<Dashboard />} />
            <Route path="clienti"          element={<Clienti />} />
            <Route path="clienti/:id"      element={<ClientDetail />} />
            <Route path="spatii"           element={<Spatii />} />
            <Route path="utilitati"        element={<Utilitati />} />
            <Route path="nota-calcul"      element={<NotaCalcul />} />
            <Route path="emite"            element={<EmiteFactura />} />
            <Route path="emite-utilitati"  element={<EmiteFacturaUtilitati />} />
            <Route path="emise"            element={<FacturiEmise />} />
            <Route path="furnizori"        element={<FurnizoriFacturi />} />
            <Route path="utilizatori"      element={<Utilizatori />} />
            <Route path="config"           element={<Config />} />
            <Route path="import-clienti"   element={<ImportClienti />} />
            <Route path="biblioteca"         element={<Biblioteca />} />
            <Route path="utilitati-mobile"    element={<UtilitatiMobile />} />
            <Route path="spatii/:spatiuId/istoric" element={<IstoricSpatiu />} />
            <Route path="nota-administratie"   element={<NotaAdministratie />} />
            <Route path="spatii/:spatiuId/portal" element={<PortalSetari />} />
            <Route path="validare-indexuri"        element={<ValidareIndexuri />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
