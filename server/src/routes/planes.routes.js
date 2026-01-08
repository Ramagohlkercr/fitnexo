import { Router } from 'express'
import { query } from '../config/database.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

router.use(authMiddleware)

// GET /api/planes - List all planes
router.get('/', async (req, res, next) => {
    try {
        const { activo } = req.query

        let whereClause = 'WHERE gimnasio_id = $1'
        const params = [req.gimnasioId]

        if (activo !== undefined) {
            whereClause += ' AND activo = $2'
            params.push(activo === 'true')
        }

        const result = await query(`
      SELECT p.*,
        (SELECT COUNT(*) FROM membresias m WHERE m.plan_id = p.id AND m.estado = 'activa') as socios_activos
      FROM planes p
      ${whereClause}
      ORDER BY p.precio ASC
    `, params)

        res.json(result.rows)
    } catch (error) {
        next(error)
    }
})

// GET /api/planes/:id - Get single plan
router.get('/:id', async (req, res, next) => {
    try {
        const { id } = req.params

        const result = await query(`
      SELECT p.*,
        (SELECT COUNT(*) FROM membresias m WHERE m.plan_id = p.id AND m.estado = 'activa') as socios_activos
      FROM planes p
      WHERE p.id = $1 AND p.gimnasio_id = $2
    `, [id, req.gimnasioId])

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Plan no encontrado' })
        }

        res.json(result.rows[0])
    } catch (error) {
        next(error)
    }
})

// POST /api/planes - Create plan
router.post('/', async (req, res, next) => {
    try {
        const { nombre, descripcion, precio, duracionDias } = req.body

        if (!nombre || !precio || !duracionDias) {
            return res.status(400).json({ error: 'Nombre, precio y duración son requeridos' })
        }

        const result = await query(`
      INSERT INTO planes (gimnasio_id, nombre, descripcion, precio, duracion_dias)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [req.gimnasioId, nombre, descripcion, precio, duracionDias])

        res.status(201).json(result.rows[0])
    } catch (error) {
        next(error)
    }
})

// PUT /api/planes/:id - Update plan
router.put('/:id', async (req, res, next) => {
    try {
        const { id } = req.params
        const { nombre, descripcion, precio, duracionDias, activo } = req.body

        const result = await query(`
      UPDATE planes 
      SET nombre = COALESCE($1, nombre),
          descripcion = COALESCE($2, descripcion),
          precio = COALESCE($3, precio),
          duracion_dias = COALESCE($4, duracion_dias),
          activo = COALESCE($5, activo),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $6 AND gimnasio_id = $7
      RETURNING *
    `, [nombre, descripcion, precio, duracionDias, activo, id, req.gimnasioId])

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Plan no encontrado' })
        }

        res.json(result.rows[0])
    } catch (error) {
        next(error)
    }
})

// DELETE /api/planes/:id - Delete plan
router.delete('/:id', async (req, res, next) => {
    try {
        const { id } = req.params

        // Check if plan has active memberships
        const checkResult = await query(
            `SELECT COUNT(*) FROM membresias WHERE plan_id = $1 AND estado = 'activa'`,
            [id]
        )

        if (parseInt(checkResult.rows[0].count) > 0) {
            return res.status(400).json({
                error: 'No se puede eliminar el plan porque tiene membresías activas'
            })
        }

        const result = await query(
            'DELETE FROM planes WHERE id = $1 AND gimnasio_id = $2 RETURNING id',
            [id, req.gimnasioId]
        )

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Plan no encontrado' })
        }

        res.json({ message: 'Plan eliminado exitosamente' })
    } catch (error) {
        next(error)
    }
})

export default router
