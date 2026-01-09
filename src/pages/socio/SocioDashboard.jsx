import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
    Dumbbell, QrCode, Calendar, DoorOpen, CreditCard,
    Settings, LogOut, ChevronRight, CheckCircle, XCircle,
    Clock, Download
} from 'lucide-react'
import { useSocioStore } from '../../stores/socioStore'
import './SocioDashboard.css'

const SocioDashboard = () => {
    const navigate = useNavigate()
    const { socio, logout, fetchProfile, fetchQR } = useSocioStore()
    const [qrData, setQrData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('qr')

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        setLoading(true)
        try {
            await fetchProfile()
            const qr = await fetchQR()
            setQrData(qr)
        } catch (err) {
            console.error('Error loading data:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleLogout = () => {
        logout()
        navigate('/mi-gym/login')
    }

    const formatDate = (dateString) => {
        if (!dateString) return '-'
        return new Date(dateString).toLocaleDateString('es-AR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        })
    }

    const daysUntilExpiry = () => {
        if (!socio?.membresiaFin) return 0
        const diff = new Date(socio.membresiaFin) - new Date()
        return Math.ceil(diff / (1000 * 60 * 60 * 24))
    }

    const handleDownloadQR = () => {
        if (!qrData?.qrCode) return
        const link = document.createElement('a')
        link.download = `qr-${socio?.nombre}-${socio?.apellido}.png`
        link.href = qrData.qrCode
        link.click()
    }

    if (loading) {
        return (
            <div className="socio-dashboard">
                <div className="socio-loading">
                    <div className="spinner"></div>
                    <p>Cargando...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="socio-dashboard">
            {/* Header */}
            <header className="socio-header">
                <div className="socio-header-logo">
                    <Dumbbell size={24} />
                    <span>Mi Gym</span>
                </div>
                <button className="socio-logout-btn" onClick={handleLogout}>
                    <LogOut size={20} />
                </button>
            </header>

            {/* Welcome Card */}
            <div className="socio-welcome-card">
                <div className="socio-avatar">
                    {socio?.nombre?.charAt(0)}{socio?.apellido?.charAt(0)}
                </div>
                <div className="socio-welcome-info">
                    <h1>Hola, {socio?.nombre}!</h1>
                    <p>{socio?.gimnasio}</p>
                </div>
            </div>

            {/* Membership Status */}
            <div className={`socio-membership-card ${socio?.membresiaActiva ? 'active' : 'expired'}`}>
                <div className="socio-membership-status">
                    {socio?.membresiaActiva ? (
                        <>
                            <CheckCircle size={24} />
                            <span>Membresía Activa</span>
                        </>
                    ) : (
                        <>
                            <XCircle size={24} />
                            <span>Membresía Vencida</span>
                        </>
                    )}
                </div>
                <div className="socio-membership-details">
                    <div className="socio-membership-plan">
                        <strong>{socio?.plan || 'Sin plan'}</strong>
                    </div>
                    {socio?.membresiaActiva && daysUntilExpiry() <= 7 && (
                        <div className="socio-membership-warning">
                            <Clock size={14} />
                            Vence en {daysUntilExpiry()} días
                        </div>
                    )}
                    <div className="socio-membership-date">
                        Válida hasta: {formatDate(socio?.membresiaFin)}
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="socio-stats">
                <div className="socio-stat">
                    <DoorOpen size={20} />
                    <div className="socio-stat-value">{socio?.estadisticas?.totalAccesos || 0}</div>
                    <div className="socio-stat-label">Accesos Totales</div>
                </div>
                <div className="socio-stat">
                    <Calendar size={20} />
                    <div className="socio-stat-value">{socio?.estadisticas?.accesosMes || 0}</div>
                    <div className="socio-stat-label">Este Mes</div>
                </div>
            </div>

            {/* QR Code Section */}
            <div className="socio-qr-section">
                <h2>Tu código de acceso</h2>
                {qrData?.qrCode ? (
                    <div className="socio-qr-container">
                        <img src={qrData.qrCode} alt="Código QR" className="socio-qr-image" />
                        <p className="socio-qr-hint">Mostrá este código en la entrada</p>
                        <button className="socio-qr-download" onClick={handleDownloadQR}>
                            <Download size={16} />
                            Descargar QR
                        </button>
                    </div>
                ) : (
                    <div className="socio-qr-error">
                        No se pudo generar el código QR
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav className="socio-nav">
                <Link to="/mi-gym/accesos" className="socio-nav-item">
                    <div className="socio-nav-icon">
                        <DoorOpen size={20} />
                    </div>
                    <span>Mis Accesos</span>
                    <ChevronRight size={18} />
                </Link>
                <Link to="/mi-gym/pagos" className="socio-nav-item">
                    <div className="socio-nav-icon">
                        <CreditCard size={20} />
                    </div>
                    <span>Mis Pagos</span>
                    <ChevronRight size={18} />
                </Link>
                <Link to="/mi-gym/config" className="socio-nav-item">
                    <div className="socio-nav-icon">
                        <Settings size={20} />
                    </div>
                    <span>Configuración</span>
                    <ChevronRight size={18} />
                </Link>
            </nav>
        </div>
    )
}

export default SocioDashboard
