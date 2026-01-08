import { Outlet } from 'react-router-dom'
import './AuthLayout.css'

const AuthLayout = () => {
    return (
        <div className="auth-layout">
            <div className="auth-background">
                <div className="auth-gradient" />
                <div className="auth-pattern" />
            </div>

            <div className="auth-content">
                <div className="auth-brand">
                    <div className="auth-logo">
                        <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect width="40" height="40" rx="10" fill="url(#logo-gradient)" />
                            <path d="M12 20L18 14L24 20L30 14" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M12 26L18 20L24 26L30 20" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                            <defs>
                                <linearGradient id="logo-gradient" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                                    <stop stopColor="#818CF8" />
                                    <stop offset="1" stopColor="#6366F1" />
                                </linearGradient>
                            </defs>
                        </svg>
                    </div>
                    <h1 className="auth-title">FitNexo</h1>
                    <p className="auth-tagline">Gestión inteligente para gimnasios</p>
                </div>

                <Outlet />
            </div>
        </div>
    )
}

export default AuthLayout
