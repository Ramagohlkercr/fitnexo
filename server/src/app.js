import 'dotenv/config'
import express from 'express'
import cors from 'cors'

// Routes
import authRoutes from './routes/auth.routes.js'
import gimnasioRoutes from './routes/gimnasio.routes.js'
import sociosRoutes from './routes/socios.routes.js'
import planesRoutes from './routes/planes.routes.js'
import membresiasRoutes from './routes/membresias.routes.js'
import pagosRoutes from './routes/pagos.routes.js'
import accesosRoutes from './routes/accesos.routes.js'
import dashboardRoutes from './routes/dashboard.routes.js'

// Middleware
import { errorHandler } from './middleware/errorHandler.js'

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'FitNexo API is running',
        timestamp: new Date().toISOString()
    })
})

// API Routes
app.use('/api/auth', authRoutes)
app.use('/api/gimnasio', gimnasioRoutes)
app.use('/api/socios', sociosRoutes)
app.use('/api/planes', planesRoutes)
app.use('/api/membresias', membresiasRoutes)
app.use('/api/pagos', pagosRoutes)
app.use('/api/accesos', accesosRoutes)
app.use('/api/dashboard', dashboardRoutes)

// Error handling
app.use(errorHandler)

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint no encontrado' })
})

// Start server
app.listen(PORT, () => {
    console.log(`
  ╔═══════════════════════════════════════════════════════════╗
  ║                                                           ║
  ║   🏋️  FitNexo API Server                                  ║
  ║                                                           ║
  ║   Running on: http://localhost:${PORT}                      ║
  ║   Environment: ${process.env.NODE_ENV || 'development'}                          ║
  ║                                                           ║
  ╚═══════════════════════════════════════════════════════════╝
  `)
})

export default app
