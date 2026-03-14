import { useState } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  LayoutDashboard, Users, CalendarCheck, LogOut, Building2,
  ChevronRight, Bell, Settings, ClipboardList, BookOpen,
  Menu, Shield, Building, HeartPulse, CalendarDays
} from 'lucide-react'

const NAV_GROUPS = [
  {
    label: 'Main',
    items: [
      { path: '/',           label: 'Dashboard',  icon: LayoutDashboard, end: true },
    ]
  },
  {
    label: 'People',
    items: [
      { path: '/employees',   label: 'Employees',   icon: Users },
      { path: '/departments', label: 'Departments', icon: Building },
      { path: '/leave',       label: 'Leave',       icon: BookOpen },
    ]
  },
  {
    label: 'Attendance',
    items: [
      { path: '/attendance',          label: 'Records',  icon: CalendarCheck },
      { path: '/attendance/calendar', label: 'Calendar', icon: CalendarDays },
    ]
  },
  {
    label: 'Admin',
    items: [
      { path: '/admins',   label: 'Admins',    icon: Shield },
      { path: '/audit',    label: 'Audit Log', icon: ClipboardList },
      { path: '/settings', label: 'Settings',  icon: Settings },
      { path: '/health',   label: 'Health',    icon: HeartPulse },
    ]
  }
]

const ALL_ITEMS = NAV_GROUPS.flatMap(g => g.items)

export default function Layout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  const pageName = ALL_ITEMS.find(n =>
    n.end ? location.pathname === n.path : location.pathname === n.path || location.pathname.startsWith(n.path + '/')
  )?.label || 'HRMS'

  const isActive = (path, end) =>
    end ? location.pathname === path : location.pathname === path || location.pathname.startsWith(path + '/')

  const SidebarContent = () => (
    <>
      <div className="px-5 py-5 border-b border-ink-700/40 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent/20 border border-accent/30 flex items-center justify-center">
            <Building2 size={16} className="text-accent-light" />
          </div>
          <div>
            <p className="font-display font-bold text-ink-100 text-sm leading-none">HRMS</p>
            <p className="text-ink-500 text-xs mt-0.5">Admin Portal</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-4">
        {NAV_GROUPS.map(group => (
          <div key={group.label}>
            <p className="px-3 text-xs font-semibold text-ink-600 uppercase tracking-widest mb-1">{group.label}</p>
            <div className="space-y-0.5">
              {group.items.map(({ path, label, icon: Icon, end }) => {
                const active = isActive(path, end)
                return (
                  <NavLink
                    key={path}
                    to={path}
                    end={end}
                    onClick={() => setMobileOpen(false)}
                    className={active ? 'sidebar-item-active' : 'sidebar-item'}
                  >
                    <Icon size={15} />
                    <span>{label}</span>
                    {active && <ChevronRight size={12} className="ml-auto opacity-60" />}
                  </NavLink>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-ink-700/40 flex-shrink-0">
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-ink-800/40 transition-colors">
          <div className="w-8 h-8 rounded-full bg-accent/20 border border-accent/30 overflow-hidden flex-shrink-0">
            {user?.photoURL
              ? <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-accent-light text-xs font-semibold">{user?.email?.[0]?.toUpperCase()}</div>
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-ink-200 truncate">{user?.displayName || 'Admin'}</p>
            <p className="text-xs text-ink-500 truncate">{user?.email}</p>
          </div>
          <button onClick={logout} className="text-ink-500 hover:text-coral transition-colors p-1.5 rounded-lg hover:bg-coral/10" title="Sign out">
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </>
  )

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="hidden md:flex w-56 flex-shrink-0 flex-col bg-ink-900/80 border-r border-ink-700/40 backdrop-blur-sm">
        <SidebarContent />
      </aside>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm" />
          <aside className="relative z-50 w-64 h-full flex flex-col bg-ink-900 border-r border-ink-700/40" onClick={e => e.stopPropagation()}>
            <SidebarContent />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="h-14 flex-shrink-0 flex items-center justify-between px-4 md:px-6 border-b border-ink-700/40 bg-ink-900/40 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="md:hidden p-2 text-ink-400 hover:text-ink-100 hover:bg-ink-800 rounded-xl transition-colors">
              <Menu size={16} />
            </button>
            <p className="font-display text-ink-100 text-sm font-semibold">{pageName}</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="relative p-2 text-ink-400 hover:text-ink-100 hover:bg-ink-800 rounded-xl transition-colors">
              <Bell size={16} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-coral rounded-full" />
            </button>
            <div className="hidden sm:block text-xs text-ink-500 font-mono">
              {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
