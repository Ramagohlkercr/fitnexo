import { useState, useEffect } from 'react'
import { Users, Plus, Search, Filter, Eye, Edit, Trash2, X, RefreshCw, QrCode } from 'lucide-react'
import { Button, Card, Input } from '../../components/ui'
import { sociosApi, planesApi, membresiasApi, pagosApi } from '../../services/api'
import QRModal from '../../components/ui/QRModal'
import './Socios.css'

const Socios = () => {
    const [socios, setSocios] = useState([])
    const [planes, setPlanes] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [estadoFilter, setEstadoFilter] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [showDetailModal, setShowDetailModal] = useState(false)
    const [selectedSocio, setSelectedSocio] = useState(null)
    const [editMode, setEditMode] = useState(false)
    const [formData, setFormData] = useState({
        dni: '',
        nombre: '',
        apellido: '',
        email: '',
        telefono: '',
        direccion: '',
        notas: ''
    })
    const [formError, setFormError] = useState('')
    const [saving, setSaving] = useState(false)
    const [showQRModal, setShowQRModal] = useState(false)
    const [qrSocioId, setQrSocioId] = useState(null)

    // Pagination
    const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 })

    const fetchSocios = async () => {
        setLoading(true)
        try {
            const params = { page: pagination.page, limit: 20 }
            if (search) params.search = search
            if (estadoFilter) params.estado = estadoFilter

            const response = await sociosApi.getAll(params)
            setSocios(response.socios || [])
            setPagination(response.pagination || { page: 1, pages: 1, total: 0 })
        } catch (err) {
            console.error('Error fetching socios:', err)
            // Demo data fallback
            setSocios([
                { id: '1', nombre: 'Juan', apellido: 'Pérez', dni: '32456789', email: 'juan@email.com', plan_nombre: 'Mensual', membresia_fin: '2024-02-15', estado_actual: 'activo' },
                { id: '2', nombre: 'María', apellido: 'García', dni: '28765432', email: 'maria@email.com', plan_nombre: 'Trimestral', membresia_fin: '2024-03-20', estado_actual: 'activo' },
                { id: '3', nombre: 'Carlos', apellido: 'López', dni: '35678901', email: 'carlos@email.com', plan_nombre: 'Mensual', membresia_fin: '2024-01-10', estado_actual: 'vencido' },
                { id: '4', nombre: 'Ana', apellido: 'Martínez', dni: '30123456', email: 'ana@email.com', plan_nombre: 'Anual', membresia_fin: '2024-12-01', estado_actual: 'activo' },
                { id: '5', nombre: 'Pedro', apellido: 'Sánchez', dni: '33987654', email: 'pedro@email.com', plan_nombre: 'Mensual', membresia_fin: '2024-01-25', estado_actual: 'por_vencer' },
            ])
        } finally {
            setLoading(false)
        }
    }

    const fetchPlanes = async () => {
        try {
            const response = await planesApi.getAll({ activo: true })
            setPlanes(response || [])
        } catch (err) {
            console.error('Error fetching planes:', err)
            setPlanes([
                { id: '1', nombre: 'Mensual', precio: 15000, duracion_dias: 30 },
                { id: '2', nombre: 'Trimestral', precio: 40000, duracion_dias: 90 },
            ])
        }
    }

    useEffect(() => {
        fetchSocios()
        fetchPlanes()
    }, [])

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchSocios()
        }, 300)
        return () => clearTimeout(timer)
    }, [search, estadoFilter])

    const handleOpenModal = (socio = null) => {
        if (socio) {
            setFormData({
                dni: socio.dni || '',
                nombre: socio.nombre || '',
                apellido: socio.apellido || '',
                email: socio.email || '',
                telefono: socio.telefono || '',
                direccion: socio.direccion || '',
                notas: socio.notas || ''
            })
            setSelectedSocio(socio)
            setEditMode(true)
        } else {
            setFormData({
                dni: '',
                nombre: '',
                apellido: '',
                email: '',
                telefono: '',
                direccion: '',
                notas: ''
            })
            setSelectedSocio(null)
            setEditMode(false)
        }
        setFormError('')
        setShowModal(true)
    }

    const handleCloseModal = () => {
        setShowModal(false)
        setFormError('')
    }

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setSaving(true)
        setFormError('')

        try {
            if (editMode && selectedSocio) {
                await sociosApi.update(selectedSocio.id, formData)
            } else {
                await sociosApi.create(formData)
            }
            handleCloseModal()
            fetchSocios()
        } catch (err) {
            setFormError(err.message || 'Error al guardar')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id) => {
        if (!confirm('¿Estás seguro de eliminar este socio?')) return

        try {
            await sociosApi.delete(id)
            fetchSocios()
        } catch (err) {
            alert(err.message || 'Error al eliminar')
        }
    }

    const handleViewDetail = async (socio) => {
        try {
            const detail = await sociosApi.getById(socio.id)
            setSelectedSocio(detail)
            setShowDetailModal(true)
        } catch (err) {
            setSelectedSocio(socio)
            setShowDetailModal(true)
        }
    }

    const formatDate = (dateString) => {
        if (!dateString) return '-'
        return new Date(dateString).toLocaleDateString('es-AR')
    }

    return (
        <div className="socios-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Socios</h1>
                    <p className="page-subtitle">Gestiona los socios de tu gimnasio ({pagination.total} registros)</p>
                </div>
                <Button variant="primary" icon={Plus} onClick={() => handleOpenModal()}>
                    Nuevo Socio
                </Button>
            </div>

            <Card className="socios-card">
                <div className="socios-toolbar">
                    <div className="socios-search">
                        <Search size={18} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o DNI..."
                            className="search-input"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="socios-filters">
                        <select
                            className="filter-select"
                            value={estadoFilter}
                            onChange={(e) => setEstadoFilter(e.target.value)}
                        >
                            <option value="">Todos los estados</option>
                            <option value="activo">Activos</option>
                            <option value="por_vencer">Por vencer</option>
                            <option value="vencido">Vencidos</option>
                        </select>
                        <Button variant="secondary" icon={RefreshCw} size="sm" onClick={fetchSocios}>
                            Actualizar
                        </Button>
                    </div>
                </div>

                {loading ? (
                    <div className="socios-loading">
                        <RefreshCw size={24} className="spin" />
                        <p>Cargando socios...</p>
                    </div>
                ) : (
                    <div className="socios-table-wrapper">
                        <table className="socios-table">
                            <thead>
                                <tr>
                                    <th>Nombre</th>
                                    <th>DNI</th>
                                    <th>Email</th>
                                    <th>Plan</th>
                                    <th>Vencimiento</th>
                                    <th>Estado</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {socios.map((socio) => (
                                    <tr key={socio.id}>
                                        <td>
                                            <div className="socio-name">
                                                <div className="socio-avatar">
                                                    {socio.nombre?.charAt(0) || '?'}
                                                </div>
                                                <span>{socio.nombre} {socio.apellido}</span>
                                            </div>
                                        </td>
                                        <td>{socio.dni}</td>
                                        <td>{socio.email || '-'}</td>
                                        <td>{socio.plan_nombre || '-'}</td>
                                        <td>{formatDate(socio.membresia_fin)}</td>
                                        <td>
                                            <span className={`status-badge status-${socio.estado_actual}`}>
                                                {socio.estado_actual === 'activo' && 'Activo'}
                                                {socio.estado_actual === 'vencido' && 'Vencido'}
                                                {socio.estado_actual === 'por_vencer' && 'Por vencer'}
                                                {socio.estado_actual === 'sin_membresia' && 'Sin membresía'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="action-buttons">
                                                <button className="action-btn action-btn-qr" title="Ver QR" onClick={() => { setQrSocioId(socio.id); setShowQRModal(true); }}>
                                                    <QrCode size={16} />
                                                </button>
                                                <button className="action-btn" title="Ver detalle" onClick={() => handleViewDetail(socio)}>
                                                    <Eye size={16} />
                                                </button>
                                                <button className="action-btn" title="Editar" onClick={() => handleOpenModal(socio)}>
                                                    <Edit size={16} />
                                                </button>
                                                <button className="action-btn action-btn-danger" title="Eliminar" onClick={() => handleDelete(socio.id)}>
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {socios.length === 0 && (
                                    <tr>
                                        <td colSpan="7" className="text-center text-muted p-4">
                                            No se encontraron socios
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* Modal Crear/Editar */}
            {showModal && (
                <div className="modal-overlay" onClick={handleCloseModal}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editMode ? 'Editar Socio' : 'Nuevo Socio'}</h2>
                            <button className="modal-close" onClick={handleCloseModal}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                {formError && <div className="form-error">{formError}</div>}

                                <div className="form-grid">
                                    <Input
                                        label="DNI"
                                        name="dni"
                                        value={formData.dni}
                                        onChange={handleChange}
                                        required
                                        placeholder="12345678"
                                    />
                                    <Input
                                        label="Nombre"
                                        name="nombre"
                                        value={formData.nombre}
                                        onChange={handleChange}
                                        required
                                        placeholder="Juan"
                                    />
                                    <Input
                                        label="Apellido"
                                        name="apellido"
                                        value={formData.apellido}
                                        onChange={handleChange}
                                        required
                                        placeholder="Pérez"
                                    />
                                    <Input
                                        label="Email"
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        placeholder="juan@email.com"
                                    />
                                    <Input
                                        label="Teléfono"
                                        name="telefono"
                                        value={formData.telefono}
                                        onChange={handleChange}
                                        placeholder="+54 11 1234-5678"
                                    />
                                    <Input
                                        label="Dirección"
                                        name="direccion"
                                        value={formData.direccion}
                                        onChange={handleChange}
                                        placeholder="Av. Ejemplo 123"
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="input-label">Notas</label>
                                    <textarea
                                        name="notas"
                                        value={formData.notas}
                                        onChange={handleChange}
                                        className="form-textarea"
                                        placeholder="Notas adicionales..."
                                        rows="3"
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <Button type="button" variant="secondary" onClick={handleCloseModal}>
                                    Cancelar
                                </Button>
                                <Button type="submit" variant="primary" loading={saving}>
                                    {editMode ? 'Guardar Cambios' : 'Crear Socio'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal QR */}
            {showQRModal && qrSocioId && (
                <QRModal
                    socioId={qrSocioId}
                    onClose={() => { setShowQRModal(false); setQrSocioId(null); }}
                />
            )}

            {/* Modal Detalle */}
            {showDetailModal && selectedSocio && (
                <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
                    <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Detalle del Socio</h2>
                            <button className="modal-close" onClick={() => setShowDetailModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="detail-header">
                                <div className="detail-avatar">
                                    {selectedSocio.nombre?.charAt(0)}
                                </div>
                                <div className="detail-info">
                                    <h3>{selectedSocio.nombre} {selectedSocio.apellido}</h3>
                                    <p>DNI: {selectedSocio.dni}</p>
                                </div>
                            </div>

                            <div className="detail-grid">
                                <div className="detail-item">
                                    <label>Email</label>
                                    <span>{selectedSocio.email || '-'}</span>
                                </div>
                                <div className="detail-item">
                                    <label>Teléfono</label>
                                    <span>{selectedSocio.telefono || '-'}</span>
                                </div>
                                <div className="detail-item">
                                    <label>Plan Actual</label>
                                    <span>{selectedSocio.plan_nombre || 'Sin plan'}</span>
                                </div>
                                <div className="detail-item">
                                    <label>Vencimiento</label>
                                    <span>{formatDate(selectedSocio.membresia_fin)}</span>
                                </div>
                            </div>

                            {selectedSocio.membresias && selectedSocio.membresias.length > 0 && (
                                <div className="detail-section">
                                    <h4>Historial de Membresías</h4>
                                    <div className="detail-list">
                                        {selectedSocio.membresias.map((m, i) => (
                                            <div key={i} className="detail-list-item">
                                                <span>{m.plan_nombre}</span>
                                                <span>{formatDate(m.fecha_inicio)} - {formatDate(m.fecha_fin)}</span>
                                                <span className={`status-badge status-${m.estado === 'activa' ? 'activo' : 'vencido'}`}>
                                                    {m.estado}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <Button variant="secondary" onClick={() => setShowDetailModal(false)}>
                                Cerrar
                            </Button>
                            <Button variant="primary" onClick={() => { setShowDetailModal(false); handleOpenModal(selectedSocio); }}>
                                Editar Socio
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Socios
