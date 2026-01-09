import { useState, useRef, useEffect } from 'react'
import { Camera, X, QrCode } from 'lucide-react'
import { Button } from './index'

const QRScanner = ({ onScan, onClose }) => {
    const videoRef = useRef(null)
    const canvasRef = useRef(null)
    const [error, setError] = useState('')
    const [scanning, setScanning] = useState(false)
    const intervalRef = useRef(null)

    useEffect(() => {
        startCamera()
        return () => {
            stopCamera()
        }
    }, [])

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            })
            if (videoRef.current) {
                videoRef.current.srcObject = stream
                videoRef.current.play()
                setScanning(true)
                startScanning()
            }
        } catch (err) {
            console.error('Camera error:', err)
            setError('No se pudo acceder a la cámara. Verifica los permisos.')
        }
    }

    const stopCamera = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current)
        }
        if (videoRef.current?.srcObject) {
            videoRef.current.srcObject.getTracks().forEach(track => track.stop())
        }
    }

    const startScanning = () => {
        // Check if BarcodeDetector is available (Chrome, Edge)
        if ('BarcodeDetector' in window) {
            const barcodeDetector = new window.BarcodeDetector({ formats: ['qr_code'] })

            intervalRef.current = setInterval(async () => {
                if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
                    try {
                        const barcodes = await barcodeDetector.detect(videoRef.current)
                        if (barcodes.length > 0) {
                            const qrData = barcodes[0].rawValue
                            stopCamera()
                            try {
                                const parsed = JSON.parse(qrData)
                                onScan(parsed)
                            } catch {
                                onScan({ raw: qrData })
                            }
                        }
                    } catch (err) {
                        // Continue scanning
                    }
                }
            }, 200)
        } else {
            setError('Tu navegador no soporta escaneo de QR. Usa Chrome o Edge.')
        }
    }

    return (
        <div className="qr-scanner-modal">
            <div className="qr-scanner-container">
                <div className="qr-scanner-header">
                    <h3><QrCode size={20} /> Escanear QR de Socio</h3>
                    <button className="qr-scanner-close" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <div className="qr-scanner-viewport">
                    {error ? (
                        <div className="qr-scanner-error">
                            <Camera size={48} />
                            <p>{error}</p>
                            <Button variant="primary" onClick={startCamera}>
                                Reintentar
                            </Button>
                        </div>
                    ) : (
                        <>
                            <video
                                ref={videoRef}
                                className="qr-scanner-video"
                                playsInline
                                muted
                            />
                            <div className="qr-scanner-overlay">
                                <div className="qr-scanner-frame"></div>
                            </div>
                            <canvas ref={canvasRef} style={{ display: 'none' }} />
                        </>
                    )}
                </div>

                <div className="qr-scanner-instructions">
                    <p>Apunta la cámara al código QR del socio</p>
                </div>
            </div>
        </div>
    )
}

export default QRScanner
