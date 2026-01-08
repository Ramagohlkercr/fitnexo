import { Router } from 'express'
import { query } from '../config/database.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

router.use(authMiddleware)

// GET /api/gimnasio - Get current gimnasio info
router.get('/', async (req, res, next) => {
    try {
        const result = await query(
            'SELECT * FROM gimnasios WHERE id = $1',
            [req.gimnasioId]
        )

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Gimnasio no encontrado' })
        }

        res.json(result.rows[0])
    } catch (error) {
        next(error)
    }
})

// PUT /api/gimnasio - Update gimnasio info
router.put('/', async (req, res, next) => {
    try {
        const { nombre, direccion, telefono, email, logoUrl, config } = req.body

        const result = await query(`
      UPDATE gimnasios 
      SET nombre = COALESCE($1, nombre),
          direccion = COALESCE($2, direccion),
          telefono = COALESCE($3, telefono),
          email = COALESCE($4, email),
          logo_url = COALESCE($5, logo_url),
          config = COALESCE($6, config),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `, [nombre, direccion, telefono, email, logoUrl, config, req.gimnasioId])

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Gimnasio no encontrado' })
        }

        res.json(result.rows[0])
    } catch (error) {
        next(error)
    }
})

// GET /api/gimnasio/config - Get configuration
router.get('/config', async (req, res, next) => {
    try {
        const result = await query(
            'SELECT config FROM gimnasios WHERE id = $1',
            [req.gimnasioId]
        )

        res.json(result.rows[0]?.config || {})
    } catch (error) {
        next(error)
    }
})

// PUT /api/gimnasio/config - Update configuration
router.put('/config', async (req, res, next) => {
    try {
        const { config } = req.body

        const result = await query(`
      UPDATE gimnasios 
      SET config = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING config
    `, [config, req.gimnasioId])

        res.json(result.rows[0]?.config)
    } catch (error) {
        next(error)
    }
})

// GET /api/gimnasio/stats - Get general statistics
router.get('/stats', async (req, res, next) => {
    try {
        const gimnasioId = req.gimnasioId

        const stats = await query(`
      SELECT 
        (SELECT COUNT(*) FROM socios WHERE gimnasio_id = $1 AND activo = true) as total_socios,
        (SELECT COUNT(*) FROM planes WHERE gimnasio_id = $1 AND activo = true) as total_planes,
        (SELECT COALESCE(SUM(monto), 0) FROM pagos p JOIN socios s ON p.socio_id = s.id WHERE s.gimnasio_id = $1 AND p.estado = 'completado') as total_ingresos,
        (SELECT COUNT(*) FROM accesos a JOIN socios s ON a.socio_id = s.id WHERE s.gimnasio_id = $1) as total_accesos
    `, [gimnasioId])

        res.json(stats.rows[0])
    } catch (error) {
        next(error)
    }
})

// ==========================================
// MERCADO PAGO OAUTH
// ==========================================

import {
    isOAuthConfigured,
    getAuthorizationUrl,
    exchangeCodeForTokens,
    getMPUserInfo
} from '../services/mercadopago-oauth.service.js'

// GET /api/gimnasio/mercadopago/status - Check MP connection status
router.get('/mercadopago/status', async (req, res, next) => {
    try {
        const result = await query(
            'SELECT mp_access_token, mp_user_id, mp_public_key, mp_connected_at FROM gimnasios WHERE id = $1',
            [req.gimnasioId]
        )

        const gimnasio = result.rows[0]
        const isConnected = !!(gimnasio?.mp_access_token)

        res.json({
            oauthConfigured: isOAuthConfigured(),
            connected: isConnected,
            userId: gimnasio?.mp_user_id || null,
            publicKey: gimnasio?.mp_public_key || null,
            connectedAt: gimnasio?.mp_connected_at || null
        })
    } catch (error) {
        next(error)
    }
})

// GET /api/gimnasio/mercadopago/connect - Get OAuth authorization URL
router.get('/mercadopago/connect', async (req, res, next) => {
    try {
        if (!isOAuthConfigured()) {
            return res.status(400).json({
                error: 'OAuth de Mercado Pago no está configurado en el servidor'
            })
        }

        const authUrl = getAuthorizationUrl(req.gimnasioId)
        res.json({ authUrl })
    } catch (error) {
        next(error)
    }
})

// POST /api/gimnasio/mercadopago/callback - Handle OAuth callback
router.post('/mercadopago/callback', async (req, res, next) => {
    try {
        const { code, state } = req.body

        if (!code) {
            return res.status(400).json({ error: 'Código de autorización no proporcionado' })
        }

        // Intercambiar código por tokens
        const tokens = await exchangeCodeForTokens(code)

        // Obtener info del usuario de MP
        let userInfo = null
        try {
            userInfo = await getMPUserInfo(tokens.accessToken)
        } catch (e) {
            console.log('Could not get MP user info:', e.message)
        }

        // Guardar tokens en la base de datos
        await query(`
            UPDATE gimnasios 
            SET mp_access_token = $1,
                mp_refresh_token = $2,
                mp_user_id = $3,
                mp_public_key = $4,
                mp_connected_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $5
        `, [
            tokens.accessToken,
            tokens.refreshToken,
            tokens.userId?.toString() || userInfo?.id?.toString(),
            tokens.publicKey,
            req.gimnasioId
        ])

        res.json({
            success: true,
            message: 'Mercado Pago conectado exitosamente',
            userId: tokens.userId || userInfo?.id,
            email: userInfo?.email
        })
    } catch (error) {
        console.error('OAuth callback error:', error)
        next(error)
    }
})

// DELETE /api/gimnasio/mercadopago/disconnect - Disconnect MP account
router.delete('/mercadopago/disconnect', async (req, res, next) => {
    try {
        await query(`
            UPDATE gimnasios 
            SET mp_access_token = NULL,
                mp_refresh_token = NULL,
                mp_user_id = NULL,
                mp_public_key = NULL,
                mp_connected_at = NULL,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
        `, [req.gimnasioId])

        res.json({ success: true, message: 'Mercado Pago desconectado' })
    } catch (error) {
        next(error)
    }
})

export default router
