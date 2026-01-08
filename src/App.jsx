import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'

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

// Protected Route Component
const ProtectedRoute = ({ children }) => {
    const isAuthenticated = useAuthStore(state => state.isAuthenticated)

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />
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

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    )
}

export default App
