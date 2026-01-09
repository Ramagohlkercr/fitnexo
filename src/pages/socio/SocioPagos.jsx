import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, CreditCard, CheckCircle, Clock } from 'lucide-react'
import { useSocioStore } from '../../stores/socioStore'
import './SocioPages.css'

const SocioPagos = () => {
    const { fetchPagos } = useSocioStore()
    const [pagos, setPagos] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadPagos()
    }, [])

    const loadPagos = async () => {
        setLoading(true)
        const data = await fetchPagos()
        setPagos(data)
        setLoading(false)
    }

    const formatDate = (dateString) => {
        if (!dateString) return '-'
        return new Date(dateString).toLocaleDateString('es-AR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        })
    }

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
            minimumFractionDigits: 0
        }).format(value || 0)
    }

    return (
        <div className="socio-page">
            <header className="socio-page-header">
                <Link to="/mi-gym" className="socio-back-btn">
                    <ArrowLeft size={20} />
                </Link>
                <h1>Mis Pagos</h1>
            </header>

            <div className="socio-page-content">
                {loading ? (
                    <div className="socio-page-loading">
                        <div className="spinner"></div>
                    </div>
                ) : pagos.length === 0 ? (
                    <div className="socio-page-empty">
                        <CreditCard size={48} />
                        <p>No hay pagos registrados</p>
                    </div>
                ) : (
                    <div className="socio-list">
                        {pagos.map((pago, i) => (
                            <div key={i} className="socio-list-item">
                                <div className={`socio-list-icon ${pago.estado === 'completado' ? 'success' : 'warning'}`}>
                                    {pago.estado === 'completado' ? <CheckCircle size={18} /> : <Clock size={18} />}
                                </div>
                                <div className="socio-list-content">
                                    <div className="socio-list-title">
                                        Pago de membresía
                                    </div>
                                    <div className="socio-list-meta">
                                        {formatDate(pago.fecha)} • {pago.metodo}
                                    </div>
                                </div>
                                <div className="socio-list-amount">
                                    {formatCurrency(pago.monto)}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

export default SocioPagos
