// Mercado Pago Service
// Documentación: https://www.mercadopago.com.ar/developers/es/docs

import { query } from '../config/database.js'

// Configuración de Mercado Pago
const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN
const MP_PUBLIC_KEY = process.env.MP_PUBLIC_KEY
const MP_API_URL = 'https://api.mercadopago.com'

// Verificar si MP está configurado
export const isMercadoPagoConfigured = () => {
    return MP_ACCESS_TOKEN && MP_ACCESS_TOKEN.length > 10
}

// Crear preferencia de pago (para checkout)
export const createPaymentPreference = async (paymentData) => {
    const { socioId, planId, gimnasioId, monto, descripcion, payerEmail } = paymentData

    if (!isMercadoPagoConfigured()) {
        throw new Error('Mercado Pago no está configurado')
    }

    const frontendUrl = process.env.FRONTEND_URL
    const backendUrl = process.env.BACKEND_URL

    const preference = {
        items: [
            {
                id: planId || 'plan-001',
                title: descripcion || 'Membresía de Gimnasio',
                description: `Pago de membresía - FitNexo`,
                quantity: 1,
                currency_id: 'ARS',
                unit_price: parseFloat(monto)
            }
        ],
        payer: {
            email: payerEmail
        },
        external_reference: JSON.stringify({
            socioId,
            planId,
            gimnasioId,
            tipo: 'membresia'
        }),
        statement_descriptor: 'FITNEXO'
    }

    // Solo agregar back_urls y auto_return si hay URLs de producción configuradas
    if (frontendUrl && !frontendUrl.includes('localhost')) {
        preference.back_urls = {
            success: `${frontendUrl}/pagos/success`,
            failure: `${frontendUrl}/pagos/failure`,
            pending: `${frontendUrl}/pagos/pending`
        }
        preference.auto_return = 'approved'
    }

    // Solo agregar notification_url si hay URL de producción
    if (backendUrl && !backendUrl.includes('localhost')) {
        preference.notification_url = `${backendUrl}/api/pagos/webhook`
    }

    try {
        console.log('Creating MP preference with data:', JSON.stringify(preference, null, 2))

        const response = await fetch(`${MP_API_URL}/checkout/preferences`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(preference)
        })

        const responseData = await response.json()

        if (!response.ok) {
            console.error('MP API Error Response:', JSON.stringify(responseData, null, 2))
            throw new Error(responseData.message || responseData.error || 'Error al crear preferencia en Mercado Pago')
        }

        console.log('MP Preference created successfully:', responseData.id)
        return {
            id: responseData.id,
            init_point: responseData.init_point, // URL de checkout
            sandbox_init_point: responseData.sandbox_init_point // URL de prueba
        }
    } catch (error) {
        console.error('Error creating MP preference:', error)
        throw error
    }
}

// Obtener información de un pago
export const getPayment = async (paymentId) => {
    if (!isMercadoPagoConfigured()) {
        throw new Error('Mercado Pago no está configurado')
    }

    try {
        const response = await fetch(`${MP_API_URL}/v1/payments/${paymentId}`, {
            headers: {
                'Authorization': `Bearer ${MP_ACCESS_TOKEN}`
            }
        })

        if (!response.ok) {
            throw new Error('Error al obtener información del pago')
        }

        return await response.json()
    } catch (error) {
        console.error('Error getting MP payment:', error)
        throw error
    }
}

// Procesar notificación webhook de MP
export const processWebhook = async (data) => {
    const { type, data: webhookData } = data

    if (type !== 'payment') {
        console.log('Webhook type not payment:', type)
        return { processed: false }
    }

    const paymentId = webhookData?.id
    if (!paymentId) {
        return { processed: false }
    }

    try {
        // Obtener datos del pago
        const payment = await getPayment(paymentId)

        console.log('Payment received:', {
            id: payment.id,
            status: payment.status,
            amount: payment.transaction_amount,
            external_reference: payment.external_reference
        })

        // Solo procesar pagos aprobados
        if (payment.status !== 'approved') {
            return { processed: false, status: payment.status }
        }

        // Parsear referencia externa
        let externalRef
        try {
            externalRef = JSON.parse(payment.external_reference)
        } catch {
            externalRef = { socioId: null }
        }

        const { socioId, planId } = externalRef

        if (!socioId) {
            console.log('No socioId in external reference')
            return { processed: false }
        }

        // Verificar si el pago ya fue procesado
        const existingPayment = await query(
            'SELECT id FROM pagos WHERE mp_payment_id = $1',
            [payment.id.toString()]
        )

        if (existingPayment.rows.length > 0) {
            console.log('Payment already processed:', payment.id)
            return { processed: true, duplicate: true }
        }

        // Obtener plan para crear membresía
        let membresiaId = null
        if (planId) {
            const planResult = await query('SELECT duracion_dias FROM planes WHERE id = $1', [planId])

            if (planResult.rows.length > 0) {
                const duracion = planResult.rows[0].duracion_dias
                const inicio = new Date()
                const fin = new Date(inicio)
                fin.setDate(fin.getDate() + duracion)

                // Desactivar membresía actual
                await query(
                    `UPDATE membresias SET estado = 'reemplazada', updated_at = CURRENT_TIMESTAMP 
           WHERE socio_id = $1 AND estado = 'activa'`,
                    [socioId]
                )

                // Crear nueva membresía
                const membresiaResult = await query(`
          INSERT INTO membresias (socio_id, plan_id, fecha_inicio, fecha_fin, estado)
          VALUES ($1, $2, $3, $4, 'activa')
          RETURNING id
        `, [socioId, planId, inicio.toISOString().split('T')[0], fin.toISOString().split('T')[0]])

                membresiaId = membresiaResult.rows[0].id
            }
        }

        // Registrar el pago
        await query(`
      INSERT INTO pagos (socio_id, membresia_id, monto, metodo, mp_payment_id, mp_status, estado, notas)
      VALUES ($1, $2, $3, 'mercadopago', $4, $5, 'completado', $6)
    `, [
            socioId,
            membresiaId,
            payment.transaction_amount,
            payment.id.toString(),
            payment.status,
            `Pago automático via Mercado Pago`
        ])

        console.log('Payment processed successfully:', payment.id)
        return { processed: true, paymentId: payment.id }
    } catch (error) {
        console.error('Error processing webhook:', error)
        throw error
    }
}

// Generar link de pago para un socio
export const generatePaymentLink = async (socioId, planId, gimnasioId) => {
    // Obtener datos del socio y plan
    const socioResult = await query(
        'SELECT nombre, apellido, email FROM socios WHERE id = $1',
        [socioId]
    )

    if (socioResult.rows.length === 0) {
        throw new Error('Socio no encontrado')
    }

    const planResult = await query(
        'SELECT nombre, precio FROM planes WHERE id = $1',
        [planId]
    )

    if (planResult.rows.length === 0) {
        throw new Error('Plan no encontrado')
    }

    const socio = socioResult.rows[0]
    const plan = planResult.rows[0]

    return createPaymentPreference({
        socioId,
        planId,
        gimnasioId,
        monto: plan.precio,
        descripcion: `${plan.nombre} - ${socio.nombre} ${socio.apellido}`,
        payerEmail: socio.email || 'cliente@email.com'
    })
}
