import { Router } from 'express'
import { query } from '../config/database.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

router.use(authMiddleware)

// GET /api/reportes/ingresos - Get income data by period
router.get('/ingresos', async (req, res, next) => {
    try {
        const { periodo = 'mes' } = req.query

        let dateFilter = ''
        let groupBy = ''
        let orderBy = ''

        if (periodo === 'semana') {
            dateFilter = "AND p.fecha >= CURRENT_DATE - INTERVAL '7 days'"
            groupBy = 'DATE(p.fecha)'
            orderBy = 'fecha'
        } else if (periodo === 'mes') {
            dateFilter = "AND p.fecha >= CURRENT_DATE - INTERVAL '30 days'"
            groupBy = 'DATE(p.fecha)'
            orderBy = 'fecha'
        } else if (periodo === 'anual') {
            dateFilter = "AND p.fecha >= CURRENT_DATE - INTERVAL '12 months'"
            groupBy = "TO_CHAR(p.fecha, 'YYYY-MM')"
            orderBy = 'mes'
        }

        const result = await query(`
            SELECT 
                ${periodo === 'anual' ? "TO_CHAR(p.fecha, 'YYYY-MM') as mes," : 'DATE(p.fecha) as fecha,'}
                SUM(p.monto) as total,
                COUNT(*) as cantidad
            FROM pagos p
            JOIN socios s ON p.socio_id = s.id
            WHERE s.gimnasio_id = $1 
              AND p.estado = 'completado'
              ${dateFilter}
            GROUP BY ${groupBy}
            ORDER BY ${orderBy}
        `, [req.gimnasioId])

        // Calculate totals
        const totalResult = await query(`
            SELECT 
                SUM(p.monto) as total,
                COUNT(*) as cantidad
            FROM pagos p
            JOIN socios s ON p.socio_id = s.id
            WHERE s.gimnasio_id = $1 
              AND p.estado = 'completado'
              ${dateFilter}
        `, [req.gimnasioId])

        res.json({
            datos: result.rows,
            resumen: {
                total: parseFloat(totalResult.rows[0]?.total) || 0,
                cantidad: parseInt(totalResult.rows[0]?.cantidad) || 0
            }
        })
    } catch (error) {
        next(error)
    }
})

// GET /api/reportes/accesos - Get access statistics
router.get('/accesos', async (req, res, next) => {
    try {
        const { periodo = 'semana' } = req.query

        // Access by day of week
        const byDayOfWeek = await query(`
            SELECT 
                EXTRACT(DOW FROM a.entrada) as dia_semana,
                COUNT(*) as cantidad
            FROM accesos a
            JOIN socios s ON a.socio_id = s.id
            WHERE s.gimnasio_id = $1
              AND a.entrada >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY EXTRACT(DOW FROM a.entrada)
            ORDER BY dia_semana
        `, [req.gimnasioId])

        // Access by hour (today)
        const byHour = await query(`
            SELECT 
                EXTRACT(HOUR FROM a.entrada) as hora,
                COUNT(*) as cantidad
            FROM accesos a
            JOIN socios s ON a.socio_id = s.id
            WHERE s.gimnasio_id = $1
              AND DATE(a.entrada) >= CURRENT_DATE - INTERVAL '7 days'
            GROUP BY EXTRACT(HOUR FROM a.entrada)
            ORDER BY hora
        `, [req.gimnasioId])

        // Access by day (last 7 days)
        const byDay = await query(`
            SELECT 
                DATE(a.entrada) as fecha,
                COUNT(*) as cantidad
            FROM accesos a
            JOIN socios s ON a.socio_id = s.id
            WHERE s.gimnasio_id = $1
              AND a.entrada >= CURRENT_DATE - INTERVAL '7 days'
            GROUP BY DATE(a.entrada)
            ORDER BY fecha
        `, [req.gimnasioId])

        // Peak hours
        const peakHour = byHour.rows.reduce((max, curr) =>
            (parseFloat(curr.cantidad) > parseFloat(max.cantidad)) ? curr : max,
            { hora: 0, cantidad: 0 }
        )

        // Day names in Spanish
        const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
        const byDayOfWeekFormatted = byDayOfWeek.rows.map(row => ({
            dia: diasSemana[parseInt(row.dia_semana)],
            cantidad: parseInt(row.cantidad)
        }))

        res.json({
            porDiaSemana: byDayOfWeekFormatted,
            porHora: byHour.rows.map(row => ({
                hora: `${String(row.hora).padStart(2, '0')}:00`,
                cantidad: parseInt(row.cantidad)
            })),
            porDia: byDay.rows.map(row => ({
                fecha: row.fecha,
                cantidad: parseInt(row.cantidad)
            })),
            horaPico: {
                hora: `${String(peakHour.hora).padStart(2, '0')}:00`,
                cantidad: parseInt(peakHour.cantidad)
            }
        })
    } catch (error) {
        next(error)
    }
})

