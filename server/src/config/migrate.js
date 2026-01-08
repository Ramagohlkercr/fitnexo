import 'dotenv/config'
import { query } from './database.js'

const migrate = async () => {
    console.log('🚀 Starting database migration...')

    try {
        // Enable UUID extension
        await query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`)
        console.log('✅ UUID extension enabled')

        // Create gimnasios table
        await query(`
      CREATE TABLE IF NOT EXISTS gimnasios (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        nombre VARCHAR(255) NOT NULL,
        direccion TEXT,
        telefono VARCHAR(50),
        email VARCHAR(255),
        logo_url TEXT,
        config JSONB DEFAULT '{}',
        activo BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
        console.log('✅ Table gimnasios created')

        // Create usuarios table (admins)
        await query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        gimnasio_id UUID REFERENCES gimnasios(id) ON DELETE CASCADE,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        nombre VARCHAR(255) NOT NULL,
        rol VARCHAR(50) DEFAULT 'admin',
        activo BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
        console.log('✅ Table usuarios created')

        // Create planes table
        await query(`
      CREATE TABLE IF NOT EXISTS planes (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        gimnasio_id UUID REFERENCES gimnasios(id) ON DELETE CASCADE,
        nombre VARCHAR(255) NOT NULL,
        descripcion TEXT,
        precio DECIMAL(12, 2) NOT NULL,
        duracion_dias INTEGER NOT NULL,
        activo BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
        console.log('✅ Table planes created')

        // Create socios table
        await query(`
      CREATE TABLE IF NOT EXISTS socios (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        gimnasio_id UUID REFERENCES gimnasios(id) ON DELETE CASCADE,
        dni VARCHAR(20) NOT NULL,
        nombre VARCHAR(255) NOT NULL,
        apellido VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        telefono VARCHAR(50),
        foto_url TEXT,
        fecha_nacimiento DATE,
        direccion TEXT,
        notas TEXT,
        activo BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(gimnasio_id, dni)
      )
    `)
        console.log('✅ Table socios created')

        // Create membresias table
        await query(`
      CREATE TABLE IF NOT EXISTS membresias (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        socio_id UUID REFERENCES socios(id) ON DELETE CASCADE,
        plan_id UUID REFERENCES planes(id) ON DELETE SET NULL,
        fecha_inicio DATE NOT NULL,
        fecha_fin DATE NOT NULL,
        estado VARCHAR(50) DEFAULT 'activa',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
        console.log('✅ Table membresias created')

        // Create pagos table
        await query(`
      CREATE TABLE IF NOT EXISTS pagos (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        socio_id UUID REFERENCES socios(id) ON DELETE CASCADE,
        membresia_id UUID REFERENCES membresias(id) ON DELETE SET NULL,
        monto DECIMAL(12, 2) NOT NULL,
        metodo VARCHAR(50) DEFAULT 'efectivo',
        mp_payment_id VARCHAR(255),
        mp_status VARCHAR(50),
        estado VARCHAR(50) DEFAULT 'completado',
        notas TEXT,
        fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
        console.log('✅ Table pagos created')

        // Create accesos table
        await query(`
      CREATE TABLE IF NOT EXISTS accesos (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        socio_id UUID REFERENCES socios(id) ON DELETE CASCADE,
        entrada TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        salida TIMESTAMP,
        metodo VARCHAR(50) DEFAULT 'qr',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
        console.log('✅ Table accesos created')

        // Create indexes for better performance
        await query(`CREATE INDEX IF NOT EXISTS idx_socios_gimnasio ON socios(gimnasio_id)`)
        await query(`CREATE INDEX IF NOT EXISTS idx_socios_dni ON socios(dni)`)
        await query(`CREATE INDEX IF NOT EXISTS idx_membresias_socio ON membresias(socio_id)`)
        await query(`CREATE INDEX IF NOT EXISTS idx_membresias_estado ON membresias(estado)`)
        await query(`CREATE INDEX IF NOT EXISTS idx_membresias_fecha_fin ON membresias(fecha_fin)`)
        await query(`CREATE INDEX IF NOT EXISTS idx_pagos_socio ON pagos(socio_id)`)
        await query(`CREATE INDEX IF NOT EXISTS idx_pagos_fecha ON pagos(fecha)`)
        await query(`CREATE INDEX IF NOT EXISTS idx_accesos_socio ON accesos(socio_id)`)
        await query(`CREATE INDEX IF NOT EXISTS idx_accesos_entrada ON accesos(entrada)`)
        console.log('✅ Indexes created')

        console.log('\n🎉 Migration completed successfully!')
        process.exit(0)
    } catch (error) {
        console.error('❌ Migration failed:', error.message)
        process.exit(1)
    }
}

migrate()
