import { Router } from 'express'
import { query } from '../config/database.js'
import { authMiddleware } from '../middleware/auth.js'
import QRCode from 'qrcode'

const router = Router()

// All routes require authentication
router.use(authMiddleware)

// GET /api/socios - List all socios
router.get('/', async (req, res, next) => {
    try {
        const { search, estado, page = 1, limit = 50 } = req.query
        const offset = (page - 1) * limit

        let whereClause = 'WHERE s.gimnasio_id = $1'
        const params = [req.gimnasioId]
        let paramCount = 1

        // Search filter
        if (search) {
            paramCount++
            whereClause += ` AND (
        s.nombre ILIKE $${paramCount} OR 
        s.apellido ILIKE $${paramCount} OR 
        s.dni ILIKE $${paramCount} OR
        s.email ILIKE $${paramCount}
      )`
            params.push(`%${search}%`)
        }

        // Estado filter (based on membership)
        if (estado === 'activo') {
            whereClause += ` AND EXISTS (
        SELECT 1 FROM membresias m 
        WHERE m.socio_id = s.id 
        AND m.estado = 'activa' 
        AND m.fecha_fin >= CURRENT_DATE
      )`
        } else if (estado === 'vencido') {
            whereClause += ` AND NOT EXISTS (
        SELECT 1 FROM membresias m 
        WHERE m.socio_id = s.id 
        AND m.estado = 'activa' 
        AND m.fecha_fin >= CURRENT_DATE
      )`
        } else if (estado === 'por_vencer') {
            whereClause += ` AND EXISTS (
        SELECT 1 FROM membresias m 
        WHERE m.socio_id = s.id 
        AND m.estado = 'activa' 
        AND m.fecha_fin BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
      )`
        }

        // Get total count
        const countResult = await query(
            `SELECT COUNT(*) FROM socios s ${whereClause}`,
            params
        )
        const total = parseInt(countResult.rows[0].count)

        // Get socios with latest membership
        const result = await query(`
      SELECT 
        s.*,
        m.fecha_inicio as membresia_inicio,
        m.fecha_fin as membresia_fin,
        m.estado as membresia_estado,
        p.nombre as plan_nombre,
        p.precio as plan_precio,
        CASE 
          WHEN m.fecha_fin IS NULL THEN 'sin_membresia'
          WHEN m.fecha_fin < CURRENT_DATE THEN 'vencido'
          WHEN m.fecha_fin <= CURRENT_DATE + INTERVAL '7 days' THEN 'por_vencer'
          ELSE 'activo'
        END as estado_actual
      FROM socios s
      LEFT JOIN LATERAL (
        SELECT * FROM membresias 
        WHERE socio_id = s.id 
        ORDER BY fecha_fin DESC 
        LIMIT 1
      ) m ON true
      LEFT JOIN planes p ON m.plan_id = p.id
      ${whereClause}
      ORDER BY s.apellido, s.nombre
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `, [...params, limit, offset])

        res.json({
            socios: result.rows,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / limit)
            }
        })
    } catch (error) {
        next(error)
    }
})

// GET /api/socios/:id - Get single socio with full history
router.get('/:id', async (req, res, next) => {
    try {
        const { id } = req.params

        // Get basic socio info
        const socioResult = await query(`
            SELECT s.*,
                p.nombre as plan_nombre,
                m.fecha_inicio as membresia_inicio,
                m.fecha_fin as membresia_fin,
                m.estado as membresia_estado
            FROM socios s
            LEFT JOIN LATERAL (
                SELECT * FROM membresias 
                WHERE socio_id = s.id 
                ORDER BY fecha_fin DESC 
                LIMIT 1
            ) m ON true
            LEFT JOIN planes p ON m.plan_id = p.id
            WHERE s.id = $1 AND s.gimnasio_id = $2
        `, [id, req.gimnasioId])

        if (socioResult.rows.length === 0) {
            return res.status(404).json({ error: 'Socio no encontrado' })
        }

        const socio = socioResult.rows[0]

        // Get memberships history
        const membresiasResult = await query(`
            SELECT m.id, m.fecha_inicio, m.fecha_fin, m.estado, p.nombre as plan_nombre, p.precio
            FROM membresias m
            JOIN planes p ON m.plan_id = p.id
            WHERE m.socio_id = $1
            ORDER BY m.fecha_fin DESC
        `, [id])

        // Get payments history
        const pagosResult = await query(`
            SELECT id, monto, metodo, estado, fecha
            FROM pagos
            WHERE socio_id = $1
            ORDER BY fecha DESC
            LIMIT 20
        `, [id])

        // Get access history (last 30)
        const accesosResult = await query(`
            SELECT id, entrada, salida, metodo
            FROM accesos
            WHERE socio_id = $1
            ORDER BY entrada DESC
            LIMIT 30
        `, [id])

        // Get stats
        const statsResult = await query(`
            SELECT 
                (SELECT COUNT(*) FROM accesos WHERE socio_id = $1) as total_accesos,
                (SELECT COUNT(*) FROM accesos WHERE socio_id = $1 AND entrada >= CURRENT_DATE - INTERVAL '30 days') as accesos_mes,
                (SELECT COALESCE(SUM(monto), 0) FROM pagos WHERE socio_id = $1 AND estado = 'completado') as total_pagado,
                (SELECT COUNT(*) FROM membresias WHERE socio_id = $1) as total_membresias
        `, [id])

        res.json({
            ...socio,
            membresias: membresiasResult.rows,
            pagos: pagosResult.rows,
            accesos: accesosResult.rows,
            estadisticas: {
                totalAccesos: parseInt(statsResult.rows[0]?.total_accesos) || 0,
                accesosMes: parseInt(statsResult.rows[0]?.accesos_mes) || 0,
                totalPagado: parseFloat(statsResult.rows[0]?.total_pagado) || 0,
                totalMembresias: parseInt(statsResult.rows[0]?.total_membresias) || 0
            }
        })
    } catch (error) {
        next(error)
    }
})

