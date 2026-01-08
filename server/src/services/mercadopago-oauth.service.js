// Mercado Pago OAuth Service
// Permite a los dueños de gimnasios conectar su propia cuenta de MP

const MP_AUTH_URL = 'https://auth.mercadopago.com.ar'
const MP_API_URL = 'https://api.mercadopago.com'

const MP_CLIENT_ID = process.env.MP_CLIENT_ID
const MP_CLIENT_SECRET = process.env.MP_CLIENT_SECRET
const MP_REDIRECT_URI = process.env.MP_REDIRECT_URI

// Verificar si OAuth está configurado
export const isOAuthConfigured = () => {
    return MP_CLIENT_ID && MP_CLIENT_SECRET && MP_REDIRECT_URI
}

// Generar URL de autorización
export const getAuthorizationUrl = (gimnasioId) => {
    if (!isOAuthConfigured()) {
        throw new Error('OAuth de Mercado Pago no está configurado')
    }

    const params = new URLSearchParams({
        client_id: MP_CLIENT_ID,
        response_type: 'code',
        platform_id: 'mp',
        redirect_uri: MP_REDIRECT_URI,
        state: gimnasioId // Usamos el gimnasioId como state para identificar después
    })

    return `${MP_AUTH_URL}/authorization?${params.toString()}`
}

// Intercambiar código de autorización por tokens
export const exchangeCodeForTokens = async (code) => {
    if (!isOAuthConfigured()) {
        throw new Error('OAuth de Mercado Pago no está configurado')
    }

    const response = await fetch(`${MP_API_URL}/oauth/token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
        },
        body: new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: MP_CLIENT_ID,
            client_secret: MP_CLIENT_SECRET,
            code: code,
            redirect_uri: MP_REDIRECT_URI
        })
    })

    const data = await response.json()

    if (!response.ok) {
        console.error('OAuth Token Error:', data)
        throw new Error(data.message || data.error || 'Error al obtener token de Mercado Pago')
    }

    return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
        userId: data.user_id,
        publicKey: data.public_key,
        liveMode: data.live_mode
    }
}

// Refrescar token expirado
export const refreshAccessToken = async (refreshToken) => {
    if (!isOAuthConfigured()) {
        throw new Error('OAuth de Mercado Pago no está configurado')
    }

    const response = await fetch(`${MP_API_URL}/oauth/token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
        },
        body: new URLSearchParams({
            grant_type: 'refresh_token',
            client_id: MP_CLIENT_ID,
            client_secret: MP_CLIENT_SECRET,
            refresh_token: refreshToken
        })
    })

    const data = await response.json()

    if (!response.ok) {
        console.error('OAuth Refresh Error:', data)
        throw new Error(data.message || 'Error al refrescar token')
    }

    return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in
    }
}

// Obtener información del usuario de MP
export const getMPUserInfo = async (accessToken) => {
    const response = await fetch(`${MP_API_URL}/users/me`, {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    })

    if (!response.ok) {
        throw new Error('Error al obtener información del usuario de MP')
    }

    return await response.json()
}
