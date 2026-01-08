import { NavLink, useLocation } from 'react-router-dom'
import {
    LayoutDashboard,
    Users,
    CreditCard,
    DoorOpen,
    Package,
    Settings,
    ChevronLeft,
    ChevronRight,
    LogOut
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import './Sidebar.css'

const menuItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/socios', label: 'Socios', icon: Users },
    { path: '/planes', label: 'Planes', icon: Package },
    { path: '/pagos', label: 'Pagos', icon: CreditCard },
    { path: '/accesos', label: 'Accesos', icon: DoorOpen },
]

const bottomMenuItems = [
    { path: '/configuracion', label: 'Configuración', icon: Settings },
]

const Sidebar = ({ collapsed, onToggle }) => {
    const location = useLocation()
    const logout = useAuthStore(state => state.logout)
    const gimnasio = useAuthStore(state => state.gimnasio)

    return (
        <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
            {/* Header */}
            <div className="sidebar-header">
                <div className="sidebar-logo">
                    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect width="40" height="40" rx="10" fill="url(#sidebar-logo-gradient)" />
                        <path d="M12 20L18 14L24 20L30 14" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M12 26L18 20L24 26L30 20" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        <defs>
                            <linearGradient id="sidebar-logo-gradient" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                                <stop stopColor="#818CF8" />
                                <stop offset="1" stopColor="#6366F1" />
                            </linearGradient>
                        </defs>
                    </svg>
                </div>
                {!collapsed && (
                    <div className="sidebar-brand">
                        <span className="sidebar-title">FitNexo</span>
                        <span className="sidebar-gym-name">{gimnasio?.nombre || 'Mi Gimnasio'}</span>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav className="sidebar-nav">
                <ul className="sidebar-menu">
                    {menuItems.map((item) => (
                        <li key={item.path}>
                            <NavLink
                                to={item.path}
                                className={({ isActive }) =>
                                    `sidebar-link ${isActive ? 'active' : ''}`
                                }
                                end={item.path === '/'}
                            >
                                <item.icon size={20} />
                                {!collapsed && <span>{item.label}</span>}
                            </NavLink>
                        </li>
                    ))}
                </ul>

                <div className="sidebar-divider" />

                <ul className="sidebar-menu">
                    {bottomMenuItems.map((item) => (
                        <li key={item.path}>
                            <NavLink
                                to={item.path}
                                className={({ isActive }) =>
                                    `sidebar-link ${isActive ? 'active' : ''}`
                                }
                            >
                                <item.icon size={20} />
                                {!collapsed && <span>{item.label}</span>}
                            </NavLink>
                        </li>
                    ))}
                    <li>
                        <button className="sidebar-link sidebar-logout" onClick={logout}>
                            <LogOut size={20} />
                            {!collapsed && <span>Cerrar Sesión</span>}
                        </button>
                    </li>
                </ul>
            </nav>

            {/* Toggle Button */}
            <button className="sidebar-toggle" onClick={onToggle}>
                {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
        </aside>
    )
}

export default Sidebar
