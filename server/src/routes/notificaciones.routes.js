import { Router } from 'express'
import { query } from '../config/database.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

router.use(authMiddleware)

// GET /api/notificaciones - Get all notifications for current gym
router.get('/', async (req, res, next) => {
    try {
        // Get members with expiring memberships (next 7 days)
        const porVencer = await query(`
            SELECT 
                s.id, s.nombre, s.apellido, s.email, s.telefono,
                m.fecha_fin,
                p.nombre as plan_nombre,
                EXTRACT(DAY FROM m.fecha_fin - CURRENT_DATE) as dias_restantes
            FROM socios s
            JOIN LATERAL (
                SELECT * FROM membresias 
                WHERE socio_id = s.id AND estado = 'activa'
                ORDER BY fecha_fin DESC 
                LIMIT 1
            ) m ON true
            JOIN planes p ON m.plan_id = p.id
            WHERE s.gimnasio_id = $1 
              AND s.activo = true
              AND m.fecha_fin BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
            ORDER BY m.fecha_fin ASC
        `, [req.gimnasioId])

        // Get members with expired memberships (last 30 days)
        const vencidas = await query(`
            SELECT 
                s.id, s.nombre, s.apellido, s.email, s.telefono,
                m.fecha_fin,
                p.nombre as plan_nombre,
                EXTRACT(DAY FROM CURRENT_DATE - m.fecha_fin) as dias_vencido
            FROM socios s
            JOIN LATERAL (
                SELECT * FROM membresias 
                WHERE socio_id = s.id 
                ORDER BY fecha_fin DESC 
                LIMIT 1
            ) m ON true
            JOIN planes p ON m.plan_id = p.id
            WHERE s.gimnasio_id = $1 
              AND s.activo = true
              AND m.fecha_fin < CURRENT_DATE
              AND m.fecha_fin >= CURRENT_DATE - INTERVAL '30 days'
            ORDER BY m.fecha_fin DESC
        `, [req.gimnasioId])

        // Get recent payments pending
        const pagosPendientes = await query(`
            SELECT 
                pg.id, pg.monto, pg.fecha,
                s.id as socio_id, s.nombre, s.apellido
            FROM pagos pg
            JOIN socios s ON pg.socio_id = s.id
            WHERE s.gimnasio_id = $1 
              AND pg.estado = 'pendiente'
              AND pg.fecha >= CURRENT_DATE - INTERVAL '30 days'
            ORDER BY pg.fecha DESC
            LIMIT 10
        `, [req.gimnasioId])

        // Get new members this week
        const nuevosMiembros = await query(`
            SELECT id, nombre, apellido, created_at
            FROM socios
            WHERE gimnasio_id = $1 
              AND created_at >= CURRENT_DATE - INTERVAL '7 days'
            ORDER BY created_at DESC
            LIMIT 5
        `, [req.gimnasioId])

        res.json({
            porVencer: porVencer.rows.map(row => ({
                ...row,
                tipo: 'por_vencer',
                mensaje: `Membresía vence en ${Math.round(row.dias_restantes)} días`,
                prioridad: row.dias_restantes <= 2 ? 'alta' : 'media'
            })),
            vencidas: vencidas.rows.map(row => ({
                ...row,
                tipo: 'vencida',
                mensaje: `Membresía vencida hace ${Math.round(row.dias_vencido)} días`,
                prioridad: 'alta'
            })),
            pagosPendientes: pagosPendientes.rows.map(row => ({
                ...row,
                tipo: 'pago_pendiente',
                mensaje: `Pago pendiente de $${row.monto}`,
                prioridad: 'media'
            })),
            nuevosMiembros: nuevosMiembros.rows.map(row => ({
                ...row,
                tipo: 'nuevo_miembro',
                mensaje: `Nuevo miembro registrado`,
                prioridad: 'baja'
            })),
            resumen: {
                porVencer: porVencer.rows.length,
                vencidas: vencidas.rows.length,
                pagosPendientes: pagosPendientes.rows.length,
                nuevosMiembros: nuevosMiembros.rows.length,
                total: porVencer.rows.length + vencidas.rows.length + pagosPendientes.rows.length
            }
        })
    } catch (error) {
        next(error)
    }
})

// GET /api/notificaciones/resumen - Get quick summary for sidebar badge
router.get('/resumen', async (req, res, next) => {
    try {
        const result = await query(`
            SELECT 
                (SELECT COUNT(*) FROM socios s
                 JOIN LATERAL (
                    SELECT * FROM membresias WHERE socio_id = s.id AND estado = 'activa'
                    ORDER BY fecha_fin DESC LIMIT 1
                 ) m ON true
                 WHERE s.gimnasio_id = $1 AND s.activo = true
                 AND m.fecha_fin BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
                ) as por_vencer,
                (SELECT COUNT(*) FROM socios s
                 JOIN LATERAL (
                    SELECT * FROM membresias WHERE socio_id = s.id
                    ORDER BY fecha_fin DESC LIMIT 1
                 ) m ON true
                 WHERE s.gimnasio_id = $1 AND s.activo = true
                 AND m.fecha_fin < CURRENT_DATE
                 AND m.fecha_fin >= CURRENT_DATE - INTERVAL '30 days'
                ) as vencidas,
                (SELECT COUNT(*) FROM pagos pg
                 JOIN socios s ON pg.socio_id = s.id
                 WHERE s.gimnasio_id = $1 AND pg.estado = 'pendiente'
                ) as pagos_pendientes
        `, [req.gimnasioId])

        const data = result.rows[0]
        const total = parseInt(data.por_vencer) + parseInt(data.vencidas)

        res.json({
            porVencer: parseInt(data.por_vencer) || 0,
            vencidas: parseInt(data.vencidas) || 0,
            pagosPendientes: parseInt(data.pagos_pendientes) || 0,
            total,
            hayAlertas: total > 0
        })
    } catch (error) {
        next(error)
    }
})

export default router
