import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Lock, AlertCircle, CheckCircle } from 'lucide-react'
import { useSocioStore } from '../../stores/socioStore'
import './SocioPages.css'

const SocioConfig = () => {
    const { changePassword } = useSocioStore()
    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setSuccess('')

        if (newPassword !== confirmPassword) {
            setError('Las contraseñas no coinciden')
            return
        }

        if (newPassword.length < 4) {
            setError('La contraseña debe tener al menos 4 caracteres')
            return
        }

        setLoading(true)
        try {
            await changePassword(currentPassword, newPassword)
            setSuccess('Contraseña actualizada correctamente')
            setCurrentPassword('')
            setNewPassword('')
            setConfirmPassword('')
        } catch (err) {
            setError(err.message || 'Error al cambiar contraseña')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="socio-page">
            <header className="socio-page-header">
                <Link to="/mi-gym" className="socio-back-btn">
                    <ArrowLeft size={20} />
                </Link>
                <h1>Configuración</h1>
            </header>

            <div className="socio-page-content">
                <div className="socio-config-section">
                    <h2>
                        <Lock size={18} />
                        Cambiar Contraseña
                    </h2>

                    <form onSubmit={handleSubmit} className="socio-config-form">
                        {error && (
                            <div className="socio-alert error">
                                <AlertCircle size={16} />
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="socio-alert success">
                                <CheckCircle size={16} />
                                {success}
                            </div>
                        )}

                        <div className="socio-form-group">
                            <label>Contraseña Actual</label>
                            <input
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                placeholder="Tu contraseña actual"
                                required
                            />
                        </div>

                        <div className="socio-form-group">
                            <label>Nueva Contraseña</label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Nueva contraseña"
                                required
                            />
                        </div>

                        <div className="socio-form-group">
                            <label>Confirmar Contraseña</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Repetir nueva contraseña"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            className="socio-submit-btn"
                            disabled={loading}
                        >
                            {loading ? 'Guardando...' : 'Cambiar Contraseña'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}

export default SocioConfig
