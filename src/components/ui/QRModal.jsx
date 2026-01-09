import { useState, useEffect } from 'react'
import { QrCode, X, Download, Printer, CheckCircle, XCircle } from 'lucide-react'
import { Button } from './index'
import { sociosApi } from '../../services/api'

const QRModal = ({ socioId, onClose }) => {
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [data, setData] = useState(null)

    useEffect(() => {
        fetchQR()
    }, [socioId])

    const fetchQR = async () => {
        setLoading(true)
        setError('')
        try {
            const response = await sociosApi.getQR(socioId)
            setData(response)
        } catch (err) {
            setError(err.message || 'Error al generar QR')
        } finally {
            setLoading(false)
        }
    }

    const handleDownload = () => {
        if (!data?.qrCode) return

        const link = document.createElement('a')
        link.download = `qr-${data.socio.nombre.replace(/\s+/g, '-')}.png`
        link.href = data.qrCode
        link.click()
    }

    const handlePrint = () => {
        const printWindow = window.open('', '_blank')
        printWindow.document.write(`
            <html>
                <head>
                    <title>QR de Acceso - ${data?.socio?.nombre}</title>
                    <style>
                        body {
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            justify-content: center;
                            min-height: 100vh;
                            font-family: Arial, sans-serif;
                            margin: 0;
                            padding: 20px;
                        }
                        .qr-print {
                            text-align: center;
                            border: 2px solid #333;
                            padding: 20px;
                            border-radius: 10px;
                        }
                        .qr-print img {
                            width: 200px;
                            height: 200px;
                        }
                        .name {
                            font-size: 18px;
                            font-weight: bold;
                            margin: 10px 0 5px;
                        }
                        .dni {
                            font-size: 14px;
                            color: #666;
                        }
                        .gym {
                            font-size: 12px;
                            margin-top: 15px;
                            color: #999;
                        }
                    </style>
                </head>
                <body>
                    <div class="qr-print">
                        <img src="${data?.qrCode}" alt="QR Code" />
                        <div class="name">${data?.socio?.nombre}</div>
                        <div class="dni">DNI: ${data?.socio?.dni}</div>
                        <div class="gym">FitNexo Gym Access</div>
                    </div>
                    <script>
                        window.onload = function() {
                            window.print();
                            window.close();
                        }
                    </script>
                </body>
            </html>
        `)
        printWindow.document.close()
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal qr-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2><QrCode size={20} /> Código QR de Acceso</h2>
                    <button className="modal-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="modal-body">
                    {loading ? (
                        <div className="qr-loading">
                            <div className="spinner"></div>
                            <p>Generando código QR...</p>
                        </div>
                    ) : error ? (
                        <div className="qr-error">
                            <XCircle size={48} />
                            <p>{error}</p>
                            <Button variant="secondary" onClick={fetchQR}>
                                Reintentar
                            </Button>
                        </div>
                    ) : (
                        <div className="qr-content">
                            <div className="qr-image-container">
                                <img
                                    src={data?.qrCode}
                                    alt="QR Code"
                                    className="qr-image"
                                />
                            </div>

                            <div className="qr-socio-info">
                                <h3>{data?.socio?.nombre}</h3>
                                <p className="qr-dni">DNI: {data?.socio?.dni}</p>
                                {data?.socio?.plan && (
                                    <p className="qr-plan">Plan: {data?.socio?.plan}</p>
                                )}
                                <div className={`qr-status ${data?.socio?.membresiaActiva ? 'active' : 'inactive'}`}>
                                    {data?.socio?.membresiaActiva ? (
                                        <>
                                            <CheckCircle size={16} />
                                            <span>Membresía Activa</span>
                                        </>
                                    ) : (
                                        <>
                                            <XCircle size={16} />
                                            <span>Membresía Vencida</span>
                                        </>
                                    )}
                                </div>
                                {data?.socio?.validHasta && (
                                    <p className="qr-valid">
                                        Válido hasta: {new Date(data.socio.validHasta).toLocaleDateString('es-AR')}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {!loading && !error && (
                    <div className="modal-footer">
                        <Button variant="secondary" icon={Printer} onClick={handlePrint}>
                            Imprimir
                        </Button>
                        <Button variant="primary" icon={Download} onClick={handleDownload}>
                            Descargar
                        </Button>
                    </div>
                )}
            </div>
        </div>
    )
}

export default QRModal
