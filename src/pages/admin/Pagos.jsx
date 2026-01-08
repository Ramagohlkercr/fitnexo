import { useState, useEffect } from 'react'
import { CreditCard, Plus, X, RefreshCw, DollarSign, Search, FileText, Download, Link, ExternalLink, BarChart2, CheckCircle, Printer } from 'lucide-react'
import { Button, Card, Input } from '../../components/ui'
import { pagosApi, sociosApi, planesApi } from '../../services/api'
import './Pagos.css'

const Pagos = () => {
    const [pagos, setPagos] = useState([])
    const [socios, setSocios] = useState([])
    const [planes, setPlanes] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [showLinkModal, setShowLinkModal] = useState(false)
    const [showReporteModal, setShowReporteModal] = useState(false)
    const [showComprobanteModal, setShowComprobanteModal] = useState(false)
    const [resumen, setResumen] = useState(null)
    const [periodo, setPeriodo] = useState('mes')
    const [mpStatus, setMpStatus] = useState({ configured: false })
    const [reporte, setReporte] = useState(null)
    const [comprobante, setComprobante] = useState(null)
    const [linkData, setLinkData] = useState(null)

    const [formData, setFormData] = useState({
        socioId: '',
        planId: '',
        monto: '',
        metodo: 'efectivo',
        notas: '',
        crearMembresia: true
    })
    const [formError, setFormError] = useState('')
    const [saving, setSaving] = useState(false)
    const [socioSearch, setSocioSearch] = useState('')
    const [filteredSocios, setFilteredSocios] = useState([])
    const [linkSocioSearch, setLinkSocioSearch] = useState('')
    const [linkFilteredSocios, setLinkFilteredSocios] = useState([])
    const [linkForm, setLinkForm] = useState({ socioId: '', planId: '' })
    const [creatingLink, setCreatingLink] = useState(false)
    const [linkError, setLinkError] = useState('')

    const fetchData = async () => {
        setLoading(true)
        try {
            const [pagosRes, sociosRes, planesRes, resumenRes, mpRes] = await Promise.all([
                pagosApi.getAll({ limit: 50 }),
                sociosApi.getAll({ limit: 100 }),
                planesApi.getAll({ activo: true }),
                pagosApi.getResumen(periodo),
                pagosApi.getMPStatus().catch(() => ({ configured: false }))
            ])

            setPagos(pagosRes.pagos || [])
            setSocios(sociosRes.socios || [])
            setPlanes(planesRes || [])
            setResumen(resumenRes)
            setMpStatus(mpRes)
        } catch (err) {
            console.error('Error fetching data:', err)
            // Demo data fallback
            setPagos([
                { id: '1', socio_nombre: 'Juan', socio_apellido: 'Pérez', monto: 15000, metodo: 'efectivo', estado: 'completado', fecha: new Date().toISOString() },
                { id: '2', socio_nombre: 'María', socio_apellido: 'García', monto: 40000, metodo: 'mercadopago', estado: 'completado', fecha: new Date().toISOString() },
            ])
            setSocios([
                { id: '1', nombre: 'Juan', apellido: 'Pérez', dni: '32456789' },
                { id: '2', nombre: 'María', apellido: 'García', dni: '28765432' },
            ])
            setPlanes([
                { id: '1', nombre: 'Mensual', precio: 15000 },
                { id: '2', nombre: 'Trimestral', precio: 40000 },
            ])
            setResumen({ total_ingresos: 1250000, total_pagos: 85, efectivo: 750000, mercadopago: 400000, transferencia: 100000 })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [periodo])

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

    useEffect(() => {
        if (linkSocioSearch.length >= 2) {
            const filtered = socios.filter(s =>
                `${s.nombre} ${s.apellido}`.toLowerCase().includes(linkSocioSearch.toLowerCase()) ||
                s.dni?.includes(linkSocioSearch)
            ).slice(0, 5)
            setLinkFilteredSocios(filtered)
        } else {
            setLinkFilteredSocios([])
        }
    }, [linkSocioSearch, socios])

    const handleOpenModal = () => {
        setFormData({
            socioId: '',
            planId: planes[0]?.id || '',
            monto: planes[0]?.precio?.toString() || '',
            metodo: 'efectivo',
            notas: '',
            crearMembresia: true
        })
        setFormError('')
        setSocioSearch('')
        setShowModal(true)
    }

    const handleCloseModal = () => {
        setShowModal(false)
        setFormError('')
    }

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value
        })

        if (name === 'planId') {
            const plan = planes.find(p => p.id === value)
            if (plan) {
                setFormData(prev => ({ ...prev, planId: value, monto: plan.precio.toString() }))
            }
        }
    }

    const handleSelectSocio = (socio) => {
        setFormData({ ...formData, socioId: socio.id })
        setSocioSearch(`${socio.nombre} ${socio.apellido} (${socio.dni})`)
        setFilteredSocios([])
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setSaving(true)
        setFormError('')

        if (!formData.socioId) {
            setFormError('Por favor selecciona un socio')
            setSaving(false)
            return
        }

        try {
            await pagosApi.create({
                socioId: formData.socioId,
                monto: parseFloat(formData.monto),
                metodo: formData.metodo,
                notas: formData.notas,
                crearMembresia: formData.crearMembresia,
                planId: formData.crearMembresia ? formData.planId : null
            })

            handleCloseModal()
            fetchData()
        } catch (err) {
            setFormError(err.message || 'Error al registrar pago')
        } finally {
            setSaving(false)
        }
    }

    // Generar Link de Pago MP
    const handleOpenLinkModal = () => {
        setLinkForm({ socioId: '', planId: planes[0]?.id || '' })
        setLinkSocioSearch('')
        setLinkData(null)
        setLinkError('')
        setShowLinkModal(true)
    }

    const handleSelectLinkSocio = (socio) => {
        setLinkForm({ ...linkForm, socioId: socio.id })
        setLinkSocioSearch(`${socio.nombre} ${socio.apellido} (${socio.dni})`)
        setLinkFilteredSocios([])
    }

    const handleCrearLink = async () => {
        if (!linkForm.socioId || !linkForm.planId) {
            setLinkError('Selecciona un socio y un plan')
            return
        }

        setCreatingLink(true)
        setLinkError('')
        try {
            const response = await pagosApi.crearLinkPago(linkForm.socioId, linkForm.planId)
            setLinkData(response)
        } catch (err) {
            console.error('Error creando link:', err)
            setLinkError(err.message || 'Error al crear link de pago. Verifica las credenciales de Mercado Pago.')
        } finally {
            setCreatingLink(false)
        }
    }

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text)
        alert('Link copiado al portapapeles!')
    }

    // Ver Comprobante
    const handleVerComprobante = async (pagoId) => {
        try {
            const data = await pagosApi.getComprobante(pagoId)
            setComprobante(data)
            setShowComprobanteModal(true)
        } catch (err) {
            alert('Error al obtener comprobante')
        }
    }

    // Ver Reporte
    const handleVerReporte = async () => {
        try {
            const data = await pagosApi.getReporte()
            setReporte(data)
            setShowReporteModal(true)
        } catch (err) {
            alert('Error al generar reporte')
        }
    }

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
            minimumFractionDigits: 0
        }).format(value || 0)
    }

    const formatDate = (dateString) => {
        if (!dateString) return '-'
        return new Date(dateString).toLocaleString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const getMetodoLabel = (metodo) => {
        const labels = {
            efectivo: 'Efectivo',
            mercadopago: 'Mercado Pago',
            transferencia: 'Transferencia'
        }
        return labels[metodo] || metodo
    }

    return (
        <div className="pagos-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Pagos y Facturación</h1>
                    <p className="page-subtitle">Gestiona los pagos, cobros y comprobantes</p>
                </div>
                <div className="page-actions">
                    <Button variant="ghost" icon={BarChart2} onClick={handleVerReporte}>
                        Reporte
                    </Button>
                    <Button variant="secondary" icon={Link} onClick={handleOpenLinkModal} disabled={!mpStatus.configured}>
                        Link de Pago
                    </Button>
                    <Button variant="primary" icon={Plus} onClick={handleOpenModal}>
                        Registrar Pago
                    </Button>
                </div>
            </div>

            {/* MP Status Banner */}
            {!mpStatus.configured && (
                <div className="mp-banner warning">
                    <CreditCard size={20} />
                    <div>
                        <strong>Mercado Pago no configurado</strong>
                        <p>Agrega MP_ACCESS_TOKEN en el archivo .env del servidor para habilitar pagos online.</p>
                    </div>
                </div>
            )}

            {/* Resumen Cards */}
            <div className="resumen-grid">
                <div className="resumen-card resumen-total">
                    <div className="resumen-icon">
                        <DollarSign size={24} />
                    </div>
                    <div className="resumen-content">
                        <div className="resumen-label">Ingresos del Mes</div>
                        <div className="resumen-value">{formatCurrency(resumen?.total_ingresos)}</div>
                    </div>
                </div>
                <div className="resumen-card">
                    <div className="resumen-content">
                        <div className="resumen-label">Efectivo</div>
                        <div className="resumen-value-sm">{formatCurrency(resumen?.efectivo)}</div>
                    </div>
                </div>
                <div className="resumen-card">
                    <div className="resumen-content">
                        <div className="resumen-label">Mercado Pago</div>
                        <div className="resumen-value-sm">{formatCurrency(resumen?.mercadopago)}</div>
                    </div>
                </div>
                <div className="resumen-card">
                    <div className="resumen-content">
                        <div className="resumen-label">Transferencia</div>
                        <div className="resumen-value-sm">{formatCurrency(resumen?.transferencia)}</div>
                    </div>
                </div>
            </div>

            {/* Payments Table */}
            <Card title="Pagos Recientes" icon={CreditCard}>
                {loading ? (
                    <div className="pagos-loading">
                        <RefreshCw size={24} className="spin" />
                        <p>Cargando pagos...</p>
                    </div>
                ) : (
                    <div className="pagos-table-wrapper">
                        <table className="pagos-table">
                            <thead>
                                <tr>
                                    <th>Socio</th>
                                    <th>Monto</th>
                                    <th>Método</th>
                                    <th>Estado</th>
                                    <th>Fecha</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pagos.map((pago) => (
                                    <tr key={pago.id}>
                                        <td>
                                            <span className="pago-socio">{pago.socio_nombre} {pago.socio_apellido}</span>
                                        </td>
                                        <td>
                                            <span className="pago-monto">{formatCurrency(pago.monto)}</span>
                                        </td>
                                        <td>
                                            <span className={`metodo-badge metodo-${pago.metodo}`}>
                                                {getMetodoLabel(pago.metodo)}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`status-badge status-${pago.estado}`}>
                                                {pago.estado === 'completado' ? 'Completado' : pago.estado}
                                            </span>
                                        </td>
                                        <td className="pago-fecha">{formatDate(pago.fecha)}</td>
                                        <td>
                                            <button
                                                className="action-btn"
                                                title="Ver Comprobante"
                                                onClick={() => handleVerComprobante(pago.id)}
                                            >
                                                <FileText size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {pagos.length === 0 && (
                                    <tr>
                                        <td colSpan="6" className="text-center text-muted p-4">
                                            No hay pagos registrados
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {/* Modal Registrar Pago */}
            {showModal && (
                <div className="modal-overlay" onClick={handleCloseModal}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Registrar Pago</h2>
                            <button className="modal-close" onClick={handleCloseModal}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                {formError && <div className="form-error">{formError}</div>}

                                <div className="form-group">
                                    <label className="input-label">Socio *</label>
                                    <div className="socio-search-wrapper">
                                        <Search size={18} className="socio-search-icon" />
                                        <input
                                            type="text"
                                            className="socio-search-input"
                                            placeholder="Buscar por nombre o DNI..."
                                            value={socioSearch}
                                            onChange={(e) => setSocioSearch(e.target.value)}
                                        />
                                        {filteredSocios.length > 0 && (
                                            <div className="socio-dropdown">
                                                {filteredSocios.map(socio => (
                                                    <div key={socio.id} className="socio-option" onClick={() => handleSelectSocio(socio)}>
                                                        <span>{socio.nombre} {socio.apellido}</span>
                                                        <span className="socio-dni">DNI: {socio.dni}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="input-label">
                                        <input type="checkbox" name="crearMembresia" checked={formData.crearMembresia} onChange={handleChange} />
                                        {' '}Crear/Renovar membresía automáticamente
                                    </label>
                                </div>

                                {formData.crearMembresia && (
                                    <div className="form-group">
                                        <label className="input-label">Plan</label>
                                        <select name="planId" value={formData.planId} onChange={handleChange} className="form-select">
                                            {planes.map(plan => (
                                                <option key={plan.id} value={plan.id}>{plan.nombre} - {formatCurrency(plan.precio)}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div className="form-grid">
                                    <Input label="Monto (ARS)" type="number" name="monto" value={formData.monto} onChange={handleChange} required min="0" />
                                    <div className="form-group">
                                        <label className="input-label">Método de Pago</label>
                                        <select name="metodo" value={formData.metodo} onChange={handleChange} className="form-select">
                                            <option value="efectivo">Efectivo</option>
                                            <option value="mercadopago">Mercado Pago</option>
                                            <option value="transferencia">Transferencia</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="input-label">Notas (opcional)</label>
                                    <textarea name="notas" value={formData.notas} onChange={handleChange} className="form-textarea" placeholder="Notas adicionales..." rows="2" />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <Button type="button" variant="secondary" onClick={handleCloseModal}>Cancelar</Button>
                                <Button type="submit" variant="primary" loading={saving} icon={CheckCircle}>Registrar Pago</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Link de Pago MP */}
            {showLinkModal && (
                <div className="modal-overlay" onClick={() => setShowLinkModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Generar Link de Pago</h2>
                            <button className="modal-close" onClick={() => setShowLinkModal(false)}><X size={20} /></button>
                        </div>
                        <div className="modal-body">
                            {!linkData ? (
                                <>
                                    {linkError && <div className="form-error">{linkError}</div>}
                                    <div className="form-group">
                                        <label className="input-label">Socio *</label>
                                        <div className="socio-search-wrapper">
                                            <Search size={18} className="socio-search-icon" />
                                            <input type="text" className="socio-search-input" placeholder="Buscar socio..." value={linkSocioSearch} onChange={(e) => setLinkSocioSearch(e.target.value)} />
                                            {linkFilteredSocios.length > 0 && (
                                                <div className="socio-dropdown">
                                                    {linkFilteredSocios.map(socio => (
                                                        <div key={socio.id} className="socio-option" onClick={() => handleSelectLinkSocio(socio)}>
                                                            <span>{socio.nombre} {socio.apellido}</span>
                                                            <span className="socio-dni">DNI: {socio.dni}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label className="input-label">Plan *</label>
                                        <select value={linkForm.planId} onChange={(e) => setLinkForm({ ...linkForm, planId: e.target.value })} className="form-select">
                                            {planes.map(plan => (
                                                <option key={plan.id} value={plan.id}>{plan.nombre} - {formatCurrency(plan.precio)}</option>
                                            ))}
                                        </select>
                                    </div>
                                </>
                            ) : (
                                <div className="link-success">
                                    <CheckCircle size={48} className="link-success-icon" />
                                    <h3>¡Link generado!</h3>
                                    <p>Comparte este link con el socio para que pague online:</p>
                                    <div className="link-box">
                                        <input type="text" value={linkData.checkoutUrl} readOnly className="link-input" />
                                        <Button variant="secondary" icon={ExternalLink} onClick={() => copyToClipboard(linkData.checkoutUrl)}>Copiar</Button>
                                    </div>
                                    <Button variant="primary" fullWidth onClick={() => window.open(linkData.checkoutUrl, '_blank')}>Abrir Link de Pago</Button>
                                </div>
                            )}
                        </div>
                        {!linkData && (
                            <div className="modal-footer">
                                <Button type="button" variant="secondary" onClick={() => setShowLinkModal(false)}>Cancelar</Button>
                                <Button variant="primary" loading={creatingLink} onClick={handleCrearLink} icon={Link}>Generar Link</Button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Modal Comprobante */}
            {showComprobanteModal && comprobante && (
                <div className="modal-overlay" onClick={() => setShowComprobanteModal(false)}>
                    <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Comprobante de Pago</h2>
                            <button className="modal-close" onClick={() => setShowComprobanteModal(false)}><X size={20} /></button>
                        </div>
                        <div className="modal-body comprobante-body">
                            <div className="comprobante">
                                <div className="comprobante-header">
                                    <div>
                                        <h3>{comprobante.gimnasio.nombre}</h3>
                                        <p>{comprobante.gimnasio.direccion}</p>
                                        <p>{comprobante.gimnasio.telefono}</p>
                                    </div>
                                    <div className="comprobante-numero">
                                        <strong>N° {comprobante.numero}</strong>
                                        <span>{formatDate(comprobante.fecha)}</span>
                                    </div>
                                </div>
                                <div className="comprobante-cliente">
                                    <h4>Cliente</h4>
                                    <p><strong>{comprobante.cliente.nombre}</strong></p>
                                    <p>DNI: {comprobante.cliente.dni}</p>
                                </div>
                                <div className="comprobante-detalle">
                                    <table>
                                        <thead>
                                            <tr><th>Concepto</th><th>Cantidad</th><th>Precio</th><th>Total</th></tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td>{comprobante.detalle.concepto}</td>
                                                <td>1</td>
                                                <td>{formatCurrency(comprobante.detalle.precioUnitario)}</td>
                                                <td>{formatCurrency(comprobante.detalle.total)}</td>
                                            </tr>
                                        </tbody>
                                        <tfoot>
                                            <tr><td colSpan="3"><strong>TOTAL</strong></td><td><strong>{formatCurrency(comprobante.detalle.total)}</strong></td></tr>
                                        </tfoot>
                                    </table>
                                </div>
                                <div className="comprobante-footer">
                                    <p>Método de pago: <strong>{getMetodoLabel(comprobante.metodoPago)}</strong></p>
                                    {comprobante.mpPaymentId && <p>ID Mercado Pago: {comprobante.mpPaymentId}</p>}
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <Button variant="secondary" icon={Printer} onClick={() => window.print()}>Imprimir</Button>
                            <Button variant="primary" onClick={() => setShowComprobanteModal(false)}>Cerrar</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Reporte */}
            {showReporteModal && reporte && (
                <div className="modal-overlay" onClick={() => setShowReporteModal(false)}>
                    <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Reporte de Pagos</h2>
                            <button className="modal-close" onClick={() => setShowReporteModal(false)}><X size={20} /></button>
                        </div>
                        <div className="modal-body">
                            <div className="reporte-periodo">
                                <span>Período: {reporte.periodo.desde} al {reporte.periodo.hasta}</span>
                            </div>
                            <div className="reporte-resumen">
                                <div className="reporte-stat">
                                    <span className="reporte-stat-value">{formatCurrency(reporte.resumen?.total_ingresos)}</span>
                                    <span className="reporte-stat-label">Total Ingresos</span>
                                </div>
                                <div className="reporte-stat">
                                    <span className="reporte-stat-value">{reporte.resumen?.total_pagos}</span>
                                    <span className="reporte-stat-label">Total Pagos</span>
                                </div>
                            </div>
                            <div className="reporte-sections">
                                <div className="reporte-section">
                                    <h4>Por Método de Pago</h4>
                                    {reporte.porMetodo?.map((m, i) => (
                                        <div key={i} className="reporte-row">
                                            <span>{getMetodoLabel(m.metodo)}</span>
                                            <span>{m.cantidad} pagos</span>
                                            <span>{formatCurrency(m.total)}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="reporte-section">
                                    <h4>Top Planes</h4>
                                    {reporte.topPlanes?.map((p, i) => (
                                        <div key={i} className="reporte-row">
                                            <span>{p.plan}</span>
                                            <span>{p.cantidad} ventas</span>
                                            <span>{formatCurrency(p.total)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <Button variant="secondary" onClick={() => setShowReporteModal(false)}>Cerrar</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Pagos