// POST /api/socios - Create socio
router.post('/', async (req, res, next) => {
    try {
        const { dni, nombre, apellido, email, telefono, fechaNacimiento, direccion, notas } = req.body

        if (!dni || !nombre || !apellido) {
            return res.status(400).json({ error: 'DNI, nombre y apellido son requeridos' })
        }

        const result = await query(`
      INSERT INTO socios (gimnasio_id, dni, nombre, apellido, email, telefono, fecha_nacimiento, direccion, notas)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [req.gimnasioId, dni, nombre, apellido, email, telefono, fechaNacimiento, direccion, notas])

        res.status(201).json(result.rows[0])
    } catch (error) {
        next(error)
    }
})

// PUT /api/socios/:id - Update socio
router.put('/:id', async (req, res, next) => {
    try {
        const { id } = req.params
        const { dni, nombre, apellido, email, telefono, fechaNacimiento, direccion, notas, activo } = req.body

        const result = await query(`
      UPDATE socios 
      SET dni = COALESCE($1, dni),
          nombre = COALESCE($2, nombre),
          apellido = COALESCE($3, apellido),
          email = COALESCE($4, email),
          telefono = COALESCE($5, telefono),
          fecha_nacimiento = COALESCE($6, fecha_nacimiento),
          direccion = COALESCE($7, direccion),
          notas = COALESCE($8, notas),
          activo = COALESCE($9, activo),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $10 AND gimnasio_id = $11
      RETURNING *
    `, [dni, nombre, apellido, email, telefono, fechaNacimiento, direccion, notas, activo, id, req.gimnasioId])

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Socio no encontrado' })
        }

        res.json(result.rows[0])
    } catch (error) {
        next(error)
    }
})

// DELETE /api/socios/:id - Delete socio
router.delete('/:id', async (req, res, next) => {
    try {
        const { id } = req.params

        const result = await query(
            'DELETE FROM socios WHERE id = $1 AND gimnasio_id = $2 RETURNING id',
            [id, req.gimnasioId]
        )

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Socio no encontrado' })
        }

        res.json({ message: 'Socio eliminado exitosamente' })
    } catch (error) {
        next(error)
    }
})

// GET /api/socios/:id/qr - Get QR code image for access
router.get('/:id/qr', async (req, res, next) => {
    try {
        const { id } = req.params
        const { format = 'json' } = req.query // json or image

        const result = await query(`
      SELECT s.id, s.dni, s.nombre, s.apellido, s.gimnasio_id,
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
    `, [id, req.gimnasioId])

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Socio no encontrado' })
        }

        const socio = result.rows[0]
        const membresiaActiva = socio.membresia_estado === 'activa' && new Date(socio.membresia_fin) >= new Date()

        // QR data - encoded JSON with socio info
        const qrPayload = {
            id: socio.id,
            gym: socio.gimnasio_id,
            ts: Date.now() // timestamp for validation
        }

        // Generate QR code as base64 data URL
        const qrDataUrl = await QRCode.toDataURL(JSON.stringify(qrPayload), {
            width: 300,
            margin: 2,
            color: {
                dark: '#1a1a2e',
                light: '#ffffff'
            }
        })

        // Response data
        const responseData = {
            socio: {
                id: socio.id,
                dni: socio.dni,
                nombre: `${socio.nombre} ${socio.apellido}`,
                plan: socio.plan_nombre,
                membresiaActiva,
                validHasta: socio.membresia_fin
            },
            qrCode: qrDataUrl,
            qrPayload: qrPayload
        }

        if (format === 'image') {
            // Return raw image
            const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, '')
            const imgBuffer = Buffer.from(base64Data, 'base64')
            res.set('Content-Type', 'image/png')
            return res.send(imgBuffer)
        }

        res.json(responseData)
    } catch (error) {
        next(error)
    }
})

export default router
