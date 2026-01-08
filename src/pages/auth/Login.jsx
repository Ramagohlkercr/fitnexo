import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { Button, Input } from '../../components/ui'
import { useAuthStore } from '../../stores/authStore'
import { authApi } from '../../services/api'
import './Login.css'

const Login = () => {
    const navigate = useNavigate()
    const login = useAuthStore(state => state.login)

    const [formData, setFormData] = useState({
        email: '',
        password: ''
    })
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        })
        setError('')
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            // Intentar login con API real
            const response = await authApi.login(formData.email, formData.password)

            login(response.user, response.token, response.gimnasio)
            navigate('/')
        } catch (err) {
            // Si falla la API (servidor no disponible), usar modo demo
            if (err.message.includes('fetch') || err.message.includes('Failed')) {
                console.log('API no disponible, usando modo demo')
                if (formData.email && formData.password) {
                    const userData = {
                        id: '1',
                        nombre: 'Admin',
                        email: formData.email,
                        rol: 'Administrador'
                    }
                    const gimnasioData = {
                        id: '1',
                        nombre: 'FitNexo Demo',
                    }
                    login(userData, 'demo-token', gimnasioData)
                    navigate('/')
                    return
                }
            }
            setError(err.message || 'Error al iniciar sesión. Intenta de nuevo.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="login-card">
            <div className="login-header">
                <h2 className="login-title">Bienvenido</h2>
                <p className="login-subtitle">Ingresa tus credenciales para continuar</p>
            </div>

            <form className="login-form" onSubmit={handleSubmit}>
                {error && (
                    <div className="login-error">
                        {error}
                    </div>
                )}

                <Input
                    label="Email"
                    type="email"
                    name="email"
                    placeholder="tu@email.com"
                    value={formData.email}
                    onChange={handleChange}
                    icon={Mail}
                    required
                />

                <div className="login-password-wrapper">
                    <Input
                        label="Contraseña"
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={handleChange}
                        icon={Lock}
                        required
                    />
                    <button
                        type="button"
                        className="login-password-toggle"
                        onClick={() => setShowPassword(!showPassword)}
                    >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                </div>

                <div className="login-options">
                    <label className="login-remember">
                        <input type="checkbox" />
                        <span>Recordarme</span>
                    </label>
                    <a href="#" className="login-forgot">¿Olvidaste tu contraseña?</a>
                </div>

                <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    fullWidth
                    loading={loading}
                >
                    Iniciar Sesión
                </Button>
            </form>

            <div className="login-demo">
                <p>Demo: Ingresa cualquier email y contraseña</p>
            </div>
        </div>
    )
}

export default Login
