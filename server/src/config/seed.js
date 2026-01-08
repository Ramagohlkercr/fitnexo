import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { query } from './database.js'

const seed = async () => {
    console.log('🌱 Starting database seeding...')

    try {
        // Create demo gimnasio
        const gimnasioResult = await query(`
      INSERT INTO gimnasios (nombre, direccion, telefono, email)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT DO NOTHING
      RETURNING id
    `, ['FitNexo Demo Gym', 'Av. Corrientes 1234, CABA', '+54 11 4567-8900', 'demo@fitnexo.com'])

        const gimnasioId = gimnasioResult.rows[0]?.id

        if (!gimnasioId) {
            console.log('ℹ️ Gimnasio already exists, skipping seed')
            process.exit(0)
        }

        console.log('✅ Gimnasio created:', gimnasioId)

        // Create admin user
        const hashedPassword = await bcrypt.hash('admin123', 10)
        await query(`
      INSERT INTO usuarios (gimnasio_id, email, password, nombre, rol)
      VALUES ($1, $2, $3, $4, $5)
    `, [gimnasioId, 'admin@fitnexo.com', hashedPassword, 'Administrador', 'admin'])
        console.log('✅ Admin user created (admin@fitnexo.com / admin123)')

        // Create plans
        const planes = [
            { nombre: 'Plan Mensual', descripcion: 'Acceso ilimitado por 30 días', precio: 15000, duracion: 30 },
            { nombre: 'Plan Trimestral', descripcion: 'Acceso ilimitado por 90 días', precio: 40000, duracion: 90 },
            { nombre: 'Plan Semestral', descripcion: 'Acceso ilimitado por 180 días', precio: 70000, duracion: 180 },
            { nombre: 'Plan Anual', descripcion: 'Acceso ilimitado por 365 días', precio: 120000, duracion: 365 },
            { nombre: 'Plan Estudiante', descripcion: 'Descuento especial para estudiantes', precio: 12000, duracion: 30 },
        ]

        const planIds = []
        for (const plan of planes) {
            const result = await query(`
        INSERT INTO planes (gimnasio_id, nombre, descripcion, precio, duracion_dias)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, [gimnasioId, plan.nombre, plan.descripcion, plan.precio, plan.duracion])
            planIds.push(result.rows[0].id)
        }
        console.log('✅ Plans created:', planIds.length)

        // Create sample socios
        const socios = [
            { dni: '32456789', nombre: 'Juan', apellido: 'Pérez', email: 'juan@email.com', telefono: '+54 11 1234-5678' },
            { dni: '28765432', nombre: 'María', apellido: 'García', email: 'maria@email.com', telefono: '+54 11 2345-6789' },
            { dni: '35678901', nombre: 'Carlos', apellido: 'López', email: 'carlos@email.com', telefono: '+54 11 3456-7890' },
            { dni: '30123456', nombre: 'Ana', apellido: 'Martínez', email: 'ana@email.com', telefono: '+54 11 4567-8901' },
            { dni: '33987654', nombre: 'Pedro', apellido: 'Sánchez', email: 'pedro@email.com', telefono: '+54 11 5678-9012' },
            { dni: '29876543', nombre: 'Laura', apellido: 'Torres', email: 'laura@email.com', telefono: '+54 11 6789-0123' },
            { dni: '34567890', nombre: 'Roberto', apellido: 'Díaz', email: 'roberto@email.com', telefono: '+54 11 7890-1234' },
            { dni: '31234567', nombre: 'Sofía', apellido: 'Ruiz', email: 'sofia@email.com', telefono: '+54 11 8901-2345' },
        ]

        const socioIds = []
        for (const socio of socios) {
            const result = await query(`
        INSERT INTO socios (gimnasio_id, dni, nombre, apellido, email, telefono)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `, [gimnasioId, socio.dni, socio.nombre, socio.apellido, socio.email, socio.telefono])
            socioIds.push(result.rows[0].id)
        }
        console.log('✅ Socios created:', socioIds.length)

        // Create memberships with different states
        const today = new Date()
        const memberships = [
            { socioIdx: 0, planIdx: 0, daysOffset: -15, estado: 'activa' },  // Active, expires in 15 days
            { socioIdx: 1, planIdx: 1, daysOffset: -30, estado: 'activa' },  // Active, expires in 60 days
            { socioIdx: 2, planIdx: 0, daysOffset: -35, estado: 'vencida' }, // Expired 5 days ago
            { socioIdx: 3, planIdx: 3, daysOffset: -100, estado: 'activa' }, // Active, long term
            { socioIdx: 4, planIdx: 0, daysOffset: -25, estado: 'activa' },  // Active, expires in 5 days (por vencer)
            { socioIdx: 5, planIdx: 4, daysOffset: -27, estado: 'activa' },  // Active, expires in 3 days
            { socioIdx: 6, planIdx: 0, daysOffset: -32, estado: 'vencida' }, // Expired 2 days ago
            { socioIdx: 7, planIdx: 0, daysOffset: -37, estado: 'vencida' }, // Expired 7 days ago
        ]

        for (const m of memberships) {
            const fechaInicio = new Date(today)
            fechaInicio.setDate(fechaInicio.getDate() + m.daysOffset)

            const plan = planes[m.planIdx]
            const fechaFin = new Date(fechaInicio)
            fechaFin.setDate(fechaFin.getDate() + plan.duracion)

            await query(`
        INSERT INTO membresias (socio_id, plan_id, fecha_inicio, fecha_fin, estado)
        VALUES ($1, $2, $3, $4, $5)
      `, [socioIds[m.socioIdx], planIds[m.planIdx], fechaInicio.toISOString().split('T')[0], fechaFin.toISOString().split('T')[0], m.estado])
        }
        console.log('✅ Memberships created')

        // Create sample payments
        for (let i = 0; i < 5; i++) {
            const fecha = new Date(today)
            fecha.setDate(fecha.getDate() - Math.floor(Math.random() * 30))

            await query(`
        INSERT INTO pagos (socio_id, monto, metodo, estado, fecha)
        VALUES ($1, $2, $3, $4, $5)
      `, [socioIds[i], planes[i % planes.length].precio, ['efectivo', 'mercadopago', 'transferencia'][i % 3], 'completado', fecha.toISOString()])
        }
        console.log('✅ Payments created')

        // Create sample accesos (today)
        for (let i = 0; i < 6; i++) {
            const entrada = new Date(today)
            entrada.setHours(7 + i, Math.floor(Math.random() * 60), 0)

            await query(`
        INSERT INTO accesos (socio_id, entrada, metodo)
        VALUES ($1, $2, $3)
      `, [socioIds[i], entrada.toISOString(), 'qr'])
        }
        console.log('✅ Access records created')

        console.log('\n🎉 Seeding completed successfully!')
        console.log('\n📝 Demo credentials:')
        console.log('   Email: admin@fitnexo.com')
        console.log('   Password: admin123')

        process.exit(0)
    } catch (error) {
        console.error('❌ Seeding failed:', error.message)
        process.exit(1)
    }
}

seed()
