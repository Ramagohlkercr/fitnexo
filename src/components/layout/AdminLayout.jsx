import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import './AdminLayout.css'

const AdminLayout = () => {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

    const toggleSidebar = () => {
        setSidebarCollapsed(!sidebarCollapsed)
    }

    return (
        <div className={`admin-layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
            <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
            <div className="admin-main">
                <Header onToggleSidebar={toggleSidebar} />
                <main className="admin-content">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}

export default AdminLayout
