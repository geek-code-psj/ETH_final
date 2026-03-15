import { useEffect, useState, useMemo } from 'react'
import { adminApi } from '../api'
import { Shield, Crown, Eye, Users, Search, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import EmptyState from '../components/EmptyState'

// ─── Constants ─────────────────────────────────────────────────────────────
const ROLES = ['super_admin','admin','hr_manager','viewer']
const ROLE_LABELS = { 
  super_admin: 'Super Admin', 
  admin:       'Admin', 
  hr_manager:  'HR Manager', 
  viewer:      'Viewer' 
}
const ROLE_COLORS = {
  super_admin: 'bg-coral/15 text-coral border-coral/20',
  admin:       'bg-accent/15 text-accent-light border-accent/20',
  hr_manager:  'bg-jade/15 text-jade border-jade/20',
  viewer:      'bg-ink-700/50 text-ink-400 border-ink-600/30',
}
const ROLE_ICONS = { 
  super_admin: Crown, 
  admin:       Shield, 
  hr_manager:  Users, 
  viewer:      Eye 
}

const safeArr = (v) => (Array.isArray(v) ? v : [])

// ─── Sub-components ────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color }) {
  const cls = {
    coral:  'text-coral bg-coral/10 border-coral/20',
    accent: 'text-accent-light bg-accent/10 border-accent/20',
    jade:   'text-jade bg-jade/10 border-jade/20',
    ink:    'text-ink-400 bg-ink-800 border-ink-700'
  }[color] || ''
  
  return (
    <div className="card p-3.5 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0 ${cls}`}>
        <Icon size={16} />
      </div>
      <div>
        <p className="text-[11px] text-ink-400 font-medium uppercase tracking-wider">{label}</p>
        <p className="font-display font-bold text-lg text-ink-100">{value}</p>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────
export default function AdminsPage() {
  const { adminData, isSuperAdmin } = useAuth()
  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [updatingId, setUpdatingId] = useState(null)

  const fetchAdmins = async () => {
    setLoading(true)
    try {
      const res = await adminApi.list()
      setAdmins(safeArr(res.admins))
    } catch (err) { 
      toast.error(err?.message || 'Failed to load admins') 
    } finally { 
      setLoading(false) 
    }
  }

  useEffect(() => { fetchAdmins() }, [])

  const updateRole = async (id, role) => {
    setUpdatingId(id)
    try {
      await adminApi.updateRole(id, role)
      toast.success('Admin role updated')
      fetchAdmins()
    } catch (err) { 
      toast.error(err?.message || 'Failed to update role') 
    } finally {
      setUpdatingId(null)
    }
  }

  // ─── Derived ─────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let res = admins
    if (roleFilter) res = res.filter(a => a.role === roleFilter)
    if (search) {
      const s = search.toLowerCase()
      res = res.filter(a => a.name?.toLowerCase().includes(s) || a.email.toLowerCase().includes(s))
    }
    return res
  }, [admins, search, roleFilter])

  const counts = {
    super_admin: admins.filter(a => a.role === 'super_admin').length,
    admin:       admins.filter(a => a.role === 'admin').length,
    hr_manager:  admins.filter(a => a.role === 'hr_manager').length,
    viewer:      admins.filter(a => a.role === 'viewer').length,
  }

  return (
    <div className="space-y-5 max-w-5xl animate-fade-up">
      {/* ── Header ── */}
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-50">Admin & Platform Access</h1>
        <p className="text-ink-400 text-sm mt-0.5">Manage dashboard users and their security permissions</p>
      </div>

      {/* ── Stats Row ── */}
      {admins.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={Crown}  label="Super Admins" value={counts.super_admin} color="coral" />
          <StatCard icon={Shield} label="Admins"       value={counts.admin}       color="accent" />
          <StatCard icon={Users}  label="HR Managers"  value={counts.hr_manager}  color="jade" />
          <StatCard icon={Eye}    label="Viewers"      value={counts.viewer}      color="ink" />
        </div>
      )}

      {/* ── Filters ── */}
      <div className="card p-3 flex flex-wrap gap-3 items-center">
        <div className="relative min-w-[200px] flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
          <input className="input-field pl-8 py-2 text-sm" placeholder="Search by name or email…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <div className="flex items-center gap-1 bg-ink-900 border border-ink-800 rounded-xl p-1 overflow-x-auto">
          {['', ...ROLES].map(r => (
            <button key={r || 'all'} onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${roleFilter === r ? 'bg-ink-700 text-white shadow-sm' : 'text-ink-400 hover:text-ink-200 hover:bg-ink-800'}`}>
              {r ? <>{(() => { const I = ROLE_ICONS[r]; return <I size={12}/> })()} {ROLE_LABELS[r]}</> : 'All Roles'}
            </button>
          ))}
        </div>

        {(search || roleFilter) && (
          <button onClick={() => { setSearch(''); setRoleFilter('') }} className="text-xs text-ink-500 hover:text-ink-200 px-2">
            Clear
          </button>
        )}
      </div>

      {/* ── Table ── */}
      <div className="card overflow-hidden">
        <div className="table-mobile-scroll">
          <table className="w-full min-w-[700px]">
            <thead className="bg-ink-900/60">
              <tr>
                {['Admin User', 'Email Address', 'Current Role', 'Change Role', 'Joined'].map(h => (
                  <th key={h} className="table-header">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="py-20 text-center"><Loader2 size={32} className="animate-spin text-ink-500 mx-auto" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5}>
                  <EmptyState 
                    icon={Shield} 
                    title="No admins found" 
                    message={search ? "Try adjusting your search filters." : "No admin accounts exist."}
                    actionLabel={search ? "Clear Search" : null}
                    onAction={search ? () => { setSearch(''); setRoleFilter('') } : null}
                  />
                </td></tr>
              ) : filtered.map(admin => {
                const Icon = ROLE_ICONS[admin.role] || Shield
                const isSelf = adminData?.id === admin.id
                // Only super_admins can change roles (or admins doing it to lower roles, but let's restrict to super_admin for simplicity)
                const canEdit = isSuperAdmin && !isSelf
                const isUpdating = updatingId === admin.id

                return (
                  <tr key={admin.id} className="table-row hover:bg-ink-800/30">
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-ink-700 to-ink-800 border border-ink-600/50 flex items-center justify-center text-sm font-semibold text-ink-200 flex-shrink-0 shadow-inner">
                          {admin.name?.[0] || admin.email[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-ink-100 text-sm font-medium">{admin.name || 'Unknown User'}</p>
                            {isSelf && <span className="text-[10px] font-bold tracking-wider uppercase text-accent bg-accent/10 px-1.5 py-0.5 rounded">You</span>}
                          </div>
                          {!admin.is_active && <p className="text-xs text-amber mt-0.5">Inactive / Disabled</p>}
                        </div>
                      </div>
                    </td>
                    <td className="table-cell text-ink-300 text-sm font-mono">{admin.email}</td>
                    <td className="table-cell">
                      <span className={`badge border flex items-center gap-1.5 w-fit ${ROLE_COLORS[admin.role] || ''}`}>
                        <Icon size={12} /> {ROLE_LABELS[admin.role] || admin.role}
                      </span>
                    </td>
                    <td className="table-cell">
                      {isUpdating ? (
                        <div className="flex items-center gap-2 text-xs text-ink-400">
                          <Loader2 size={12} className="animate-spin" /> Saving…
                        </div>
                      ) : canEdit ? (
                        <select
                          className="input-field py-1.5 px-3 text-xs w-36 bg-ink-900 border-ink-700 hover:border-ink-600 focus:border-accent"
                          value={admin.role}
                          onChange={e => updateRole(admin.id, e.target.value)}
                        >
                          {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                        </select>
                      ) : (
                        <span className="text-ink-600 text-xs italic">
                          {isSelf ? 'Cannot modify your own role' : 'Requires Super Admin'}
                        </span>
                      )}
                    </td>
                    <td className="table-cell text-ink-500 text-xs font-mono">
                      {admin.created_at ? new Date(admin.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        
        {filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-ink-800/50 flex items-center text-xs text-ink-500 bg-ink-900/30">
            Showing {filtered.length} admin account{filtered.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  )
}
