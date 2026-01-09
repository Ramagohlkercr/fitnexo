import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { query } from '../config/database.js'

const router = Router()

const JWT_SECRET = process.env.JWT_SECRET || 'fitnexo-socio-secret-key'

// POST /api/socio-auth/login - Login for socios
router.post('/login', async (req, res, next) => {
    try {
        const { email, password } = req.body

        if (!email || !password) {
            return res.status(400).json({ error: 'Email y contraseña son requeridos' })
        }

        // Find socio by email
        const result = await query(`
            SELECT s.*, 
                g.nombre as gimnasio_nombre,
                m.fecha_fin as membresia_fin,
                m.estado as membresia_estado,
                p.nombre as plan_nombre
            FROM socios s
            JOIN gimnasios g ON s.gimnasio_id = g.id
            LEFT JOIN LATERAL (
                SELECT * FROM membresias 
                WHERE socio_id = s.id 
                ORDER BY fecha_fin DESC 
                LIMIT 1
            ) m ON true
            LEFT JOIN planes p ON m.plan_id = p.id
            WHERE LOWER(s.email) = LOWER($1) AND s.activo = true
        `, [email])

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Email o contraseña incorrectos' })
        }

        const socio = result.rows[0]

        // Check password
        // If socio has no password set, use DNI as default
        let isValid = false
        if (socio.password_hash) {
            isValid = await bcrypt.compare(password, socio.password_hash)
        } else {
            // First login: password should be DNI
            isValid = password === socio.dni
            if (isValid) {
                // Hash and save the DNI as password for future logins
                const hashedPassword = await bcrypt.hash(socio.dni, 10)
                await query('UPDATE socios SET password_hash = $1 WHERE id = $2', [hashedPassword, socio.id])
            }
        }

        if (!isValid) {
            return res.status(401).json({ error: 'Email o contraseña incorrectos' })
        }

        // Generate JWT
        const token = jwt.sign(
            {
                socioId: socio.id,
                gimnasioId: socio.gimnasio_id,
                email: socio.email,
                tipo: 'socio'
            },
            JWT_SECRET,
            { expiresIn: '30d' }
        )

        res.json({
            token,
            socio: {
                id: socio.id,
                nombre: socio.nombre,
                apellido: socio.apellido,
                email: socio.email,
                dni: socio.dni,
                gimnasio: socio.gimnasio_nombre,
                plan: socio.plan_nombre,
                membresiaFin: socio.membresia_fin,
                membresiaActiva: socio.membresia_estado === 'activa' && new Date(socio.membresia_fin) >= new Date()
            }
        })
    } catch (error) {
        next(error)
    }
})

// Middleware for socio authentication
export const socioAuthMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No autorizado' })
        }

        const token = authHeader.split(' ')[1]
        const decoded = jwt.verify(token, JWT_SECRET)

        if (decoded.tipo !== 'socio') {
            return res.status(401).json({ error: 'Token inválido' })
        }

        req.socioId = decoded.socioId
        req.gimnasioId = decoded.gimnasioId
        next()
    } catch (error) {
        return res.status(401).json({ error: 'Token inválido o expirado' })
    }
}

// GET /api/socio-auth/me - Get current socio profile
router.get('/me', socioAuthMiddleware, async (req, res, next) => {
    try {
        const result = await query(`
            SELECT s.*, 
                g.nombre as gimnasio_nombre,
                m.fecha_fin as membresia_fin,
                m.fecha_inicio as membresia_inicio,
                m.estado as membresia_estado,
                p.nombre as plan_nombre
            FROM socios s
            JOIN gimnasios g ON s.gimnasio_id = g.id
            LEFT JOIN LATERAL (
                SELECT * FROM membresias 
                WHERE socio_id = s.id 
                ORDER BY fecha_fin DESC 
                LIMIT 1
            ) m ON true
            LEFT JOIN planes p ON m.plan_id = p.id
            WHERE s.id = $1
        `, [req.socioId])

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Socio no encontrado' })
        }

        const socio = result.rows[0]

        // Get stats
        const statsResult = await query(`
            SELECT 
                (SELECT COUNT(*) FROM accesos WHERE socio_id = $1) as total_accesos,
                (SELECT COUNT(*) FROM accesos WHERE socio_id = $1 AND entrada >= CURRENT_DATE - INTERVAL '30 days') as accesos_mes
        `, [req.socioId])

        res.json({
            id: socio.id,
            nombre: socio.nombre,
            apellido: socio.apellido,
            email: socio.email,
            dni: socio.dni,
            telefono: socio.telefono,
            gimnasio: socio.gimnasio_nombre,
            plan: socio.plan_nombre,
            membresiaInicio: socio.membresia_inicio,
            membresiaFin: socio.membresia_fin,
            membresiaActiva: socio.membresia_estado === 'activa' && new Date(socio.membresia_fin) >= new Date(),
            estadisticas: {
                totalAccesos: parseInt(statsResult.rows[0]?.total_accesos) || 0,
                accesosMes: parseInt(statsResult.rows[0]?.accesos_mes) || 0
            }
        })
    } catch (error) {
        next(error)
    }
})

