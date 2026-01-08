import jwt from 'jsonwebtoken'
import { query } from '../config/database.js'

export const authMiddleware = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Token no proporcionado' })
        }

        const token = authHeader.split(' ')[1]

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET)

        // Get user from database
        const result = await query(
            'SELECT u.*, g.nombre as gimnasio_nombre FROM usuarios u LEFT JOIN gimnasios g ON u.gimnasio_id = g.id WHERE u.id = $1 AND u.activo = true',
            [decoded.userId]
        )

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Usuario no encontrado' })
        }

        // Attach user to request
        req.user = result.rows[0]
        req.gimnasioId = result.rows[0].gimnasio_id

        next()
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Token inválido' })
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expirado' })
        }
        console.error('Auth middleware error:', error)
        return res.status(500).json({ error: 'Error de autenticación' })
    }
}

// Optional auth - doesn't fail if no token
export const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1]
            const decoded = jwt.verify(token, process.env.JWT_SECRET)

            const result = await query(
                'SELECT * FROM usuarios WHERE id = $1 AND activo = true',
                [decoded.userId]
            )

            if (result.rows.length > 0) {
                req.user = result.rows[0]
                req.gimnasioId = result.rows[0].gimnasio_id
            }
        }

        next()
    } catch (error) {
        // Continue without auth
        next()
    }
}

// Role-based access control
export const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'No autenticado' })
        }

        if (!roles.includes(req.user.rol)) {
            return res.status(403).json({ error: 'No tienes permisos para esta acción' })
        }

        next()
    }
}
