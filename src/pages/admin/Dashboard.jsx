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
    RefreshCw,
    BarChart3,
    PieChart
} from 'lucide-react'
import { Card, Button } from '../../components/ui'
import { dashboardApi, reportesApi } from '../../services/api'
import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart as RechartsPie,
    Pie,
    Cell,
    Legend
} from 'recharts'
import './Dashboard.css'

const Dashboard = () => {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [chartData, setChartData] = useState({
        ingresos: [],
        accesos: { porHora: [], porDia: [] },
        membresias: { porPlan: [], porEstado: [] }
    })

    const fetchDashboard = async () => {
        setLoading(true)
        setError(null)
        try {
            const response = await dashboardApi.getStats()
            setData(response)
        } catch (err) {
            console.error('Error fetching dashboard:', err)
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

    const fetchChartData = async () => {
        try {
            const [ingresosRes, accesosRes, membresiasRes] = await Promise.all([
                reportesApi.getIngresos('mes'),
                reportesApi.getAccesos('semana'),
                reportesApi.getMembresias()
            ])

            setChartData({
                ingresos: ingresosRes.datos?.map(d => ({
                    fecha: new Date(d.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }),
                    total: parseFloat(d.total),
                    cantidad: parseInt(d.cantidad)
                })) || [],
                accesos: {
                    porHora: accesosRes.porHora || [],
                    porDia: accesosRes.porDia?.map(d => ({
                        fecha: new Date(d.fecha).toLocaleDateString('es-AR', { weekday: 'short' }),
                        cantidad: d.cantidad
                    })) || []
                },
                membresias: {
                    porPlan: membresiasRes.porPlan || [],
                    porEstado: membresiasRes.porEstado || []
                }
            })
        } catch (err) {
            console.error('Error fetching chart data:', err)
            // Demo data for charts
            setChartData({
                ingresos: [
                    { fecha: '01 Ene', total: 450000, cantidad: 12 },
                    { fecha: '02 Ene', total: 380000, cantidad: 10 },
                    { fecha: '03 Ene', total: 520000, cantidad: 15 },
                    { fecha: '04 Ene', total: 290000, cantidad: 8 },
                    { fecha: '05 Ene', total: 610000, cantidad: 18 },
                    { fecha: '06 Ene', total: 480000, cantidad: 14 },
                    { fecha: '07 Ene', total: 550000, cantidad: 16 },
                ],
                accesos: {
                    porHora: [
                        { hora: '06:00', cantidad: 5 },
                        { hora: '07:00', cantidad: 15 },
                        { hora: '08:00', cantidad: 25 },
                        { hora: '09:00', cantidad: 35 },
                        { hora: '10:00', cantidad: 28 },
                        { hora: '11:00', cantidad: 18 },
                        { hora: '12:00', cantidad: 12 },
                        { hora: '17:00', cantidad: 22 },
                        { hora: '18:00', cantidad: 45 },
                        { hora: '19:00', cantidad: 55 },
                        { hora: '20:00', cantidad: 40 },
                        { hora: '21:00', cantidad: 20 },
                    ],
                    porDia: [
                        { fecha: 'Lun', cantidad: 89 },
                        { fecha: 'Mar', cantidad: 95 },
                        { fecha: 'Mié', cantidad: 78 },
                        { fecha: 'Jue', cantidad: 88 },
                        { fecha: 'Vie', cantidad: 72 },
                        { fecha: 'Sáb', cantidad: 45 },
                        { fecha: 'Dom', cantidad: 30 },
                    ]
                },
                membresias: {
                    porPlan: [
                        { plan: 'Mensual', cantidad: 150, activas: 120 },
                        { plan: 'Trimestral', cantidad: 80, activas: 70 },
                        { plan: 'Anual', cantidad: 50, activas: 48 },
                    ],
                    porEstado: [
                        { estado: 'activas', cantidad: 238 },
                        { estado: 'por_vencer', cantidad: 18 },
                        { estado: 'vencidas', cantidad: 24 },
                    ]
                }
            })
        }
    }

    useEffect(() => {
        fetchDashboard()
        fetchChartData()
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

    const COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef']
    const STATUS_COLORS = {
        activas: '#10b981',
        por_vencer: '#f59e0b',
        vencidas: '#ef4444'
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
                    onClick={() => { fetchDashboard(); fetchChartData(); }}
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

            {/* Charts Grid */}
            <div className="charts-grid">
                {/* Income Chart */}
                <Card title="Ingresos Últimos 30 Días" icon={TrendingUp} className="chart-card">
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height={250}>
                            <AreaChart data={chartData.ingresos}>
                                <defs>
                                    <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis
                                    dataKey="fecha"
                                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                                />
                                <YAxis
                                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                                />
                                <Tooltip
                                    formatter={(value) => [formatCurrency(value), 'Ingresos']}
                                    contentStyle={{
                                        background: '#1e1e2e',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '8px'
                                    }}
                                    labelStyle={{ color: '#fff' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="total"
                                    stroke="#6366f1"
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorIngresos)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* Access by Hour Chart */}
                <Card title="Accesos por Hora (Última Semana)" icon={BarChart3} className="chart-card">
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={chartData.accesos.porHora}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis
                                    dataKey="hora"
                                    tick={{ fill: '#9ca3af', fontSize: 10 }}
                                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                                />
                                <YAxis
                                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                                />
                                <Tooltip
                                    formatter={(value) => [value, 'Accesos']}
                                    contentStyle={{
                                        background: '#1e1e2e',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '8px'
                                    }}
                                    labelStyle={{ color: '#fff' }}
                                />
                                <Bar
                                    dataKey="cantidad"
                                    fill="#8b5cf6"
                                    radius={[4, 4, 0, 0]}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>

            {/* Second Charts Row */}
            <div className="charts-grid">
                {/* Membership by Plan Pie Chart */}
                <Card title="Membresías por Plan" icon={PieChart} className="chart-card">
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height={250}>
                            <RechartsPie>
                                <Pie
                                    data={chartData.membresias.porPlan}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={90}
                                    paddingAngle={3}
                                    dataKey="cantidad"
                                    nameKey="plan"
                                    label={({ plan, percent }) => `${plan} ${(percent * 100).toFixed(0)}%`}
                                    labelLine={false}
                                >
                                    {chartData.membresias.porPlan.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value, name) => [value, name]}
                                    contentStyle={{
                                        background: '#1e1e2e',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '8px'
                                    }}
                                />
                                <Legend
                                    verticalAlign="bottom"
                                    height={36}
                                    formatter={(value) => <span style={{ color: '#e5e7eb' }}>{value}</span>}
                                />
                            </RechartsPie>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* Access by Day Chart */}
                <Card title="Accesos por Día" icon={BarChart3} className="chart-card">
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={chartData.accesos.porDia}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis
                                    dataKey="fecha"
                                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                                />
                                <YAxis
                                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                                />
                                <Tooltip
                                    formatter={(value) => [value, 'Accesos']}
                                    contentStyle={{
                                        background: '#1e1e2e',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '8px'
                                    }}
                                    labelStyle={{ color: '#fff' }}
                                />
                                <Bar
                                    dataKey="cantidad"
                                    fill="#10b981"
                                    radius={[4, 4, 0, 0]}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
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
