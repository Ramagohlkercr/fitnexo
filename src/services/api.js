// API base URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

// Helper to get auth token
const getToken = () => {
    const authData = localStorage.getItem('fitnexo-auth')
    if (authData) {
        try {
            const parsed = JSON.parse(authData)
            return parsed.state?.token
        } catch {
            return null
        }
    }
    return null
}

// Base fetch with auth
const fetchWithAuth = async (endpoint, options = {}) => {
    const token = getToken()

    const config = {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
            ...options.headers,
        },
    }

    const response = await fetch(`${API_URL}${endpoint}`, config)

    // Handle 401 - Unauthorized
    if (response.status === 401) {
        localStorage.removeItem('fitnexo-auth')
        window.location.href = '/login'
        throw new Error('Sesión expirada')
    }

    const data = await response.json()

    if (!response.ok) {
        throw new Error(data.error || 'Error en la solicitud')
    }

    return data
}

// Auth API
export const authApi = {
    login: async (email, password) => {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error)
        return data
    },

    register: async (data) => {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        })
        const result = await response.json()
        if (!response.ok) throw new Error(result.error)
        return result
    },

    me: () => fetchWithAuth('/auth/me'),

    changePassword: (currentPassword, newPassword) =>
        fetchWithAuth('/auth/password', {
            method: 'PUT',
            body: JSON.stringify({ currentPassword, newPassword }),
        }),
}

// Dashboard API
export const dashboardApi = {
    getStats: () => fetchWithAuth('/dashboard'),
}

// Socios API
export const sociosApi = {
    getAll: (params) => {
        const query = new URLSearchParams(params).toString()
        return fetchWithAuth(`/socios${query ? `?${query}` : ''}`)
    },

    getById: (id) => fetchWithAuth(`/socios/${id}`),

    create: (data) => fetchWithAuth('/socios', {
        method: 'POST',
        body: JSON.stringify(data),
    }),

    update: (id, data) => fetchWithAuth(`/socios/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    }),

    delete: (id) => fetchWithAuth(`/socios/${id}`, {
        method: 'DELETE',
    }),

    getQR: (id) => fetchWithAuth(`/socios/${id}/qr`),
}

// Planes API
export const planesApi = {
    getAll: (params) => {
        const query = new URLSearchParams(params).toString()
        return fetchWithAuth(`/planes${query ? `?${query}` : ''}`)
    },

    getById: (id) => fetchWithAuth(`/planes/${id}`),

    create: (data) => fetchWithAuth('/planes', {
        method: 'POST',
        body: JSON.stringify(data),
    }),

    update: (id, data) => fetchWithAuth(`/planes/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    }),

    delete: (id) => fetchWithAuth(`/planes/${id}`, {
        method: 'DELETE',
    }),
}

// Membresias API
export const membresiasApi = {
    getAll: (params) => {
        const query = new URLSearchParams(params).toString()
        return fetchWithAuth(`/membresias${query ? `?${query}` : ''}`)
    },

    create: (data) => fetchWithAuth('/membresias', {
        method: 'POST',
        body: JSON.stringify(data),
    }),

    update: (id, data) => fetchWithAuth(`/membresias/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    }),

    renovar: (id, planId) => fetchWithAuth(`/membresias/${id}/renovar`, {
        method: 'POST',
        body: JSON.stringify({ planId }),
    }),
}

// Pagos API
export const pagosApi = {
    getAll: (params) => {
        const query = new URLSearchParams(params).toString()
        return fetchWithAuth(`/pagos${query ? `?${query}` : ''}`)
    },

    create: (data) => fetchWithAuth('/pagos', {
        method: 'POST',
        body: JSON.stringify(data),
    }),

    getResumen: (periodo) => fetchWithAuth(`/pagos/resumen?periodo=${periodo}`),

    cancel: (id) => fetchWithAuth(`/pagos/${id}`, {
        method: 'DELETE',
    }),

    // Mercado Pago
    getMPStatus: () => fetchWithAuth('/pagos/mercadopago/status'),

    crearLinkPago: (socioId, planId) => fetchWithAuth('/pagos/mercadopago/crear-link', {
        method: 'POST',
        body: JSON.stringify({ socioId, planId }),
    }),

    // Comprobantes y Reportes
    getComprobante: (id) => fetchWithAuth(`/pagos/${id}/comprobante`),

    getReporte: (fechaDesde, fechaHasta) => {
        const params = new URLSearchParams()
        if (fechaDesde) params.append('fechaDesde', fechaDesde)
        if (fechaHasta) params.append('fechaHasta', fechaHasta)
        return fetchWithAuth(`/pagos/reporte?${params.toString()}`)
    },
}

// Accesos API
export const accesosApi = {
    getAll: (params) => {
        const query = new URLSearchParams(params).toString()
        return fetchWithAuth(`/accesos${query ? `?${query}` : ''}`)
    },

    registrarEntrada: (socioId, metodo = 'manual') =>
        fetchWithAuth('/accesos/entrada', {
            method: 'POST',
            body: JSON.stringify({ socioId, metodo }),
        }),

    registrarSalida: (id) => fetchWithAuth(`/accesos/${id}/salida`, {
        method: 'POST',
    }),

    validarQR: (qrData) => fetchWithAuth('/accesos/validar-qr', {
        method: 'POST',
        body: JSON.stringify({ qrData }),
    }),

    getEstadisticas: (periodo) =>
        fetchWithAuth(`/accesos/estadisticas?periodo=${periodo}`),
}

// Gimnasio API
export const gimnasioApi = {
    get: () => fetchWithAuth('/gimnasio'),

    update: (data) => fetchWithAuth('/gimnasio', {
        method: 'PUT',
        body: JSON.stringify(data),
    }),

    getConfig: () => fetchWithAuth('/gimnasio/config'),

    updateConfig: (config) => fetchWithAuth('/gimnasio/config', {
        method: 'PUT',
        body: JSON.stringify({ config }),
    }),

    getStats: () => fetchWithAuth('/gimnasio/stats'),

    // Mercado Pago OAuth
    getMPStatus: () => fetchWithAuth('/gimnasio/mercadopago/status'),

    getMPConnectUrl: () => fetchWithAuth('/gimnasio/mercadopago/connect'),

    mpCallback: (code, state) => fetchWithAuth('/gimnasio/mercadopago/callback', {
        method: 'POST',
        body: JSON.stringify({ code, state }),
    }),

    disconnectMP: () => fetchWithAuth('/gimnasio/mercadopago/disconnect', {
        method: 'DELETE',
    }),
}

// Reportes API
export const reportesApi = {
    getIngresos: (periodo = 'mes') => fetchWithAuth(`/reportes/ingresos?periodo=${periodo}`),

    getAccesos: (periodo = 'semana') => fetchWithAuth(`/reportes/accesos?periodo=${periodo}`),

    getMembresias: () => fetchWithAuth('/reportes/membresias'),

    getResumen: () => fetchWithAuth('/reportes/resumen'),
}
