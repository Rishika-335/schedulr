import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import {
  Calendar, Clock, Users, Settings, Menu, X,
  ChevronRight, ExternalLink, Zap
} from 'lucide-react'
import clsx from 'clsx'

const NAV_ITEMS = [
  { to: '/dashboard/event-types', icon: Zap,      label: 'Event Types' },
  { to: '/dashboard/availability', icon: Clock,    label: 'Availability' },
  { to: '/dashboard/meetings',     icon: Calendar, label: 'Meetings' },
]

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#f8faff] flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-100',
          'flex flex-col transition-transform duration-300 ease-in-out',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0069ff] flex items-center justify-center shadow-sm">
              <Calendar size={16} className="text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900 tracking-tight">Schedulr</span>
          </div>
          <button
            className="lg:hidden p-1 rounded text-gray-400 hover:text-gray-600"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        {/* User pill */}
        <div className="mx-3 mt-4 mb-2 px-3 py-3 rounded-xl bg-gray-50 border border-gray-100">
          <div className="flex items-center gap-3">
            <img
              src="https://api.dicebear.com/7.x/avataaars/svg?seed=Alex"
              alt="Avatar"
              className="w-9 h-9 rounded-full bg-blue-100"
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">Alex Johnson</p>
              <p className="text-xs text-gray-500 truncate">schedulr.app/alex</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          <p className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Scheduling
          </p>
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => clsx(isActive ? 'nav-item-active' : 'nav-item')}
              onClick={() => setSidebarOpen(false)}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-gray-100">
          <a
            href="/alex"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-[#0069ff] hover:bg-blue-50 transition-colors"
          >
            <ExternalLink size={16} />
            <span>View booking page</span>
          </a>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar (mobile) */}
        <header className="lg:hidden h-14 bg-white border-b border-gray-100 flex items-center px-4 gap-3">
          <button
            className="p-2 rounded-lg hover:bg-gray-100"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={20} className="text-gray-600" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[#0069ff] flex items-center justify-center">
              <Calendar size={13} className="text-white" />
            </div>
            <span className="font-bold text-gray-900">Schedulr</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
