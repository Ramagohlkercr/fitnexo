import { Router } from 'express'
import { query } from '../config/database.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

router.use(authMiddleware)

// GET /api/accesos - List accesses
router.get('/', async (req, res, next) => {
    try {
        const { socioId, fecha, page = 1, limit = 50 } = req.query
        const offset = (page - 1) * limit

        let whereClause = 'WHERE s.gimnasio_id = $1'
        const params = [req.gimnasioId]
        let paramCount = 1

        if (socioId) {
            paramCount++
            whereClause += ` AND a.socio_id = $${paramCount}`
            params.push(socioId)
        }

        if (fecha) {
            paramCount++
            whereClause += ` AND DATE(a.entrada) = $${paramCount}`
            params.push(fecha)
        } else {
            // Default to today
            whereClause += ` AND DATE(a.entrada) = CURRENT_DATE`
        }

        const result = await query(`
      SELECT a.*,
        s.nombre as socio_nombre,
        s.apellido as socio_apellido,
        s.dni as socio_dni
      FROM accesos a
      JOIN socios s ON a.socio_id = s.id
      ${whereClause}
      ORDER BY a.entrada DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `, [...params, limit, offset])

        res.json(result.rows)
    } catch (error) {
        next(error)
    }
})

// POST /api/accesos/entrada - Register entry (via QR or manual)
router.post('/entrada', async (req, res, next) => {
    try {
        const { socioId, metodo = 'qr' } = req.body

        if (!socioId) {
            return res.status(400).json({ error: 'Socio ID es requerido' })
        }

        // Check if socio exists and belongs to this gym
        const socioResult = await query(`
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
      WHERE s.id = $1 AND s.gimnasio_id = $2
    `, [socioId, req.gimnasioId])

        if (socioResult.rows.length === 0) {
            return res.status(404).json({ error: 'Socio no encontrado' })
        }

        const socio = socioResult.rows[0]

        // Check membership status
        const membresiaActiva = socio.membresia_estado === 'activa' &&
            new Date(socio.membresia_fin) >= new Date()

        // Check if already entered today without exit
        const existingAccess = await query(`
      SELECT id FROM accesos 
      WHERE socio_id = $1 
        AND DATE(entrada) = CURRENT_DATE 
        AND salida IS NULL
      ORDER BY entrada DESC
      LIMIT 1
    `, [socioId])

        if (existingAccess.rows.length > 0) {
            return res.status(400).json({
                error: 'El socio ya registró entrada hoy',
                accesoId: existingAccess.rows[0].id
            })
        }

        // Register entry
        const result = await query(`
      INSERT INTO accesos (socio_id, metodo)
      VALUES ($1, $2)
      RETURNING *
    `, [socioId, metodo])

        res.status(201).json({
            acceso: result.rows[0],
            socio: {
                id: socio.id,
                nombre: `${socio.nombre} ${socio.apellido}`,
                dni: socio.dni,
                plan: socio.plan_nombre,
                membresiaActiva,
                membresiaVence: socio.membresia_fin
            },
            mensaje: membresiaActiva
                ? `Bienvenido ${socio.nombre}!`
                : `⚠️ ${socio.nombre} - Membresía vencida`
        })
    } catch (error) {
        next(error)
    }
})

// POST /api/accesos/:id/salida - Register exit
router.post('/:id/salida', async (req, res, next) => {
    try {
        const { id } = req.params

        const result = await query(`
      UPDATE accesos 
      SET salida = CURRENT_TIMESTAMP
      WHERE id = $1 AND salida IS NULL
      RETURNING *
    `, [id])

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Acceso no encontrado o ya tiene salida registrada' })
        }

        res.json(result.rows[0])
    } catch (error) {
        next(error)
    }
})

// POST /api/accesos/validar-qr - Validate QR and register entry
router.post('/validar-qr', async (req, res, next) => {
    try {
        const { qrData } = req.body

        if (!qrData || !qrData.id) {
            return res.status(400).json({ error: 'Datos de QR inválidos' })
        }

        // Forward to entrada endpoint
        req.body.socioId = qrData.id
        req.body.metodo = 'qr'

        // Reuse entrada logic
        const socioResult = await query(`
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
      WHERE s.id = $1 AND s.gimnasio_id = $2
    `, [qrData.id, req.gimnasioId])

        if (socioResult.rows.length === 0) {
            return res.status(404).json({
                valido: false,
                error: 'Socio no encontrado'
            })
        }

        const socio = socioResult.rows[0]
        const membresiaActiva = socio.membresia_estado === 'activa' &&
            new Date(socio.membresia_fin) >= new Date()

        // Register entry
        const accessResult = await query(`
      INSERT INTO accesos (socio_id, metodo)
      VALUES ($1, 'qr')
      RETURNING *
    `, [qrData.id])

        res.json({
            valido: true,
            acceso: accessResult.rows[0],
            socio: {
                id: socio.id,
                nombre: `${socio.nombre} ${socio.apellido}`,
                foto: socio.foto_url,
                membresiaActiva,
                diasRestantes: membresiaActiva
                    ? Math.ceil((new Date(socio.membresia_fin) - new Date()) / (1000 * 60 * 60 * 24))
                    : 0
            }
        })
    } catch (error) {
        next(error)
    }
})

// GET /api/accesos/estadisticas - Get access statistics
router.get('/estadisticas', async (req, res, next) => {
    try {
        const { periodo = 'semana' } = req.query

        let dateFilter = ''
        if (periodo === 'hoy') {
            dateFilter = "AND DATE(a.entrada) = CURRENT_DATE"
        } else if (periodo === 'semana') {
            dateFilter = "AND a.entrada >= CURRENT_DATE - INTERVAL '7 days'"
        } else if (periodo === 'mes') {
            dateFilter = "AND a.entrada >= DATE_TRUNC('month', CURRENT_DATE)"
        }

        // Total accesses
        const totalResult = await query(`
      SELECT COUNT(*) as total
      FROM accesos a
      JOIN socios s ON a.socio_id = s.id
      WHERE s.gimnasio_id = $1 ${dateFilter}
    `, [req.gimnasioId])

        // By day
        const byDayResult = await query(`
      SELECT DATE(a.entrada) as fecha, COUNT(*) as cantidad
      FROM accesos a
      JOIN socios s ON a.socio_id = s.id
      WHERE s.gimnasio_id = $1 ${dateFilter}
      GROUP BY DATE(a.entrada)
      ORDER BY fecha
    `, [req.gimnasioId])

        // By hour (today)
        const byHourResult = await query(`
      SELECT EXTRACT(HOUR FROM a.entrada) as hora, COUNT(*) as cantidad
      FROM accesos a
      JOIN socios s ON a.socio_id = s.id
      WHERE s.gimnasio_id = $1 AND DATE(a.entrada) = CURRENT_DATE
      GROUP BY EXTRACT(HOUR FROM a.entrada)
      ORDER BY hora
    `, [req.gimnasioId])

        res.json({
            total: parseInt(totalResult.rows[0].total),
            porDia: byDayResult.rows,
            porHora: byHourResult.rows
        })
    } catch (error) {
        next(error)
    }
})

export default router
