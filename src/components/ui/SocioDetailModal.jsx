import { useState, useEffect } from 'react'
import {
    X, CreditCard, DoorOpen, Calendar, DollarSign,
    Clock, CheckCircle, XCircle, User, TrendingUp
} from 'lucide-react'
import { Button } from './index'
import { sociosApi } from '../../services/api'

const SocioDetailModal = ({ socioId, onClose, onEdit }) => {
    const [loading, setLoading] = useState(true)
    const [socio, setSocio] = useState(null)
    const [activeTab, setActiveTab] = useState('info')
    const [error, setError] = useState('')

    useEffect(() => {
        fetchSocio()
    }, [socioId])

    const fetchSocio = async () => {
        setLoading(true)
        setError('')
        try {
            const data = await sociosApi.getById(socioId)
            setSocio(data)
        } catch (err) {
            setError(err.message || 'Error al cargar datos')
        } finally {
            setLoading(false)
        }
    }

    const formatDate = (dateString) => {
        if (!dateString) return '-'
        return new Date(dateString).toLocaleDateString('es-AR')
    }

    const formatDateTime = (dateString) => {
        if (!dateString) return '-'
        return new Date(dateString).toLocaleString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
            minimumFractionDigits: 0
        }).format(value || 0)
    }

    const tabs = [
        { id: 'info', label: 'Información', icon: User },
        { id: 'pagos', label: 'Pagos', icon: CreditCard },
        { id: 'accesos', label: 'Accesos', icon: DoorOpen },
        { id: 'membresias', label: 'Membresías', icon: Calendar },
    ]

    if (loading) {
        return (
            <div className="modal-overlay" onClick={onClose}>
                <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
                    <div className="modal-body">
                        <div className="socio-detail-loading">
                            <div className="spinner"></div>
                            <p>Cargando perfil...</p>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    if (error || !socio) {
        return (
            <div className="modal-overlay" onClick={onClose}>
                <div className="modal" onClick={e => e.stopPropagation()}>
                    <div className="modal-body">
                        <div className="socio-detail-error">
                            <XCircle size={48} />
                            <p>{error || 'No se pudo cargar el socio'}</p>
                            <Button variant="secondary" onClick={onClose}>Cerrar</Button>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal modal-xl" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Perfil del Socio</h2>
                    <button className="modal-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="modal-body socio-detail-body">
                    {/* Header con info básica */}
                    <div className="socio-detail-header">
                        <div className="socio-detail-avatar">
                            {socio.nombre?.charAt(0)}{socio.apellido?.charAt(0)}
                        </div>
                        <div className="socio-detail-info">
                            <h3>{socio.nombre} {socio.apellido}</h3>
                            <p>DNI: {socio.dni}</p>
                            <span className={`status-badge status-${socio.membresia_estado === 'activa' ? 'activo' : 'vencido'}`}>
                                {socio.membresia_estado === 'activa' ? 'Membresía Activa' : 'Sin membresía activa'}
                            </span>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="socio-stats-grid">
                        <div className="socio-stat-card">
                            <DoorOpen size={20} />
                            <div className="socio-stat-value">{socio.estadisticas?.totalAccesos || 0}</div>
                            <div className="socio-stat-label">Accesos Totales</div>
                        </div>
                        <div className="socio-stat-card">
                            <Clock size={20} />
                            <div className="socio-stat-value">{socio.estadisticas?.accesosMes || 0}</div>
                            <div className="socio-stat-label">Este Mes</div>
                        </div>
                        <div className="socio-stat-card">
                            <DollarSign size={20} />
                            <div className="socio-stat-value">{formatCurrency(socio.estadisticas?.totalPagado)}</div>
                            <div className="socio-stat-label">Total Pagado</div>
                        </div>
                        <div className="socio-stat-card">
                            <Calendar size={20} />
                            <div className="socio-stat-value">{socio.estadisticas?.totalMembresias || 0}</div>
                            <div className="socio-stat-label">Membresías</div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="socio-tabs">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                className={`socio-tab ${activeTab === tab.id ? 'active' : ''}`}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                <tab.icon size={16} />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    <div className="socio-tab-content">
                        {activeTab === 'info' && (
                            <div className="socio-info-grid">
                                <div className="socio-info-item">
                                    <label>Email</label>
                                    <span>{socio.email || '-'}</span>
                                </div>
                                <div className="socio-info-item">
                                    <label>Teléfono</label>
                                    <span>{socio.telefono || '-'}</span>
                                </div>
                                <div className="socio-info-item">
                                    <label>Dirección</label>
                                    <span>{socio.direccion || '-'}</span>
                                </div>
                                <div className="socio-info-item">
                                    <label>Plan Actual</label>
                                    <span>{socio.plan_nombre || 'Sin plan'}</span>
                                </div>
                                <div className="socio-info-item">
                                    <label>Vencimiento</label>
                                    <span>{formatDate(socio.membresia_fin)}</span>
                                </div>
                                <div className="socio-info-item">
                                    <label>Miembro desde</label>
                                    <span>{formatDate(socio.created_at)}</span>
                                </div>
                                {socio.notas && (
                                    <div className="socio-info-item full-width">
                                        <label>Notas</label>
                                        <span>{socio.notas}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'pagos' && (
                            <div className="socio-history-list">
                                {socio.pagos && socio.pagos.length > 0 ? (
                                    socio.pagos.map((pago, i) => (
                                        <div key={i} className="history-item">
                                            <div className="history-icon history-icon-pago">
                                                <CreditCard size={16} />
                                            </div>
                                            <div className="history-content">
                                                <div className="history-title">
                                                    Pago de membresía
                                                </div>
                                                <div className="history-meta">
                                                    {formatDateTime(pago.fecha)} • {pago.metodo}
                                                </div>
                                            </div>
                                            <div className="history-amount">
                                                {formatCurrency(pago.monto)}
                                            </div>
                                            <span className={`status-badge status-${pago.estado === 'completado' ? 'activo' : 'pendiente'}`}>
                                                {pago.estado}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="history-empty">
                                        <CreditCard size={32} />
                                        <p>No hay pagos registrados</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'accesos' && (
                            <div className="socio-history-list">
                                {socio.accesos && socio.accesos.length > 0 ? (
                                    socio.accesos.map((acceso, i) => (
                                        <div key={i} className="history-item">
                                            <div className="history-icon history-icon-acceso">
                                                <DoorOpen size={16} />
                                            </div>
                                            <div className="history-content">
                                                <div className="history-title">
                                                    Ingreso al gimnasio
                                                </div>
                                                <div className="history-meta">
                                                    {formatDateTime(acceso.entrada)}
                                                    {acceso.salida && ` - Salida: ${formatDateTime(acceso.salida)}`}
                                                </div>
                                            </div>
                                            <span className={`method-badge method-${acceso.metodo}`}>
                                                {acceso.metodo === 'qr' ? 'QR' : 'Manual'}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="history-empty">
                                        <DoorOpen size={32} />
                                        <p>No hay accesos registrados</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'membresias' && (
                            <div className="socio-history-list">
                                {socio.membresias && socio.membresias.length > 0 ? (
                                    socio.membresias.map((m, i) => (
                                        <div key={i} className="history-item">
                                            <div className="history-icon history-icon-membresia">
                                                <Calendar size={16} />
                                            </div>
                                            <div className="history-content">
                                                <div className="history-title">
                                                    {m.plan_nombre}
                                                </div>
                                                <div className="history-meta">
                                                    {formatDate(m.fecha_inicio)} - {formatDate(m.fecha_fin)}
                                                </div>
                                            </div>
                                            <div className="history-amount">
                                                {formatCurrency(m.precio)}
                                            </div>
                                            <span className={`status-badge status-${m.estado === 'activa' ? 'activo' : 'vencido'}`}>
                                                {m.estado}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="history-empty">
                                        <Calendar size={32} />
                                        <p>No hay membresías registradas</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="modal-footer">
                    <Button variant="secondary" onClick={onClose}>
                        Cerrar
                    </Button>
                    <Button variant="primary" onClick={() => { onClose(); onEdit(socio); }}>
                        Editar Socio
                    </Button>
                </div>
            </div>
        </div>
    )
}

export default SocioDetailModal
