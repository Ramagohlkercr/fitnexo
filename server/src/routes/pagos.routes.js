import { Router } from 'express'
import { query } from '../config/database.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

router.use(authMiddleware)

// GET /api/pagos - List all payments
router.get('/', async (req, res, next) => {
    try {
        const { socioId, estado, fechaDesde, fechaHasta, page = 1, limit = 50 } = req.query
        const offset = (page - 1) * limit

        let whereClause = 'WHERE s.gimnasio_id = $1'
        const params = [req.gimnasioId]
        let paramCount = 1

        if (socioId) {
            paramCount++
            whereClause += ` AND p.socio_id = $${paramCount}`
            params.push(socioId)
        }

        if (estado) {
            paramCount++
            whereClause += ` AND p.estado = $${paramCount}`
            params.push(estado)
        }

        if (fechaDesde) {
            paramCount++
            whereClause += ` AND p.fecha >= $${paramCount}`
            params.push(fechaDesde)
        }

        if (fechaHasta) {
            paramCount++
            whereClause += ` AND p.fecha <= $${paramCount}`
            params.push(fechaHasta)
        }

        // Get total count
        const countResult = await query(
            `SELECT COUNT(*) FROM pagos p JOIN socios s ON p.socio_id = s.id ${whereClause}`,
            params
        )
        const total = parseInt(countResult.rows[0].count)

        // Get payments
        const result = await query(`
      SELECT p.*,
        s.nombre as socio_nombre,
        s.apellido as socio_apellido,
        s.dni as socio_dni,
        pl.nombre as plan_nombre
      FROM pagos p
      JOIN socios s ON p.socio_id = s.id
      LEFT JOIN membresias m ON p.membresia_id = m.id
      LEFT JOIN planes pl ON m.plan_id = pl.id
      ${whereClause}
      ORDER BY p.fecha DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `, [...params, limit, offset])

        res.json({
            pagos: result.rows,
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

// POST /api/pagos - Register payment
router.post('/', async (req, res, next) => {
    try {
        const { socioId, membresiaId, monto, metodo, notas, crearMembresia, planId } = req.body

        if (!socioId || !monto) {
            return res.status(400).json({ error: 'Socio y monto son requeridos' })
        }

        let newMembresiaId = membresiaId

        // If crearMembresia is true, create new membership
        if (crearMembresia && planId) {
            const planResult = await query(
                'SELECT duracion_dias FROM planes WHERE id = $1 AND gimnasio_id = $2',
                [planId, req.gimnasioId]
            )

            if (planResult.rows.length === 0) {
                return res.status(404).json({ error: 'Plan no encontrado' })
            }

            const duracion = planResult.rows[0].duracion_dias
            const inicio = new Date()
            const fin = new Date(inicio)
            fin.setDate(fin.getDate() + duracion)

            // Deactivate current active membership
            await query(
                `UPDATE membresias SET estado = 'reemplazada', updated_at = CURRENT_TIMESTAMP 
         WHERE socio_id = $1 AND estado = 'activa'`,
                [socioId]
            )

            // Create new membership
            const membresiaResult = await query(`
        INSERT INTO membresias (socio_id, plan_id, fecha_inicio, fecha_fin, estado)
        VALUES ($1, $2, $3, $4, 'activa')
        RETURNING id
      `, [socioId, planId, inicio.toISOString().split('T')[0], fin.toISOString().split('T')[0]])

            newMembresiaId = membresiaResult.rows[0].id
        }

        // Register payment
        const result = await query(`
      INSERT INTO pagos (socio_id, membresia_id, monto, metodo, estado, notas)
      VALUES ($1, $2, $3, $4, 'completado', $5)
      RETURNING *
    `, [socioId, newMembresiaId, monto, metodo || 'efectivo', notas])

        res.status(201).json(result.rows[0])
    } catch (error) {
        next(error)
    }
})

// GET /api/pagos/resumen - Get payment summary
router.get('/resumen', async (req, res, next) => {
    try {
        const { periodo = 'mes' } = req.query

        let dateFilter = ''
        if (periodo === 'hoy') {
            dateFilter = "AND DATE(p.fecha) = CURRENT_DATE"
        } else if (periodo === 'semana') {
            dateFilter = "AND p.fecha >= CURRENT_DATE - INTERVAL '7 days'"
        } else if (periodo === 'mes') {
            dateFilter = "AND p.fecha >= DATE_TRUNC('month', CURRENT_DATE)"
        } else if (periodo === 'año') {
            dateFilter = "AND p.fecha >= DATE_TRUNC('year', CURRENT_DATE)"
        }

        const result = await query(`
      SELECT 
        COALESCE(SUM(p.monto), 0) as total_ingresos,
        COUNT(*) as total_pagos,
        COALESCE(SUM(CASE WHEN p.metodo = 'efectivo' THEN p.monto ELSE 0 END), 0) as efectivo,
        COALESCE(SUM(CASE WHEN p.metodo = 'mercadopago' THEN p.monto ELSE 0 END), 0) as mercadopago,
        COALESCE(SUM(CASE WHEN p.metodo = 'transferencia' THEN p.monto ELSE 0 END), 0) as transferencia
      FROM pagos p
      JOIN socios s ON p.socio_id = s.id
      WHERE s.gimnasio_id = $1 AND p.estado = 'completado' ${dateFilter}
    `, [req.gimnasioId])

        res.json(result.rows[0])
    } catch (error) {
        next(error)
    }
})

// DELETE /api/pagos/:id - Cancel payment
router.delete('/:id', async (req, res, next) => {
    try {
        const { id } = req.params

        const result = await query(`
      UPDATE pagos p
      SET estado = 'cancelado'
      FROM socios s
      WHERE p.id = $1 AND p.socio_id = s.id AND s.gimnasio_id = $2
      RETURNING p.id
    `, [id, req.gimnasioId])

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Pago no encontrado' })
        }

        res.json({ message: 'Pago cancelado' })
    } catch (error) {
        next(error)
    }
})

// ==========================================
// MERCADO PAGO ENDPOINTS
// ==========================================

import {
    isMercadoPagoConfigured,
    generatePaymentLink,
    processWebhook
} from '../services/mercadopago.service.js'

// GET /api/pagos/mercadopago/status - Check MP configuration
router.get('/mercadopago/status', async (req, res) => {
    res.json({
        configured: isMercadoPagoConfigured(),
        publicKey: process.env.MP_PUBLIC_KEY || null
    })
})

// POST /api/pagos/mercadopago/crear-link - Generate payment link
router.post('/mercadopago/crear-link', async (req, res, next) => {
    try {
        const { socioId, planId } = req.body

        if (!socioId || !planId) {
            return res.status(400).json({ error: 'Socio y plan son requeridos' })
        }

        if (!isMercadoPagoConfigured()) {
            return res.status(400).json({
                error: 'Mercado Pago no está configurado. Agrega MP_ACCESS_TOKEN en las variables de entorno.'
            })
        }

        const paymentLink = await generatePaymentLink(socioId, planId, req.gimnasioId)

        res.json({
            success: true,
            preferenceId: paymentLink.id,
            checkoutUrl: paymentLink.init_point,
            sandboxUrl: paymentLink.sandbox_init_point
        })
    } catch (error) {
        next(error)
    }
})

// POST /api/pagos/webhook - Receive MP webhooks (no auth required)
router.post('/webhook', async (req, res) => {
    try {
        console.log('Webhook received:', req.body)

        const result = await processWebhook(req.body)

        res.status(200).json({ received: true, ...result })
    } catch (error) {
        console.error('Webhook error:', error)
        // Always return 200 to MP to avoid retries
        res.status(200).json({ received: true, error: error.message })
    }
})

// ==========================================
// FACTURACION / COMPROBANTES
// ==========================================

// GET /api/pagos/:id/comprobante - Get payment receipt
router.get('/:id/comprobante', async (req, res, next) => {
    try {
        const { id } = req.params

        const result = await query(`
      SELECT 
        p.*,
        s.nombre as socio_nombre,
        s.apellido as socio_apellido,
        s.dni as socio_dni,
        s.email as socio_email,
        s.direccion as socio_direccion,
        pl.nombre as plan_nombre,
        pl.descripcion as plan_descripcion,
        g.nombre as gimnasio_nombre,
        g.direccion as gimnasio_direccion,
        g.telefono as gimnasio_telefono,
        g.email as gimnasio_email
      FROM pagos p
      JOIN socios s ON p.socio_id = s.id
      JOIN gimnasios g ON s.gimnasio_id = g.id
      LEFT JOIN membresias m ON p.membresia_id = m.id
      LEFT JOIN planes pl ON m.plan_id = pl.id
      WHERE p.id = $1 AND s.gimnasio_id = $2
    `, [id, req.gimnasioId])

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Pago no encontrado' })
        }

        const pago = result.rows[0]

        // Generate receipt data
        const comprobante = {
            numero: `REC-${pago.id.slice(0, 8).toUpperCase()}`,
            fecha: pago.fecha,
            gimnasio: {
                nombre: pago.gimnasio_nombre,
                direccion: pago.gimnasio_direccion,
                telefono: pago.gimnasio_telefono,
                email: pago.gimnasio_email
            },
            cliente: {
                nombre: `${pago.socio_nombre} ${pago.socio_apellido}`,
                dni: pago.socio_dni,
                email: pago.socio_email,
                direccion: pago.socio_direccion
            },
            detalle: {
                concepto: pago.plan_nombre || 'Pago de cuota',
                descripcion: pago.plan_descripcion || 'Membresía de gimnasio',
                cantidad: 1,
                precioUnitario: parseFloat(pago.monto),
                total: parseFloat(pago.monto)
            },
            metodoPago: pago.metodo,
            estado: pago.estado,
            mpPaymentId: pago.mp_payment_id
        }

        res.json(comprobante)
    } catch (error) {
        next(error)
    }
})

// GET /api/pagos/reporte - Generate payment report
router.get('/reporte', async (req, res, next) => {
    try {
        const { fechaDesde, fechaHasta } = req.query

        const desde = fechaDesde || new Date(new Date().setDate(1)).toISOString().split('T')[0]
        const hasta = fechaHasta || new Date().toISOString().split('T')[0]

        // Summary by method
        const resumenMetodo = await query(`
      SELECT 
        metodo,
        COUNT(*) as cantidad,
        SUM(monto) as total
      FROM pagos p
      JOIN socios s ON p.socio_id = s.id
      WHERE s.gimnasio_id = $1 
        AND p.estado = 'completado'
        AND DATE(p.fecha) BETWEEN $2 AND $3
      GROUP BY metodo
      ORDER BY total DESC
    `, [req.gimnasioId, desde, hasta])

        // Summary by day
        const resumenDiario = await query(`
      SELECT 
        DATE(fecha) as dia,
        COUNT(*) as cantidad,
        SUM(monto) as total
      FROM pagos p
      JOIN socios s ON p.socio_id = s.id
      WHERE s.gimnasio_id = $1 
        AND p.estado = 'completado'
        AND DATE(p.fecha) BETWEEN $2 AND $3
      GROUP BY DATE(fecha)
      ORDER BY dia
    `, [req.gimnasioId, desde, hasta])

        // Top plans
        const topPlanes = await query(`
      SELECT 
        pl.nombre as plan,
        COUNT(*) as cantidad,
        SUM(p.monto) as total
      FROM pagos p
      JOIN socios s ON p.socio_id = s.id
      JOIN membresias m ON p.membresia_id = m.id
      JOIN planes pl ON m.plan_id = pl.id
      WHERE s.gimnasio_id = $1 
        AND p.estado = 'completado'
        AND DATE(p.fecha) BETWEEN $2 AND $3
      GROUP BY pl.nombre
      ORDER BY total DESC
      LIMIT 5
    `, [req.gimnasioId, desde, hasta])

        // Total
        const totalResult = await query(`
      SELECT 
        COUNT(*) as total_pagos,
        SUM(monto) as total_ingresos
      FROM pagos p
      JOIN socios s ON p.socio_id = s.id
      WHERE s.gimnasio_id = $1 
        AND p.estado = 'completado'
        AND DATE(p.fecha) BETWEEN $2 AND $3
    `, [req.gimnasioId, desde, hasta])

        res.json({
            periodo: { desde, hasta },
            resumen: totalResult.rows[0],
            porMetodo: resumenMetodo.rows,
            porDia: resumenDiario.rows,
            topPlanes: topPlanes.rows
        })
    } catch (error) {
        next(error)
    }
})

export default router
