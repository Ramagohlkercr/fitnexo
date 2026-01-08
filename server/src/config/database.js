import pg from 'pg'
const { Pool } = pg

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'fitnexo',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'argons123',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
})

// Test connection
pool.on('connect', () => {
    console.log('📦 Connected to PostgreSQL database')
})

pool.on('error', (err) => {
    console.error('❌ Unexpected error on idle client', err)
    process.exit(-1)
})

// Helper function for queries
export const query = async (text, params) => {
    const start = Date.now()
    try {
        const result = await pool.query(text, params)
        const duration = Date.now() - start
        if (process.env.NODE_ENV === 'development') {
            console.log(`📝 Query executed in ${duration}ms`)
        }
        return result
    } catch (error) {
        console.error('❌ Query error:', error.message)
        throw error
    }
}

// Get a client from the pool for transactions
export const getClient = async () => {
    const client = await pool.connect()
    return client
}

export default pool
