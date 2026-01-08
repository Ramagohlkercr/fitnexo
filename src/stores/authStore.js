import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
    persist(
        (set, get) => ({
            // State
            user: null,
            token: null,
            gimnasio: null,
            isAuthenticated: false,

            // Actions
            login: (userData, token, gimnasioData) => {
                set({
                    user: userData,
                    token: token,
                    gimnasio: gimnasioData,
                    isAuthenticated: true
                })
            },

            logout: () => {
                set({
                    user: null,
                    token: null,
                    gimnasio: null,
                    isAuthenticated: false
                })
            },

            updateGimnasio: (gimnasioData) => {
                set({ gimnasio: gimnasioData })
            },

            // Getters
            getToken: () => get().token,
            getUser: () => get().user,
            getGimnasio: () => get().gimnasio,
        }),
        {
            name: 'fitnexo-auth',
            partialize: (state) => ({
                user: state.user,
                token: state.token,
                gimnasio: state.gimnasio,
                isAuthenticated: state.isAuthenticated
            })
        }
    )
)
