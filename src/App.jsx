import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import { useSocioStore } from './stores/socioStore'

// Layouts
import AdminLayout from './components/layout/AdminLayout'
import AuthLayout from './components/layout/AuthLayout'

// Pages - Auth
import Login from './pages/auth/Login'

// Pages - Admin
import Dashboard from './pages/admin/Dashboard'
import Socios from './pages/admin/Socios'
import Planes from './pages/admin/Planes'
import Pagos from './pages/admin/Pagos'
import Accesos from './pages/admin/Accesos'
import Configuracion from './pages/admin/Configuracion'

// Pages - Socio Portal
import SocioLogin from './pages/socio/SocioLogin'
import SocioDashboard from './pages/socio/SocioDashboard'
import SocioAccesos from './pages/socio/SocioAccesos'
import SocioPagos from './pages/socio/SocioPagos'
import SocioConfig from './pages/socio/SocioConfig'

// Protected Route Component for Admin
const ProtectedRoute = ({ children }) => {
    const isAuthenticated = useAuthStore(state => state.isAuthenticated)

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />
    }

    return children
}

// Protected Route Component for Socio
const SocioProtectedRoute = ({ children }) => {
    const isAuthenticated = useSocioStore(state => state.isAuthenticated)

    if (!isAuthenticated) {
        return <Navigate to="/mi-gym/login" replace />
    }

    return children
}

function App() {
    return (
        <Routes>
            {/* Auth Routes */}
            <Route element={<AuthLayout />}>
                <Route path="/login" element={<Login />} />
            </Route>

            {/* Admin Routes */}
            <Route
                path="/"
                element={
                    <ProtectedRoute>
                        <AdminLayout />
                    </ProtectedRoute>
                }
            >
                <Route index element={<Dashboard />} />
                <Route path="socios" element={<Socios />} />
                <Route path="planes" element={<Planes />} />
                <Route path="pagos" element={<Pagos />} />
                <Route path="accesos" element={<Accesos />} />
                <Route path="configuracion" element={<Configuracion />} />
                <Route path="configuracion/mercadopago/callback" element={<Configuracion />} />
            </Route>

            {/* Socio Portal Routes */}
            <Route path="/mi-gym/login" element={<SocioLogin />} />
            <Route
                path="/mi-gym"
                element={
                    <SocioProtectedRoute>
                        <SocioDashboard />
                    </SocioProtectedRoute>
                }
            />
            <Route
                path="/mi-gym/accesos"
                element={
                    <SocioProtectedRoute>
                        <SocioAccesos />
                    </SocioProtectedRoute>
                }
            />
            <Route
                path="/mi-gym/pagos"
                element={
                    <SocioProtectedRoute>
                        <SocioPagos />
                    </SocioProtectedRoute>
                }
            />
            <Route
                path="/mi-gym/config"
                element={
                    <SocioProtectedRoute>
                        <SocioConfig />
                    </SocioProtectedRoute>
                }
            />

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    )
}

export default App
