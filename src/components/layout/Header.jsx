import { Search, Menu, User } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import NotificationBell from '../ui/NotificationBell'
import './Header.css'

const Header = ({ onToggleSidebar }) => {
    const user = useAuthStore(state => state.user)

    return (
        <header className="header">
            <div className="header-left">
                <button className="header-menu-btn" onClick={onToggleSidebar}>
                    <Menu size={20} />
                </button>

                <div className="header-search">
                    <Search size={18} className="header-search-icon" />
                    <input
                        type="text"
                        placeholder="Buscar socios, pagos..."
                        className="header-search-input"
                    />
                </div>
            </div>

            <div className="header-right">
                <NotificationBell />

                <div className="header-user">
                    <div className="header-avatar">
                        {user?.foto ? (
                            <img src={user.foto} alt={user.nombre} />
                        ) : (
                            <User size={20} />
                        )}
                    </div>
                    <div className="header-user-info">
                        <span className="header-user-name">{user?.nombre || 'Admin'}</span>
                        <span className="header-user-role">{user?.rol || 'Administrador'}</span>
                    </div>
                </div>
            </div>
        </header>
    )
}

export default Header
