import { Router } from 'express'
import { query } from '../config/database.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

router.use(authMiddleware)

// GET /api/membresias - List all memberships
router.get('/', async (req, res, next) => {
    try {
        const { socioId, estado, porVencer } = req.query

        let whereClause = 'WHERE s.gimnasio_id = $1'
        const params = [req.gimnasioId]
        let paramCount = 1

        if (socioId) {
            paramCount++
            whereClause += ` AND m.socio_id = $${paramCount}`
            params.push(socioId)
        }

        if (estado) {
            paramCount++
            whereClause += ` AND m.estado = $${paramCount}`
            params.push(estado)
        }

        if (porVencer === 'true') {
            whereClause += ` AND m.estado = 'activa' AND m.fecha_fin BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'`
        }

        const result = await query(`
      SELECT m.*,
        s.nombre as socio_nombre,
        s.apellido as socio_apellido,
        s.dni as socio_dni,
        s.telefono as socio_telefono,
        p.nombre as plan_nombre,
        p.precio as plan_precio,
        m.fecha_fin - CURRENT_DATE as dias_restantes
      FROM membresias m
      JOIN socios s ON m.socio_id = s.id
      LEFT JOIN planes p ON m.plan_id = p.id
      ${whereClause}
      ORDER BY m.fecha_fin ASC
    `, params)

        res.json(result.rows)
    } catch (error) {
        next(error)
    }
})

// POST /api/membresias - Create membership (assign plan to socio)
router.post('/', async (req, res, next) => {
    try {
        const { socioId, planId, fechaInicio } = req.body

        if (!socioId || !planId) {
            return res.status(400).json({ error: 'Socio y plan son requeridos' })
        }

        // Get plan duration
        const planResult = await query(
            'SELECT duracion_dias FROM planes WHERE id = $1 AND gimnasio_id = $2',
            [planId, req.gimnasioId]
        )

        if (planResult.rows.length === 0) {
            return res.status(404).json({ error: 'Plan no encontrado' })
        }

        const duracion = planResult.rows[0].duracion_dias
        const inicio = fechaInicio ? new Date(fechaInicio) : new Date()
        const fin = new Date(inicio)
        fin.setDate(fin.getDate() + duracion)

        // Deactivate current active membership
        await query(
            `UPDATE membresias SET estado = 'reemplazada', updated_at = CURRENT_TIMESTAMP 
       WHERE socio_id = $1 AND estado = 'activa'`,
            [socioId]
        )

        // Create new membership
        const result = await query(`
      INSERT INTO membresias (socio_id, plan_id, fecha_inicio, fecha_fin, estado)
      VALUES ($1, $2, $3, $4, 'activa')
      RETURNING *
    `, [socioId, planId, inicio.toISOString().split('T')[0], fin.toISOString().split('T')[0]])

        res.status(201).json(result.rows[0])
    } catch (error) {
        next(error)
    }
})

// PUT /api/membresias/:id - Update membership
router.put('/:id', async (req, res, next) => {
    try {
        const { id } = req.params
        const { fechaFin, estado } = req.body

        const result = await query(`
      UPDATE membresias 
      SET fecha_fin = COALESCE($1, fecha_fin),
          estado = COALESCE($2, estado),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `, [fechaFin, estado, id])

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Membresía no encontrada' })
        }

        res.json(result.rows[0])
    } catch (error) {
        next(error)
    }
})

// POST /api/membresias/:id/renovar - Renew membership
router.post('/:id/renovar', async (req, res, next) => {
    try {
        const { id } = req.params
        const { planId } = req.body

        // Get current membership
        const currentResult = await query(
            'SELECT * FROM membresias WHERE id = $1',
            [id]
        )

        if (currentResult.rows.length === 0) {
            return res.status(404).json({ error: 'Membresía no encontrada' })
        }

        const current = currentResult.rows[0]
        const newPlanId = planId || current.plan_id

        // Get plan duration
        const planResult = await query(
            'SELECT duracion_dias FROM planes WHERE id = $1',
            [newPlanId]
        )

        const duracion = planResult.rows[0].duracion_dias

        // Start from current end date or today, whichever is later
        const startDate = new Date(current.fecha_fin) > new Date()
            ? new Date(current.fecha_fin)
            : new Date()

        const endDate = new Date(startDate)
        endDate.setDate(endDate.getDate() + duracion)

        // Mark old membership as renewed
        await query(
            `UPDATE membresias SET estado = 'renovada', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
            [id]
        )

        // Create new membership
        const result = await query(`
      INSERT INTO membresias (socio_id, plan_id, fecha_inicio, fecha_fin, estado)
      VALUES ($1, $2, $3, $4, 'activa')
      RETURNING *
    `, [current.socio_id, newPlanId, startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]])

        res.status(201).json(result.rows[0])
    } catch (error) {
        next(error)
    }
})

export default router
