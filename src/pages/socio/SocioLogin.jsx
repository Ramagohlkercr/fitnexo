import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Dumbbell, Mail, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { useSocioStore } from '../../stores/socioStore'
import './SocioLogin.css'

const SocioLogin = () => {
    const navigate = useNavigate()
    const login = useSocioStore(state => state.login)

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            await login(email, password)
            navigate('/mi-gym')
        } catch (err) {
            setError(err.message || 'Error al iniciar sesión')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="socio-login">
            <div className="socio-login-container">
                <div className="socio-login-header">
                    <div className="socio-login-logo">
                        <Dumbbell size={32} />
                    </div>
                    <h1>Mi Gym</h1>
                    <p>Accede a tu portal de socio</p>
                </div>

                <form onSubmit={handleSubmit} className="socio-login-form">
                    {error && (
                        <div className="socio-login-error">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    <div className="socio-form-group">
                        <label>Email</label>
                        <div className="socio-input-wrapper">
                            <Mail size={18} className="socio-input-icon" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="tu@email.com"
                                required
                                autoComplete="email"
                            />
                        </div>
                    </div>

                    <div className="socio-form-group">
                        <label>Contraseña</label>
                        <div className="socio-input-wrapper">
                            <Lock size={18} className="socio-input-icon" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Tu DNI (primera vez)"
                                required
                                autoComplete="current-password"
                            />
                            <button
                                type="button"
                                className="socio-password-toggle"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        <span className="socio-form-hint">
                            Primera vez? Usa tu DNI como contraseña
                        </span>
                    </div>

                    <button
                        type="submit"
                        className="socio-login-button"
                        disabled={loading}
                    >
                        {loading ? 'Ingresando...' : 'Ingresar'}
                    </button>
                </form>

                <div className="socio-login-footer">
                    <a href="/">← Volver al inicio</a>
                </div>
            </div>
        </div>
    )
}

export default SocioLogin
