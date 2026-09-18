import React from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Camera, Archive, Images, Repeat2,
  FileText, Settings2, Shield, LogOut, Layers, Database, Brain
} from 'lucide-react'
import useAuthStore from '../store/authStore'

const navItems = [
  { to: '/dashboard',     icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/inspect',       icon: Camera,          label: 'Live Inspection' },
  { to: '/batches',       icon: Archive,         label: 'Batch History' },
  { to: '/intelligence',  icon: Brain,           label: 'Intelligence' },
  { to: '/evidence',      icon: Images,          label: 'Evidence' },
  { to: '/dispute',       icon: Repeat2,         label: 'Dispute Replay' },
  { to: '/reports',       icon: FileText,        label: 'Reports' },
  { to: '/standards',     icon: Shield,          label: 'Standards' },
  { to: '/dataset',       icon: Database,        label: 'Dataset Manager' },
  { to: '/settings',      icon: Settings2,       label: 'Settings' },
]

export default function Layout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <aside className="w-60 bg-white border-r border-gray-100 flex flex-col flex-shrink-0">
        {/* Logo */}
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-gray-900 text-sm leading-none">ONIONLENS 360</div>
              <div className="text-xs text-gray-400 mt-0.5">Quality Intelligence</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `nav-link ${isActive ? 'active' : ''}`
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="p-3 border-t border-gray-100">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-blue-700 text-xs font-bold">
                {user?.username?.[0]?.toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">{user?.username || 'User'}</div>
              <div className="text-xs text-gray-400 capitalize">{user?.role || 'inspector'}</div>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