// PUT /api/socio-auth/password - Change password
router.put('/password', socioAuthMiddleware, async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Contraseña actual y nueva son requeridas' })
        }

        if (newPassword.length < 4) {
            return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 4 caracteres' })
        }

        // Get current password
        const result = await query('SELECT password_hash, dni FROM socios WHERE id = $1', [req.socioId])
        const socio = result.rows[0]

        // Verify current password
        let isValid = false
        if (socio.password_hash) {
            isValid = await bcrypt.compare(currentPassword, socio.password_hash)
        } else {
            isValid = currentPassword === socio.dni
        }

        if (!isValid) {
            return res.status(401).json({ error: 'Contraseña actual incorrecta' })
        }

        // Hash and save new password
        const hashedPassword = await bcrypt.hash(newPassword, 10)
        await query('UPDATE socios SET password_hash = $1 WHERE id = $2', [hashedPassword, req.socioId])

        res.json({ message: 'Contraseña actualizada correctamente' })
    } catch (error) {
        next(error)
    }
})

// GET /api/socio-auth/qr - Get QR code for access
router.get('/qr', socioAuthMiddleware, async (req, res, next) => {
    try {
        const QRCode = await import('qrcode')

        const result = await query(`
            SELECT s.*, 
                m.fecha_fin as membresia_fin,
                m.estado as membresia_estado,
                p.nombre as plan_nombre
            FROM socios s
            LEFT JOIN LATERAL (
                SELECT * FROM membresias 
                WHERE socio_id = s.id AND estado = 'activa'
                ORDER BY fecha_fin DESC 
                LIMIT 1
            ) m ON true
            LEFT JOIN planes p ON m.plan_id = p.id
            WHERE s.id = $1
        `, [req.socioId])

        const socio = result.rows[0]
        const membresiaActiva = socio.membresia_estado === 'activa' && new Date(socio.membresia_fin) >= new Date()

        const qrPayload = {
            id: socio.id,
            gym: socio.gimnasio_id,
            ts: Date.now()
        }

        const qrDataUrl = await QRCode.default.toDataURL(JSON.stringify(qrPayload), {
            width: 300,
            margin: 2,
            color: {
                dark: '#1a1a2e',
                light: '#ffffff'
            }
        })

        res.json({
            qrCode: qrDataUrl,
            socio: {
                nombre: `${socio.nombre} ${socio.apellido}`,
                dni: socio.dni,
                plan: socio.plan_nombre,
                membresiaActiva,
                validHasta: socio.membresia_fin
            }
        })
    } catch (error) {
        next(error)
    }
})

// GET /api/socio-auth/accesos - Get access history
router.get('/accesos', socioAuthMiddleware, async (req, res, next) => {
    try {
        const result = await query(`
            SELECT id, entrada, salida, metodo
            FROM accesos
            WHERE socio_id = $1
            ORDER BY entrada DESC
            LIMIT 30
        `, [req.socioId])

        res.json(result.rows)
    } catch (error) {
        next(error)
    }
})

// GET /api/socio-auth/pagos - Get payment history
router.get('/pagos', socioAuthMiddleware, async (req, res, next) => {
    try {
        const result = await query(`
            SELECT id, monto, metodo, estado, fecha
            FROM pagos
            WHERE socio_id = $1
            ORDER BY fecha DESC
            LIMIT 20
        `, [req.socioId])

        res.json(result.rows)
    } catch (error) {
        next(error)
    }
})

export default router
