import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { query } from '../config/database.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
    try {
        const { email, password } = req.body

        if (!email || !password) {
            return res.status(400).json({ error: 'Email y contraseña son requeridos' })
        }

        // Find user
        const result = await query(
            `SELECT u.*, g.nombre as gimnasio_nombre, g.logo_url as gimnasio_logo
       FROM usuarios u 
       LEFT JOIN gimnasios g ON u.gimnasio_id = g.id 
       WHERE u.email = $1 AND u.activo = true`,
            [email.toLowerCase()]
        )

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Credenciales inválidas' })
        }

        const user = result.rows[0]

        // Verify password
        const validPassword = await bcrypt.compare(password, user.password)
        if (!validPassword) {
            return res.status(401).json({ error: 'Credenciales inválidas' })
        }

        // Generate JWT
        const token = jwt.sign(
            { userId: user.id, email: user.email, rol: user.rol },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        )

        // Remove password from response
        delete user.password

        res.json({
            message: 'Login exitoso',
            token,
            user: {
                id: user.id,
                email: user.email,
                nombre: user.nombre,
                rol: user.rol
            },
            gimnasio: {
                id: user.gimnasio_id,
                nombre: user.gimnasio_nombre,
                logo: user.gimnasio_logo
            }
        })
    } catch (error) {
        next(error)
    }
})

// POST /api/auth/register (for new gym signup)
router.post('/register', async (req, res, next) => {
    try {
        const {
            gimnasioNombre,
            gimnasioEmail,
            gimnasioTelefono,
            adminNombre,
            adminEmail,
            adminPassword
        } = req.body

        // Validate required fields
        if (!gimnasioNombre || !adminEmail || !adminPassword) {
            return res.status(400).json({
                error: 'Nombre del gimnasio, email y contraseña son requeridos'
            })
        }

        // Check if email already exists
        const existingUser = await query(
            'SELECT id FROM usuarios WHERE email = $1',
            [adminEmail.toLowerCase()]
        )

        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'El email ya está registrado' })
        }

        // Create gimnasio
        const gimnasioResult = await query(
            `INSERT INTO gimnasios (nombre, email, telefono) 
       VALUES ($1, $2, $3) 
       RETURNING id, nombre`,
            [gimnasioNombre, gimnasioEmail, gimnasioTelefono]
        )

        const gimnasio = gimnasioResult.rows[0]

        // Hash password
        const hashedPassword = await bcrypt.hash(adminPassword, 10)

        // Create admin user
        const userResult = await query(
            `INSERT INTO usuarios (gimnasio_id, email, password, nombre, rol) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, email, nombre, rol`,
            [gimnasio.id, adminEmail.toLowerCase(), hashedPassword, adminNombre || 'Admin', 'admin']
        )

        const user = userResult.rows[0]

        // Generate JWT
        const token = jwt.sign(
            { userId: user.id, email: user.email, rol: user.rol },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        )

        res.status(201).json({
            message: 'Registro exitoso',
            token,
            user,
            gimnasio
        })
    } catch (error) {
        next(error)
    }
})

// GET /api/auth/me - Get current user
router.get('/me', authMiddleware, async (req, res, next) => {
    try {
        const result = await query(
            `SELECT u.id, u.email, u.nombre, u.rol, u.created_at,
              g.id as gimnasio_id, g.nombre as gimnasio_nombre, g.logo_url as gimnasio_logo
       FROM usuarios u 
       LEFT JOIN gimnasios g ON u.gimnasio_id = g.id 
       WHERE u.id = $1`,
            [req.user.id]
        )

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' })
        }

        const user = result.rows[0]

        res.json({
            user: {
                id: user.id,
                email: user.email,
                nombre: user.nombre,
                rol: user.rol,
                createdAt: user.created_at
            },
            gimnasio: {
                id: user.gimnasio_id,
                nombre: user.gimnasio_nombre,
                logo: user.gimnasio_logo
            }
        })
    } catch (error) {
        next(error)
    }
})

// PUT /api/auth/password - Change password
router.put('/password', authMiddleware, async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Contraseña actual y nueva son requeridas' })
        }

        // Get current password hash
        const result = await query(
            'SELECT password FROM usuarios WHERE id = $1',
            [req.user.id]
        )

        // Verify current password
        const validPassword = await bcrypt.compare(currentPassword, result.rows[0].password)
        if (!validPassword) {
            return res.status(401).json({ error: 'Contraseña actual incorrecta' })
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10)

        // Update password
        await query(
            'UPDATE usuarios SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [hashedPassword, req.user.id]
        )

        res.json({ message: 'Contraseña actualizada exitosamente' })
    } catch (error) {
        next(error)
    }
})

export default router
