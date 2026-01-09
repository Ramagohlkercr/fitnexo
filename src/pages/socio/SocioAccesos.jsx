import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, DoorOpen, Clock } from 'lucide-react'
import { useSocioStore } from '../../stores/socioStore'
import './SocioPages.css'

const SocioAccesos = () => {
    const { fetchAccesos } = useSocioStore()
    const [accesos, setAccesos] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadAccesos()
    }, [])

    const loadAccesos = async () => {
        setLoading(true)
        const data = await fetchAccesos()
        setAccesos(data)
        setLoading(false)
    }

    const formatDateTime = (dateString) => {
        if (!dateString) return '-'
        return new Date(dateString).toLocaleString('es-AR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    return (
        <div className="socio-page">
            <header className="socio-page-header">
                <Link to="/mi-gym" className="socio-back-btn">
                    <ArrowLeft size={20} />
                </Link>
                <h1>Mis Accesos</h1>
            </header>

            <div className="socio-page-content">
                {loading ? (
                    <div className="socio-page-loading">
                        <div className="spinner"></div>
                    </div>
                ) : accesos.length === 0 ? (
                    <div className="socio-page-empty">
                        <DoorOpen size={48} />
                        <p>No hay accesos registrados</p>
                    </div>
                ) : (
                    <div className="socio-list">
                        {accesos.map((acceso, i) => (
                            <div key={i} className="socio-list-item">
                                <div className="socio-list-icon">
                                    <DoorOpen size={18} />
                                </div>
                                <div className="socio-list-content">
                                    <div className="socio-list-title">
                                        Ingreso al gimnasio
                                    </div>
                                    <div className="socio-list-meta">
                                        <Clock size={12} />
                                        {formatDateTime(acceso.entrada)}
                                    </div>
                                </div>
                                <span className={`socio-method-badge ${acceso.metodo}`}>
                                    {acceso.metodo === 'qr' ? 'QR' : 'Manual'}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

export default SocioAccesos
