import { useEffect, useState } from 'react'
import api from '../api'
import { Shield, Crown, Eye, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'

const ROLES = ['super_admin','admin','hr_manager','viewer']
const ROLE_LABELS = { super_admin: 'Super Admin', admin: 'Admin', hr_manager: 'HR Manager', viewer: 'Viewer' }
const ROLE_COLORS = {
  super_admin: 'bg-coral/15 text-coral border-coral/20',
  admin:       'bg-accent/15 text-accent-light border-accent/20',
  hr_manager:  'bg-jade/15 text-jade border-jade/20',
  viewer:      'bg-ink-700/50 text-ink-400 border-ink-600/30',
}
const ROLE_ICONS = { super_admin: Crown, admin: Shield, hr_manager: Users, viewer: Eye }

export default function AdminsPage() {
  const { adminData } = useAuth()
  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/v1/admins')
      setAdmins(res.data.admins)
    } catch { toast.error('Failed to load admins') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetch() }, [])

  const updateRole = async (id, role) => {
    try {
      await api.put(`/api/v1/admins/${id}/role`, { role })
      toast.success('Role updated')
      fetch()
    } catch { toast.error('Failed to update role') }
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-50">Admin Management</h1>
        <p className="text-ink-400 text-sm mt-0.5">{admins.length} admins · Manage roles and access levels</p>
      </div>

      {/* Role legend */}
      <div className="card p-4">
        <p className="text-xs text-ink-500 mb-3 font-medium uppercase tracking-wider">Role Permissions</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {ROLES.map(role => {
            const Icon = ROLE_ICONS[role]
            return (
              <div key={role} className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${ROLE_COLORS[role]}`}>
                <Icon size={13} />
                <span className="text-xs font-medium">{ROLE_LABELS[role]}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-ink-900/60">
            <tr>
              {['Admin','Email','Current Role','Change Role','Since'].map(h => (
                <th key={h} className="table-header">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="py-12 text-center"><div className="spinner w-7 h-7 mx-auto" /></td></tr>
            ) : admins.map(admin => {
              const Icon = ROLE_ICONS[admin.role] || Shield
              const isSelf = adminData?.id === admin.id
              return (
                <tr key={admin.id} className="table-row">
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-accent/15 border border-accent/20 flex items-center justify-center text-xs font-semibold text-accent-light">
                        {admin.name?.[0] || admin.email[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-ink-200 text-sm font-medium">{admin.name || '—'}</p>
                        {isSelf && <span className="text-xs text-accent-light">(you)</span>}
                      </div>
                    </div>
                  </td>
                  <td className="table-cell text-ink-400 text-xs font-mono">{admin.email}</td>
                  <td className="table-cell">
                    <span className={`badge border ${ROLE_COLORS[admin.role] || ''}`}>
                      <Icon size={10} /> {ROLE_LABELS[admin.role] || admin.role}
                    </span>
                  </td>
                  <td className="table-cell">
                    {!isSelf ? (
                      <select
                        className="input-field py-1 text-xs w-36"
                        value={admin.role}
                        onChange={e => updateRole(admin.id, e.target.value)}
                      >
                        {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                      </select>
                    ) : <span className="text-ink-600 text-xs">Cannot change own role</span>}
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
    </div>
  )
}