// GET /api/reportes/membresias - Get membership statistics
router.get('/membresias', async (req, res, next) => {
    try {
        // By plan
        const byPlan = await query(`
            SELECT 
                p.nombre as plan,
                COUNT(*) as cantidad,
                SUM(CASE WHEN m.estado = 'activa' AND m.fecha_fin >= CURRENT_DATE THEN 1 ELSE 0 END) as activas
            FROM membresias m
            JOIN planes p ON m.plan_id = p.id
            JOIN socios s ON m.socio_id = s.id
            WHERE s.gimnasio_id = $1
            GROUP BY p.nombre
            ORDER BY cantidad DESC
        `, [req.gimnasioId])

        // Membership status summary
        const statusSummary = await query(`
            SELECT 
                CASE 
                    WHEN m.fecha_fin < CURRENT_DATE THEN 'vencidas'
                    WHEN m.fecha_fin <= CURRENT_DATE + INTERVAL '7 days' THEN 'por_vencer'
                    ELSE 'activas'
                END as estado,
                COUNT(*) as cantidad
            FROM membresias m
            JOIN socios s ON m.socio_id = s.id
            WHERE s.gimnasio_id = $1
              AND m.estado = 'activa'
            GROUP BY 
                CASE 
                    WHEN m.fecha_fin < CURRENT_DATE THEN 'vencidas'
                    WHEN m.fecha_fin <= CURRENT_DATE + INTERVAL '7 days' THEN 'por_vencer'
                    ELSE 'activas'
                END
        `, [req.gimnasioId])

        // New memberships by month
        const newByMonth = await query(`
            SELECT 
                TO_CHAR(m.created_at, 'YYYY-MM') as mes,
                COUNT(*) as cantidad
            FROM membresias m
            JOIN socios s ON m.socio_id = s.id
            WHERE s.gimnasio_id = $1
              AND m.created_at >= CURRENT_DATE - INTERVAL '6 months'
            GROUP BY TO_CHAR(m.created_at, 'YYYY-MM')
            ORDER BY mes
        `, [req.gimnasioId])

        res.json({
            porPlan: byPlan.rows,
            porEstado: statusSummary.rows,
            nuevasPorMes: newByMonth.rows
        })
    } catch (error) {
        next(error)
    }
})

// GET /api/reportes/resumen - Get comprehensive summary
router.get('/resumen', async (req, res, next) => {
    try {
        // Total members
        const membersResult = await query(`
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN EXISTS (
                    SELECT 1 FROM membresias m 
                    WHERE m.socio_id = s.id 
                    AND m.estado = 'activa' 
                    AND m.fecha_fin >= CURRENT_DATE
                ) THEN 1 END) as activos
            FROM socios s
            WHERE s.gimnasio_id = $1 AND s.activo = true
        `, [req.gimnasioId])

        // Income this month vs last month
        const incomeResult = await query(`
            SELECT 
                SUM(CASE WHEN DATE_TRUNC('month', p.fecha) = DATE_TRUNC('month', CURRENT_DATE) THEN p.monto ELSE 0 END) as este_mes,
                SUM(CASE WHEN DATE_TRUNC('month', p.fecha) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') THEN p.monto ELSE 0 END) as mes_anterior
            FROM pagos p
            JOIN socios s ON p.socio_id = s.id
            WHERE s.gimnasio_id = $1 AND p.estado = 'completado'
        `, [req.gimnasioId])

        const esteMes = parseFloat(incomeResult.rows[0]?.este_mes) || 0
        const mesAnterior = parseFloat(incomeResult.rows[0]?.mes_anterior) || 0
        const cambio = mesAnterior > 0 ? ((esteMes - mesAnterior) / mesAnterior * 100).toFixed(1) : 0

        // Accesses today
        const accessResult = await query(`
            SELECT COUNT(*) as hoy
            FROM accesos a
            JOIN socios s ON a.socio_id = s.id
            WHERE s.gimnasio_id = $1 AND DATE(a.entrada) = CURRENT_DATE
        `, [req.gimnasioId])

        res.json({
            socios: {
                total: parseInt(membersResult.rows[0]?.total) || 0,
                activos: parseInt(membersResult.rows[0]?.activos) || 0
            },
            ingresos: {
                esteMes,
                mesAnterior,
                cambio: `${cambio >= 0 ? '+' : ''}${cambio}%`
            },
            accesos: {
                hoy: parseInt(accessResult.rows[0]?.hoy) || 0
            }
        })
    } catch (error) {
        next(error)
    }
})

export default router
