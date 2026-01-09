import { useState, useEffect, useRef } from 'react'
import { Bell, AlertCircle, Clock, UserPlus, CreditCard, X, ChevronRight } from 'lucide-react'
import { notificacionesApi } from '../../services/api'
import './NotificationBell.css'

const NotificationBell = () => {
    const [open, setOpen] = useState(false)
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(false)
    const dropdownRef = useRef(null)

    const fetchNotifications = async () => {
        setLoading(true)
        try {
            const response = await notificacionesApi.getAll()
            setData(response)
        } catch (err) {
            console.error('Error fetching notifications:', err)
            // Demo data
            setData({
                porVencer: [
                    { id: 1, nombre: 'Juan', apellido: 'Pérez', dias_restantes: 3, mensaje: 'Membresía vence en 3 días', prioridad: 'media' },
                    { id: 2, nombre: 'María', apellido: 'García', dias_restantes: 1, mensaje: 'Membresía vence mañana', prioridad: 'alta' },
                ],
                vencidas: [
                    { id: 3, nombre: 'Carlos', apellido: 'López', dias_vencido: 5, mensaje: 'Membresía vencida hace 5 días', prioridad: 'alta' },
                ],
                pagosPendientes: [],
                nuevosMiembros: [],
                resumen: { porVencer: 2, vencidas: 1, pagosPendientes: 0, nuevosMiembros: 0, total: 3 }
            })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchNotifications()
        // Refresh every 5 minutes
        const interval = setInterval(fetchNotifications, 5 * 60 * 1000)
        return () => clearInterval(interval)
    }, [])

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const totalAlerts = data?.resumen?.total || 0

    const formatName = (item) => `${item.nombre} ${item.apellido}`

    const getIcon = (tipo) => {
        switch (tipo) {
            case 'por_vencer': return <Clock size={16} />
            case 'vencida': return <AlertCircle size={16} />
            case 'pago_pendiente': return <CreditCard size={16} />
            case 'nuevo_miembro': return <UserPlus size={16} />
            default: return <Bell size={16} />
        }
    }

    const handleItemClick = (item) => {
        // Navigate to socio detail
        window.location.href = `/socios`
        setOpen(false)
    }

    return (
        <div className="notification-bell" ref={dropdownRef}>
            <button
                className={`bell-button ${open ? 'active' : ''}`}
                onClick={() => setOpen(!open)}
            >
                <Bell size={20} />
                {totalAlerts > 0 && (
                    <span className="bell-badge">{totalAlerts > 9 ? '9+' : totalAlerts}</span>
                )}
            </button>

            {open && (
                <div className="notification-dropdown">
                    <div className="notification-header">
                        <h3>Notificaciones</h3>
                        <button className="notification-close" onClick={() => setOpen(false)}>
                            <X size={16} />
                        </button>
                    </div>

                    <div className="notification-content">
                        {loading ? (
                            <div className="notification-loading">
                                <div className="spinner-small"></div>
                                <span>Cargando...</span>
                            </div>
                        ) : totalAlerts === 0 ? (
                            <div className="notification-empty">
                                <Bell size={32} />
                                <p>No hay notificaciones</p>
                            </div>
                        ) : (
                            <>
                                {data?.vencidas?.length > 0 && (
                                    <div className="notification-section">
                                        <div className="notification-section-title">
                                            <AlertCircle size={14} />
                                            <span>Membresías Vencidas ({data.vencidas.length})</span>
                                        </div>
                                        {data.vencidas.slice(0, 3).map((item, i) => (
                                            <div
                                                key={`v-${i}`}
                                                className="notification-item priority-alta"
                                                onClick={() => handleItemClick(item)}
                                            >
                                                <div className="notification-item-icon">
                                                    {getIcon('vencida')}
                                                </div>
                                                <div className="notification-item-content">
                                                    <div className="notification-item-name">{formatName(item)}</div>
                                                    <div className="notification-item-message">{item.mensaje}</div>
                                                </div>
                                                <ChevronRight size={16} />
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {data?.porVencer?.length > 0 && (
                                    <div className="notification-section">
                                        <div className="notification-section-title">
                                            <Clock size={14} />
                                            <span>Por Vencer ({data.porVencer.length})</span>
                                        </div>
                                        {data.porVencer.slice(0, 3).map((item, i) => (
                                            <div
                                                key={`pv-${i}`}
                                                className={`notification-item priority-${item.prioridad}`}
                                                onClick={() => handleItemClick(item)}
                                            >
                                                <div className="notification-item-icon">
                                                    {getIcon('por_vencer')}
                                                </div>
                                                <div className="notification-item-content">
                                                    <div className="notification-item-name">{formatName(item)}</div>
                                                    <div className="notification-item-message">{item.mensaje}</div>
                                                </div>
                                                <ChevronRight size={16} />
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {data?.pagosPendientes?.length > 0 && (
                                    <div className="notification-section">
                                        <div className="notification-section-title">
                                            <CreditCard size={14} />
                                            <span>Pagos Pendientes ({data.pagosPendientes.length})</span>
                                        </div>
                                        {data.pagosPendientes.slice(0, 3).map((item, i) => (
                                            <div
                                                key={`pp-${i}`}
                                                className="notification-item priority-media"
                                                onClick={() => handleItemClick(item)}
                                            >
                                                <div className="notification-item-icon">
                                                    {getIcon('pago_pendiente')}
                                                </div>
                                                <div className="notification-item-content">
                                                    <div className="notification-item-name">{formatName(item)}</div>
                                                    <div className="notification-item-message">{item.mensaje}</div>
                                                </div>
                                                <ChevronRight size={16} />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {totalAlerts > 0 && (
                        <div className="notification-footer">
                            <button
                                className="notification-view-all"
                                onClick={() => { window.location.href = '/socios?filter=vencidos'; setOpen(false); }}
                            >
                                Ver todos los pendientes
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export default NotificationBell
