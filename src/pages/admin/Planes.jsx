import { useState, useEffect } from 'react'
import { Package, Plus, Edit, Trash2, X, RefreshCw, Users } from 'lucide-react'
import { Button, Card, Input } from '../../components/ui'
import { planesApi } from '../../services/api'
import './Planes.css'

const Planes = () => {
    const [planes, setPlanes] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editMode, setEditMode] = useState(false)
    const [selectedPlan, setSelectedPlan] = useState(null)
    const [formData, setFormData] = useState({
        nombre: '',
        descripcion: '',
        precio: '',
        duracionDias: ''
    })
    const [formError, setFormError] = useState('')
    const [saving, setSaving] = useState(false)

    const fetchPlanes = async () => {
        setLoading(true)
        try {
            const response = await planesApi.getAll()
            setPlanes(response || [])
        } catch (err) {
            console.error('Error fetching planes:', err)
            setPlanes([
                { id: '1', nombre: 'Plan Mensual', precio: 15000, duracion_dias: 30, socios_activos: 125, activo: true },
                { id: '2', nombre: 'Plan Trimestral', precio: 40000, duracion_dias: 90, socios_activos: 45, activo: true },
                { id: '3', nombre: 'Plan Semestral', precio: 70000, duracion_dias: 180, socios_activos: 28, activo: true },
                { id: '4', nombre: 'Plan Anual', precio: 120000, duracion_dias: 365, socios_activos: 49, activo: true },
                { id: '5', nombre: 'Plan Estudiante', precio: 12000, duracion_dias: 30, socios_activos: 35, activo: true },
            ])
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchPlanes()
    }, [])

    const handleOpenModal = (plan = null) => {
        if (plan) {
            setFormData({
                nombre: plan.nombre || '',
                descripcion: plan.descripcion || '',
                precio: plan.precio?.toString() || '',
                duracionDias: plan.duracion_dias?.toString() || ''
            })
            setSelectedPlan(plan)
            setEditMode(true)
        } else {
            setFormData({
                nombre: '',
                descripcion: '',
                precio: '',
                duracionDias: '30'
            })
            setSelectedPlan(null)
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

        const data = {
            nombre: formData.nombre,
            descripcion: formData.descripcion,
            precio: parseFloat(formData.precio),
            duracionDias: parseInt(formData.duracionDias)
        }

        try {
            if (editMode && selectedPlan) {
                await planesApi.update(selectedPlan.id, data)
            } else {
                await planesApi.create(data)
            }
            handleCloseModal()
            fetchPlanes()
        } catch (err) {
            setFormError(err.message || 'Error al guardar')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id) => {
        if (!confirm('¿Estás seguro de eliminar este plan?')) return

        try {
            await planesApi.delete(id)
            fetchPlanes()
        } catch (err) {
            alert(err.message || 'Error al eliminar')
        }
    }

    const handleToggleActive = async (plan) => {
        try {
            await planesApi.update(plan.id, { activo: !plan.activo })
            fetchPlanes()
        } catch (err) {
            alert(err.message || 'Error al actualizar')
        }
    }

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
            minimumFractionDigits: 0
        }).format(value)
    }

    if (loading) {
        return (
            <div className="planes-page">
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Planes</h1>
                        <p className="page-subtitle">Administra los planes y membresías</p>
                    </div>
                </div>
                <div className="planes-loading">
                    <RefreshCw size={32} className="spin" />
                    <p>Cargando planes...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="planes-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Planes</h1>
                    <p className="page-subtitle">Administra los planes y membresías ({planes.length} planes)</p>
                </div>
                <div className="page-actions">
                    <Button variant="secondary" icon={RefreshCw} onClick={fetchPlanes}>
                        Actualizar
                    </Button>
                    <Button variant="primary" icon={Plus} onClick={() => handleOpenModal()}>
                        Nuevo Plan
                    </Button>
                </div>
            </div>

            <div className="planes-grid">
                {planes.map((plan) => (
                    <Card key={plan.id} className={`plan-card ${!plan.activo ? 'plan-inactive' : ''}`}>
                        <div className="plan-header">
                            <div className="plan-icon">
                                <Package size={24} />
                            </div>
                            <span className={`plan-status ${plan.activo ? 'active' : 'inactive'}`}>
                                {plan.activo ? 'Activo' : 'Inactivo'}
                            </span>
                        </div>
                        <h3 className="plan-name">{plan.nombre}</h3>
                        {plan.descripcion && (
                            <p className="plan-description">{plan.descripcion}</p>
                        )}
                        <div className="plan-price">
                            <span className="plan-currency">$</span>
                            <span className="plan-amount">{plan.precio?.toLocaleString('es-AR')}</span>
                        </div>
                        <div className="plan-duration">{plan.duracion_dias} días</div>
                        <div className="plan-divider" />
                        <div className="plan-stats">
                            <div className="plan-stat">
                                <Users size={16} />
                                <span className="plan-stat-value">{plan.socios_activos || 0}</span>
                                <span className="plan-stat-label">socios activos</span>
                            </div>
                        </div>
                        <div className="plan-actions">
                            <Button variant="ghost" size="sm" onClick={() => handleToggleActive(plan)}>
                                {plan.activo ? 'Desactivar' : 'Activar'}
                            </Button>
                            <Button variant="secondary" size="sm" icon={Edit} onClick={() => handleOpenModal(plan)}>
                                Editar
                            </Button>
                            <Button variant="ghost" size="sm" icon={Trash2} onClick={() => handleDelete(plan.id)} className="btn-danger-text">
                            </Button>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Modal Crear/Editar */}
            {showModal && (
                <div className="modal-overlay" onClick={handleCloseModal}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editMode ? 'Editar Plan' : 'Nuevo Plan'}</h2>
                            <button className="modal-close" onClick={handleCloseModal}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                {formError && <div className="form-error">{formError}</div>}

                                <Input
                                    label="Nombre del Plan"
                                    name="nombre"
                                    value={formData.nombre}
                                    onChange={handleChange}
                                    required
                                    placeholder="Ej: Plan Mensual"
                                />

                                <div className="form-group">
                                    <label className="input-label">Descripción</label>
                                    <textarea
                                        name="descripcion"
                                        value={formData.descripcion}
                                        onChange={handleChange}
                                        className="form-textarea"
                                        placeholder="Descripción opcional del plan..."
                                        rows="2"
                                    />
                                </div>

                                <div className="form-grid">
                                    <Input
                                        label="Precio (ARS)"
                                        type="number"
                                        name="precio"
                                        value={formData.precio}
                                        onChange={handleChange}
                                        required
                                        placeholder="15000"
                                        min="0"
                                    />
                                    <Input
                                        label="Duración (días)"
                                        type="number"
                                        name="duracionDias"
                                        value={formData.duracionDias}
                                        onChange={handleChange}
                                        required
                                        placeholder="30"
                                        min="1"
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <Button type="button" variant="secondary" onClick={handleCloseModal}>
                                    Cancelar
                                </Button>
                                <Button type="submit" variant="primary" loading={saving}>
                                    {editMode ? 'Guardar Cambios' : 'Crear Plan'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Planes
