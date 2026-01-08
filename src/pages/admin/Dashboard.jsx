import { useState, useEffect } from 'react'
import {
    Users,
    DollarSign,
    AlertCircle,
    TrendingUp,
    UserPlus,
    CreditCard,
    DoorOpen,
    ArrowUpRight,
    ArrowDownRight,
    RefreshCw
} from 'lucide-react'
import { Card, Button } from '../../components/ui'
import { dashboardApi } from '../../services/api'
import './Dashboard.css'

const Dashboard = () => {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const fetchDashboard = async () => {
        setLoading(true)
        setError(null)
        try {
            const response = await dashboardApi.getStats()
            setData(response)
        } catch (err) {
            console.error('Error fetching dashboard:', err)
            // Fallback a datos demo si la API no está disponible
            setData({
                stats: {
                    sociosActivos: { value: 247, total: 280, change: '+12%' },
                    ingresosMes: { value: 1250000, change: '+8%' },
                    porVencer: { value: 18 },
                    vencidos: { value: 12 },
                    accesosHoy: { value: 89 }
                },
                actividad: [
                    { tipo: 'pago', nombre: 'Juan Pérez', accion: 'pagó su cuota', fecha: new Date().toISOString(), extra: '15000' },
                    { tipo: 'acceso', nombre: 'María García', accion: 'ingresó al gym', fecha: new Date().toISOString() },
                    { tipo: 'nuevo', nombre: 'Carlos López', accion: 'se registró', fecha: new Date().toISOString() },
                ],
                pendientes: [
                    { id: 1, nombre: 'Roberto Díaz', dias_vencido: -5, monto: 15000 },
                    { id: 2, nombre: 'Laura Torres', dias_vencido: -3, monto: 18000 },
                ]
            })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchDashboard()
    }, [])

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
            minimumFractionDigits: 0
        }).format(value)
    }

    const formatTimeAgo = (dateString) => {
        const date = new Date(dateString)
        const now = new Date()
        const diffMs = now - date
        const diffMins = Math.floor(diffMs / 60000)
        const diffHours = Math.floor(diffMs / 3600000)

        if (diffMins < 1) return 'Hace un momento'
        if (diffMins < 60) return `Hace ${diffMins} min`
        if (diffHours < 24) return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`
        return date.toLocaleDateString('es-AR')
    }

    if (loading) {
        return (
            <div className="dashboard">
                <div className="dashboard-loading">
                    <RefreshCw size={32} className="spin" />
                    <p>Cargando datos...</p>
                </div>
            </div>
        )
    }

    const stats = [
        {
            label: 'Socios Activos',
            value: data?.stats?.sociosActivos?.value || 0,
            change: data?.stats?.sociosActivos?.change || '+0%',
            trend: 'up',
            icon: Users,
            color: 'primary'
        },
        {
            label: 'Ingresos del Mes',
            value: formatCurrency(data?.stats?.ingresosMes?.value || 0),
            change: data?.stats?.ingresosMes?.change || '+0%',
            trend: (data?.stats?.ingresosMes?.change || '').startsWith('-') ? 'down' : 'up',
            icon: DollarSign,
            color: 'success'
        },
        {
            label: 'Por Vencer (7 días)',
            value: data?.stats?.porVencer?.value || 0,
            change: null,
            trend: 'warning',
            icon: AlertCircle,
            color: 'warning'
        },
        {
            label: 'Accesos Hoy',
            value: data?.stats?.accesosHoy?.value || 0,
            change: null,
            trend: 'up',
            icon: DoorOpen,
            color: 'primary'
        }
    ]

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <div>
                    <h1 className="dashboard-title">Dashboard</h1>
                    <p className="dashboard-subtitle">Bienvenido de vuelta. Aquí está el resumen de hoy.</p>
                </div>
                <Button
                    variant="secondary"
                    icon={RefreshCw}
                    onClick={fetchDashboard}
                    disabled={loading}
                >
                    Actualizar
                </Button>
            </div>

            {/* Stats Grid */}
            <div className="stats-grid">
                {stats.map((stat, index) => (
                    <div key={index} className={`stat-card stat-${stat.color}`}>
                        <div className="stat-header">
                            <div className={`stat-icon stat-icon-${stat.color}`}>
                                <stat.icon size={22} />
                            </div>
                            {stat.change && (
                                <div className={`stat-change stat-change-${stat.trend}`}>
                                    {stat.trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                    {stat.change}
                                </div>
                            )}
                        </div>
                        <div className="stat-value">{stat.value}</div>
                        <div className="stat-label">{stat.label}</div>
                    </div>
                ))}
            </div>

            {/* Content Grid */}
            <div className="dashboard-grid">
                {/* Recent Activity */}
                <Card title="Actividad Reciente" icon={TrendingUp} className="dashboard-card">
                    <div className="activity-list">
                        {(data?.actividad || []).slice(0, 5).map((item, index) => (
                            <div key={index} className="activity-item">
                                <div className={`activity-icon activity-icon-${item.tipo}`}>
                                    {item.tipo === 'pago' && <CreditCard size={16} />}
                                    {item.tipo === 'acceso' && <DoorOpen size={16} />}
                                    {item.tipo === 'nuevo' && <UserPlus size={16} />}
                                </div>
                                <div className="activity-content">
                                    <div className="activity-text">
                                        <strong>{item.nombre}</strong> {item.accion}
                                    </div>
                                    <div className="activity-time">{formatTimeAgo(item.fecha)}</div>
                                </div>
                                {item.extra && (
                                    <div className="activity-amount">{formatCurrency(parseFloat(item.extra))}</div>
                                )}
                            </div>
                        ))}
                        {(!data?.actividad || data.actividad.length === 0) && (
                            <p className="text-muted text-center p-4">No hay actividad reciente</p>
                        )}
                    </div>
                </Card>

                {/* Pending Payments */}
                <Card title="Pagos Pendientes" icon={AlertCircle} className="dashboard-card">
                    <div className="pending-list">
                        {(data?.pendientes || []).slice(0, 5).map((item, index) => (
                            <div key={index} className="pending-item">
                                <div className="pending-info">
                                    <div className="pending-name">{item.nombre}</div>
                                    <div className={`pending-status ${item.dias_vencido > 0 ? 'overdue' : ''}`}>
                                        {item.dias_vencido > 0
                                            ? `Vencido hace ${item.dias_vencido} días`
                                            : `Vence en ${Math.abs(item.dias_vencido)} días`}
                                    </div>
                                </div>
                                <div className="pending-amount">{formatCurrency(item.monto)}</div>
                            </div>
                        ))}
                        {(!data?.pendientes || data.pendientes.length === 0) && (
                            <p className="text-muted text-center p-4">No hay pagos pendientes</p>
                        )}
                    </div>
                    <button className="dashboard-view-all" onClick={() => window.location.href = '/pagos'}>
                        Ver todos los pendientes
                    </button>
                </Card>
            </div>
        </div>
    )
}

export default Dashboard
