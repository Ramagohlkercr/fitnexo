import { Router } from 'express'
import { query } from '../config/database.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

router.use(authMiddleware)

// GET /api/dashboard - Get all dashboard metrics
router.get('/', async (req, res, next) => {
    try {
        const gimnasioId = req.gimnasioId

        // Socios activos (con membresía vigente)
        const sociosActivosResult = await query(`
      SELECT COUNT(DISTINCT s.id) as total
      FROM socios s
      JOIN membresias m ON m.socio_id = s.id
      WHERE s.gimnasio_id = $1 
        AND s.activo = true
        AND m.estado = 'activa' 
        AND m.fecha_fin >= CURRENT_DATE
    `, [gimnasioId])

        // Total socios (sin filtrar por membresía)
        const totalSociosResult = await query(`
      SELECT COUNT(*) as total
      FROM socios
      WHERE gimnasio_id = $1 AND activo = true
    `, [gimnasioId])

        // Ingresos del mes
        const ingresosMesResult = await query(`
      SELECT COALESCE(SUM(p.monto), 0) as total
      FROM pagos p
      JOIN socios s ON p.socio_id = s.id
      WHERE s.gimnasio_id = $1 
        AND p.estado = 'completado'
        AND p.fecha >= DATE_TRUNC('month', CURRENT_DATE)
    `, [gimnasioId])

        // Ingresos mes anterior (para comparación)
        const ingresosAnteriorResult = await query(`
      SELECT COALESCE(SUM(p.monto), 0) as total
      FROM pagos p
      JOIN socios s ON p.socio_id = s.id
      WHERE s.gimnasio_id = $1 
        AND p.estado = 'completado'
        AND p.fecha >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
        AND p.fecha < DATE_TRUNC('month', CURRENT_DATE)
    `, [gimnasioId])

        // Por vencer (próximos 7 días)
        const porVencerResult = await query(`
      SELECT COUNT(DISTINCT s.id) as total
      FROM socios s
      JOIN membresias m ON m.socio_id = s.id
      WHERE s.gimnasio_id = $1 
        AND m.estado = 'activa'
        AND m.fecha_fin BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
    `, [gimnasioId])

        // Vencidos (membresía expirada)
        const vencidosResult = await query(`
      SELECT COUNT(DISTINCT s.id) as total
      FROM socios s
      WHERE s.gimnasio_id = $1 
        AND s.activo = true
        AND NOT EXISTS (
          SELECT 1 FROM membresias m 
          WHERE m.socio_id = s.id 
          AND m.estado = 'activa' 
          AND m.fecha_fin >= CURRENT_DATE
        )
    `, [gimnasioId])

        // Accesos de hoy
        const accesosHoyResult = await query(`
      SELECT COUNT(*) as total
      FROM accesos a
      JOIN socios s ON a.socio_id = s.id
      WHERE s.gimnasio_id = $1 
        AND DATE(a.entrada) = CURRENT_DATE
    `, [gimnasioId])

        // Actividad reciente
        const actividadResult = await query(`
      (
        SELECT 
          'pago' as tipo,
          p.fecha as fecha,
          s.nombre || ' ' || s.apellido as nombre,
          'pagó su cuota' as accion,
          p.monto::text as extra
        FROM pagos p
        JOIN socios s ON p.socio_id = s.id
        WHERE s.gimnasio_id = $1 AND p.estado = 'completado'
        ORDER BY p.fecha DESC
        LIMIT 5
      )
      UNION ALL
      (
        SELECT 
          'acceso' as tipo,
          a.entrada as fecha,
          s.nombre || ' ' || s.apellido as nombre,
          'ingresó al gym' as accion,
          NULL as extra
        FROM accesos a
        JOIN socios s ON a.socio_id = s.id
        WHERE s.gimnasio_id = $1
        ORDER BY a.entrada DESC
        LIMIT 5
      )
      UNION ALL
      (
        SELECT 
          'nuevo' as tipo,
          s.created_at as fecha,
          s.nombre || ' ' || s.apellido as nombre,
          'se registró' as accion,
          NULL as extra
        FROM socios s
        WHERE s.gimnasio_id = $1
        ORDER BY s.created_at DESC
        LIMIT 3
      )
      ORDER BY fecha DESC
      LIMIT 10
    `, [gimnasioId])

        // Pagos pendientes (socios con membresía vencida)
        const pendientesResult = await query(`
      SELECT 
        s.id,
        s.nombre || ' ' || s.apellido as nombre,
        m.fecha_fin as vencimiento,
        CURRENT_DATE - m.fecha_fin as dias_vencido,
        p.nombre as plan_nombre,
        p.precio as monto
      FROM socios s
      JOIN membresias m ON m.socio_id = s.id
      JOIN planes p ON m.plan_id = p.id
      WHERE s.gimnasio_id = $1 
        AND m.estado = 'activa'
        AND m.fecha_fin < CURRENT_DATE + INTERVAL '7 days'
      ORDER BY m.fecha_fin ASC
      LIMIT 10
    `, [gimnasioId])

        // Calculate percentage changes
        const ingresosMes = parseFloat(ingresosMesResult.rows[0].total)
        const ingresosAnterior = parseFloat(ingresosAnteriorResult.rows[0].total)
        const cambioIngresos = ingresosAnterior > 0
            ? Math.round(((ingresosMes - ingresosAnterior) / ingresosAnterior) * 100)
            : 0

        res.json({
            stats: {
                sociosActivos: {
                    value: parseInt(sociosActivosResult.rows[0].total),
                    total: parseInt(totalSociosResult.rows[0].total),
                    change: '+12%' // TODO: Calculate real change
                },
                ingresosMes: {
                    value: ingresosMes,
                    change: `${cambioIngresos >= 0 ? '+' : ''}${cambioIngresos}%`
                },
                porVencer: {
                    value: parseInt(porVencerResult.rows[0].total)
                },
                vencidos: {
                    value: parseInt(vencidosResult.rows[0].total)
                },
                accesosHoy: {
                    value: parseInt(accesosHoyResult.rows[0].total)
                }
            },
            actividad: actividadResult.rows,
            pendientes: pendientesResult.rows
        })
    } catch (error) {
        next(error)
    }
})

export default router
