import { useState, useEffect } from 'react'
import { Settings, Building, CreditCard, Bell, Save, RefreshCw, CheckCircle, XCircle, ExternalLink, Unlink } from 'lucide-react'
import { Button, Card, Input } from '../../components/ui'
import { gimnasioApi } from '../../services/api'
import './Configuracion.css'

const Configuracion = () => {
    const [gimnasio, setGimnasio] = useState({
        nombre: '',
        direccion: '',
        telefono: '',
        email: ''
    })
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState('')
    const [activeTab, setActiveTab] = useState('general')

    // Mercado Pago OAuth state
    const [mpStatus, setMpStatus] = useState({
        oauthConfigured: false,
        connected: false,
        userId: null,
        connectedAt: null
    })
    const [mpLoading, setMpLoading] = useState(false)
    const [mpMessage, setMpMessage] = useState('')

    const fetchGimnasio = async () => {
        setLoading(true)
        try {
            const response = await gimnasioApi.get()
            setGimnasio({
                nombre: response.nombre || '',
                direccion: response.direccion || '',
                telefono: response.telefono || '',
                email: response.email || ''
            })
        } catch (err) {
            console.error('Error fetching gimnasio:', err)
            setGimnasio({
                nombre: 'FitNexo Demo Gym',
                direccion: 'Av. Corrientes 1234, CABA',
                telefono: '+54 11 4567-8900',
                email: 'demo@fitnexo.com'
            })
        } finally {
            setLoading(false)
        }
    }

    const fetchMPStatus = async () => {
        try {
            const response = await gimnasioApi.getMPStatus()
            setMpStatus(response)
        } catch (err) {
            console.error('Error fetching MP status:', err)
        }
    }

    useEffect(() => {
        fetchGimnasio()
        fetchMPStatus()

        // Check for OAuth callback
        const urlParams = new URLSearchParams(window.location.search)
        const code = urlParams.get('code')
        const state = urlParams.get('state')

        if (code) {
            handleMPCallback(code, state)
            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname)
        }
    }, [])

    const handleChange = (e) => {
        setGimnasio({
            ...gimnasio,
            [e.target.name]: e.target.value
        })
        setMessage('')
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setSaving(true)
        setMessage('')

        try {
            await gimnasioApi.update(gimnasio)
            setMessage('✅ Configuración guardada exitosamente')
        } catch (err) {
            setMessage('❌ Error al guardar: ' + (err.message || 'Intenta de nuevo'))
        } finally {
            setSaving(false)
        }
    }

    // Mercado Pago OAuth handlers
    const handleConnectMP = async () => {
        setMpLoading(true)
        setMpMessage('')
        try {
            const response = await gimnasioApi.getMPConnectUrl()
            // Redirect to MP authorization
            window.location.href = response.authUrl
        } catch (err) {
            setMpMessage('❌ Error: ' + (err.message || 'No se pudo iniciar conexión'))
            setMpLoading(false)
        }
    }

    const handleMPCallback = async (code, state) => {
        setMpLoading(true)
        setMpMessage('Conectando con Mercado Pago...')
        setActiveTab('pagos')

        try {
            const response = await gimnasioApi.mpCallback(code, state)
            if (response.success) {
                setMpMessage('✅ ¡Mercado Pago conectado exitosamente!')
                await fetchMPStatus()
            } else {
                setMpMessage('❌ Error al conectar')
            }
        } catch (err) {
            setMpMessage('❌ Error: ' + (err.message || 'No se pudo completar la conexión'))
        } finally {
            setMpLoading(false)
        }
    }

    const handleDisconnectMP = async () => {
        if (!confirm('¿Estás seguro de desconectar Mercado Pago? Los socios no podrán pagar online.')) {
            return
        }

        setMpLoading(true)
        try {
            await gimnasioApi.disconnectMP()
            setMpStatus({ ...mpStatus, connected: false, userId: null })
            setMpMessage('✅ Mercado Pago desconectado')
        } catch (err) {
            setMpMessage('❌ Error al desconectar')
        } finally {
            setMpLoading(false)
        }
    }

    const tabs = [
        { id: 'general', label: 'Datos del Gimnasio', icon: Building },
        { id: 'pagos', label: 'Mercado Pago', icon: CreditCard },
        { id: 'notificaciones', label: 'Notificaciones', icon: Bell },
    ]

    if (loading) {
        return (
            <div className="configuracion-page">
                <div className="page-header">
                    <h1 className="page-title">Configuración</h1>
                </div>
                <div className="config-loading">
                    <RefreshCw size={32} className="spin" />
                    <p>Cargando configuración...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="configuracion-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Configuración</h1>
                    <p className="page-subtitle">Personaliza tu gimnasio y preferencias</p>
                </div>
            </div>

            <div className="config-layout">
                {/* Tabs */}
                <div className="config-tabs">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            className={`config-tab ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            <tab.icon size={18} />
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="config-content">
                    {activeTab === 'general' && (
                        <Card title="Datos del Gimnasio" icon={Building}>
                            <form onSubmit={handleSubmit}>
                                {message && (
                                    <div className={`config-message ${message.includes('❌') ? 'error' : 'success'}`}>
                                        {message}
                                    </div>
                                )}

                                <div className="config-form">
                                    <Input
                                        label="Nombre del Gimnasio"
                                        name="nombre"
                                        value={gimnasio.nombre}
                                        onChange={handleChange}
                                        placeholder="Mi Gimnasio"
                                    />
                                    <Input
                                        label="Dirección"
                                        name="direccion"
                                        value={gimnasio.direccion}
                                        onChange={handleChange}
                                        placeholder="Av. Ejemplo 123, Ciudad"
                                    />
                                    <div className="form-grid">
                                        <Input
                                            label="Teléfono"
                                            name="telefono"
                                            value={gimnasio.telefono}
                                            onChange={handleChange}
                                            placeholder="+54 11 1234-5678"
                                        />
                                        <Input
                                            label="Email de Contacto"
                                            type="email"
                                            name="email"
                                            value={gimnasio.email}
                                            onChange={handleChange}
                                            placeholder="contacto@gimnasio.com"
                                        />
                                    </div>
                                </div>

                                <div className="config-actions">
                                    <Button type="submit" variant="primary" icon={Save} loading={saving}>
                                        Guardar Cambios
                                    </Button>
                                </div>
                            </form>
                        </Card>
                    )}

                    {activeTab === 'pagos' && (
                        <Card title="Integración Mercado Pago" icon={CreditCard}>
                            <div className="config-section">
                                {mpMessage && (
                                    <div className={`config-message ${mpMessage.includes('❌') ? 'error' : 'success'}`}>
                                        {mpMessage}
                                    </div>
                                )}

                                <div className="integration-status">
                                    <div className={`integration-icon ${mpStatus.connected ? 'connected' : 'pending'}`}>
                                        {mpStatus.connected ? <CheckCircle size={24} /> : <CreditCard size={24} />}
                                    </div>
                                    <div className="integration-info">
                                        <h4>Mercado Pago</h4>
                                        <p>
                                            {mpStatus.connected
                                                ? `Conectado (ID: ${mpStatus.userId})`
                                                : 'No conectado - conecta tu cuenta para recibir pagos'}
                                        </p>
                                    </div>
                                    <span className={`integration-badge ${mpStatus.connected ? 'connected' : 'pending'}`}>
                                        {mpStatus.connected ? 'Conectado' : 'Pendiente'}
                                    </span>
                                </div>

                                {!mpStatus.connected ? (
                                    <div className="mp-connect-section">
                                        <div className="mp-connect-info">
                                            <h4>🔐 Conecta tu cuenta de Mercado Pago</h4>
                                            <p>
                                                Al conectar tu cuenta, los pagos de tus socios irán directamente a tu Mercado Pago.
                                                Es seguro y puedes desconectarla cuando quieras.
                                            </p>
                                            <ul className="mp-benefits">
                                                <li>✅ Recibe pagos online de tus socios</li>
                                                <li>✅ Los pagos van directo a tu cuenta</li>
                                                <li>✅ Membresías se activan automáticamente</li>
                                                <li>✅ Sin comisiones adicionales de FitNexo</li>
                                            </ul>
                                        </div>

                                        <div className="config-actions">
                                            <Button
                                                variant="primary"
                                                icon={ExternalLink}
                                                onClick={handleConnectMP}
                                                loading={mpLoading}
                                                disabled={!mpStatus.oauthConfigured}
                                            >
                                                Conectar con Mercado Pago
                                            </Button>
                                        </div>

                                        {!mpStatus.oauthConfigured && (
                                            <p className="mp-warning">
                                                ⚠️ OAuth no configurado en el servidor. Contacta al administrador.
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <div className="mp-connected-section">
                                        <div className="mp-connected-info">
                                            <p>
                                                <strong>Conectado desde:</strong>{' '}
                                                {mpStatus.connectedAt
                                                    ? new Date(mpStatus.connectedAt).toLocaleDateString('es-AR')
                                                    : 'Recientemente'}
                                            </p>
                                            <p>
                                                <strong>ID de usuario:</strong> {mpStatus.userId}
                                            </p>
                                        </div>

                                        <div className="config-actions">
                                            <Button
                                                variant="danger"
                                                icon={Unlink}
                                                onClick={handleDisconnectMP}
                                                loading={mpLoading}
                                            >
                                                Desconectar Mercado Pago
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Card>
                    )}

                    {activeTab === 'notificaciones' && (
                        <Card title="Notificaciones WhatsApp" icon={Bell}>
                            <div className="config-section">
                                <div className="integration-status">
                                    <div className="integration-icon pending">
                                        <Bell size={24} />
                                    </div>
                                    <div className="integration-info">
                                        <h4>WhatsApp Business</h4>
                                        <p>No configurado - próximamente</p>
                                    </div>
                                    <span className="integration-badge pending">Próximamente</span>
                                </div>

                                <div className="notification-options">
                                    <h4>Notificaciones Automáticas</h4>
                                    <label className="notification-option">
                                        <input type="checkbox" defaultChecked />
                                        <div>
                                            <span>Recordatorio de vencimiento</span>
                                            <small>3 días antes del vencimiento</small>
                                        </div>
                                    </label>
                                    <label className="notification-option">
                                        <input type="checkbox" defaultChecked />
                                        <div>
                                            <span>Aviso de pago pendiente</span>
                                            <small>Al día siguiente del vencimiento</small>
                                        </div>
                                    </label>
                                    <label className="notification-option">
                                        <input type="checkbox" />
                                        <div>
                                            <span>Mensaje de cumpleaños</span>
                                            <small>El día del cumpleaños del socio</small>
                                        </div>
                                    </label>
                                </div>

                                <div className="config-actions">
                                    <Button variant="primary" icon={Save} disabled>
                                        Guardar Preferencias
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    )
}

export default Configuracion
