export const errorHandler = (err, req, res, next) => {
    console.error('Error:', err)

    // PostgreSQL errors
    if (err.code === '23505') {
        return res.status(400).json({
            error: 'Ya existe un registro con esos datos',
            detail: err.detail
        })
    }

    if (err.code === '23503') {
        return res.status(400).json({
            error: 'Referencia inválida',
            detail: err.detail
        })
    }

    // Validation errors
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            error: err.message
        })
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({ error: 'Token inválido' })
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expirado' })
    }

    // Default error
    res.status(err.status || 500).json({
        error: err.message || 'Error interno del servidor',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    })
}
