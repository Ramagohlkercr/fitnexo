import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

export const useSocioStore = create(
    persist(
        (set, get) => ({
            token: null,
            socio: null,
            isAuthenticated: false,

            login: async (email, password) => {
                const response = await fetch(`${API_URL}/socio-auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                })

                const data = await response.json()

                if (!response.ok) {
                    throw new Error(data.error || 'Error en el login')
                }

                set({
                    token: data.token,
                    socio: data.socio,
                    isAuthenticated: true
                })

                return data
            },

            logout: () => {
                set({
                    token: null,
                    socio: null,
                    isAuthenticated: false
                })
            },

            fetchProfile: async () => {
                const token = get().token
                if (!token) return null

                const response = await fetch(`${API_URL}/socio-auth/me`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })

                if (!response.ok) {
                    if (response.status === 401) {
                        get().logout()
                    }
                    return null
                }

                const socio = await response.json()
                set({ socio })
                return socio
            },

            fetchQR: async () => {
                const token = get().token
                if (!token) return null

                const response = await fetch(`${API_URL}/socio-auth/qr`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })

                if (!response.ok) return null
                return response.json()
            },

            fetchAccesos: async () => {
                const token = get().token
                if (!token) return []

                const response = await fetch(`${API_URL}/socio-auth/accesos`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })

                if (!response.ok) return []
                return response.json()
            },

            fetchPagos: async () => {
                const token = get().token
                if (!token) return []

                const response = await fetch(`${API_URL}/socio-auth/pagos`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })

                if (!response.ok) return []
                return response.json()
            },

            changePassword: async (currentPassword, newPassword) => {
                const token = get().token
                if (!token) throw new Error('No autenticado')

                const response = await fetch(`${API_URL}/socio-auth/password`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ currentPassword, newPassword })
                })

                const data = await response.json()
                if (!response.ok) {
                    throw new Error(data.error || 'Error al cambiar contraseña')
                }

                return data
            }
        }),
        {
            name: 'fitnexo-socio-storage',
            partialize: (state) => ({
                token: state.token,
                socio: state.socio,
                isAuthenticated: state.isAuthenticated
            })
        }
    )
)
