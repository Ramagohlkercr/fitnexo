import { useState, useEffect } from 'react'
import { DoorOpen, QrCode, Search, RefreshCw, CheckCircle, XCircle, Clock, UserCheck } from 'lucide-react'
import { Button, Card, Input } from '../../components/ui'
import { accesosApi, sociosApi } from '../../services/api'
import './Accesos.css'

const Accesos = () => {
    const [accesos, setAccesos] = useState([])
    const [loading, setLoading] = useState(true)
    const [socioSearch, setSocioSearch] = useState('')
    const [filteredSocios, setFilteredSocios] = useState([])
    const [socios, setSocios] = useState([])
    const [registrando, setRegistrando] = useState(false)
    const [ultimoAcceso, setUltimoAcceso] = useState(null)
    const [estadisticas, setEstadisticas] = useState(null)

    const fetchData = async () => {
        setLoading(true)
        try {
            const [accesosRes, sociosRes, statsRes] = await Promise.all([
                accesosApi.getAll({}),
                sociosApi.getAll({ limit: 200 }),
                accesosApi.getEstadisticas('semana')
            ])

            setAccesos(accesosRes || [])
            setSocios(sociosRes.socios || [])
            setEstadisticas(statsRes)
        } catch (err) {
            console.error('Error fetching data:', err)
            // Demo data
            setAccesos([
                { id: '1', socio_nombre: 'Juan', socio_apellido: 'Pérez', entrada: new Date().toISOString(), metodo: 'qr' },
                { id: '2', socio_nombre: 'María', socio_apellido: 'García', entrada: new Date().toISOString(), metodo: 'manual' },
            ])
            setSocios([
                { id: '1', nombre: 'Juan', apellido: 'Pérez', dni: '32456789' },
                { id: '2', nombre: 'María', apellido: 'García', dni: '28765432' },
            ])
            setEstadisticas({ total: 89, porDia: [], porHora: [] })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    useEffect(() => {
        if (socioSearch.length >= 2) {
            const filtered = socios.filter(s =>
                `${s.nombre} ${s.apellido}`.toLowerCase().includes(socioSearch.toLowerCase()) ||
                s.dni?.includes(socioSearch)
            ).slice(0, 5)
            setFilteredSocios(filtered)
        } else {
            setFilteredSocios([])
        }
    }, [socioSearch, socios])

    const handleRegistrarEntrada = async (socio) => {
        setRegistrando(true)
        setUltimoAcceso(null)

        try {
            const response = await accesosApi.registrarEntrada(socio.id, 'manual')
            setUltimoAcceso({
                success: true,
                mensaje: response.mensaje,
                socio: response.socio
            })
            setSocioSearch('')
            setFilteredSocios([])
            fetchData()
        } catch (err) {
            setUltimoAcceso({
                success: false,
                mensaje: err.message || 'Error al registrar entrada'
            })
        } finally {
            setRegistrando(false)
        }
    }

    const handleSimularQR = async () => {
        // Simular escaneo QR con un socio aleatorio
        if (socios.length === 0) return

        const randomSocio = socios[Math.floor(Math.random() * socios.length)]
        await handleRegistrarEntrada(randomSocio)
    }

    const formatTime = (dateString) => {
        if (!dateString) return '-'
        return new Date(dateString).toLocaleTimeString('es-AR', {
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    return (
        <div className="accesos-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Control de Accesos</h1>
                    <p className="page-subtitle">Registra y controla los accesos al gimnasio</p>
                </div>
                <Button variant="secondary" icon={RefreshCw} onClick={fetchData}>
                    Actualizar
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="accesos-stats">
                <div className="accesos-stat-card stat-primary">
                    <UserCheck size={24} />
                    <div>
                        <div className="stat-value">{estadisticas?.total || accesos.length}</div>
                        <div className="stat-label">Accesos Hoy</div>
                    </div>
                </div>
                <div className="accesos-stat-card">
                    <Clock size={24} />
                    <div>
                        <div className="stat-value">{accesos.filter(a => !a.salida).length}</div>
                        <div className="stat-label">En el Gym</div>
                    </div>
                </div>
            </div>

            <div className="accesos-grid">
                {/* Panel de Registro */}
                <Card title="Registrar Entrada" icon={DoorOpen} className="registro-card">
                    <div className="registro-content">
                        {/* Último acceso */}
                        {ultimoAcceso && (
                            <div className={`ultimo-acceso ${ultimoAcceso.success ? 'success' : 'error'}`}>
                                {ultimoAcceso.success ? <CheckCircle size={32} /> : <XCircle size={32} />}
                                <div className="ultimo-acceso-info">
                                    <div className="ultimo-acceso-nombre">
                                        {ultimoAcceso.socio?.nombre || 'Error'}
                                    </div>
                                    <div className="ultimo-acceso-mensaje">{ultimoAcceso.mensaje}</div>
                                </div>
                            </div>
                        )}

                        {/* Manual Search */}
                        <div className="registro-section">
                            <h4>Entrada Manual</h4>
                            <div className="socio-search-wrapper">
                                <Search size={18} className="socio-search-icon" />
                                <input
                                    type="text"
                                    className="socio-search-input"
                                    placeholder="Buscar socio por nombre o DNI..."
                                    value={socioSearch}
                                    onChange={(e) => setSocioSearch(e.target.value)}
                                />
                                {filteredSocios.length > 0 && (
                                    <div className="socio-dropdown">
                                        {filteredSocios.map(socio => (
                                            <div
                                                key={socio.id}
                                                className="socio-option"
                                                onClick={() => handleRegistrarEntrada(socio)}
                                            >
                                                <div>
                                                    <span className="socio-option-name">{socio.nombre} {socio.apellido}</span>
                                                    <span className="socio-option-dni">DNI: {socio.dni}</span>
                                                </div>
                                                <Button variant="primary" size="sm" loading={registrando}>
                                                    Entrada
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* QR Scanner Simulation */}
                        <div className="registro-section">
                            <h4>Escáner QR</h4>
                            <div className="qr-scanner-placeholder">
                                <QrCode size={64} />
                                <p>Apunta la cámara al código QR del socio</p>
                                <Button variant="secondary" icon={QrCode} onClick={handleSimularQR}>
                                    Simular Escaneo QR
                                </Button>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Lista de Accesos */}
                <Card title="Accesos de Hoy" icon={Clock} className="accesos-lista-card">
                    {loading ? (
                        <div className="accesos-loading">
                            <RefreshCw size={24} className="spin" />
                            <p>Cargando accesos...</p>
                        </div>
                    ) : (
                        <div className="accesos-lista">
                            {accesos.map((acceso) => (
                                <div key={acceso.id} className="acceso-item">
                                    <div className="acceso-avatar">
                                        {acceso.socio_nombre?.charAt(0) || '?'}
                                    </div>
                                    <div className="acceso-info">
                                        <div className="acceso-nombre">
                                            {acceso.socio_nombre} {acceso.socio_apellido}
                                        </div>
                                        <div className="acceso-dni">DNI: {acceso.socio_dni}</div>
                                    </div>
                                    <div className="acceso-time">
                                        <div className="acceso-entrada">{formatTime(acceso.entrada)}</div>
                                        <div className={`acceso-metodo metodo-${acceso.metodo}`}>
                                            {acceso.metodo === 'qr' ? 'QR' : 'Manual'}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {accesos.length === 0 && (
                                <div className="accesos-empty">
                                    <DoorOpen size={48} />
                                    <p>No hay accesos registrados hoy</p>
                                </div>
                            )}
                        </div>
                    )}
                </Card>
            </div>
        </div>
    )
}

export default Accesos
