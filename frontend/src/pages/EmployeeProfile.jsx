import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { employeeApi, attendanceApi, leaveApi } from '../api'
import EmployeeModal from '../components/EmployeeModal'
import {
  ArrowLeft, Pencil, Mail, Phone, MapPin, Calendar, Briefcase,
  DollarSign, Users, Clock, CheckCircle, XCircle, AlertCircle,
  User, BookOpen, Loader2
} from 'lucide-react'
import toast from 'react-hot-toast'

// ─── helpers ──────────────────────────────────────────────────────────────────
const safeArr = (v) => (Array.isArray(v) ? v : [])
const fmtDate = (d, opts = {}) => {
  if (!d) return '—'
  try { return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', ...opts }) }
  catch { return d }
}
const fmtTime = (dt) => {
  if (!dt) return '—'
  try { return new Date(dt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) }
  catch { return '—' }
}

// ─── Constants ────────────────────────────────────────────────────────────────
const ATT_CLASS = {
  Present: 'badge-present', Absent: 'badge-absent', Late: 'badge-late',
  'Half Day': 'badge-halfday', 'On Leave': 'badge-leave',
}
const LEAVE_CLASS = {
  pending:  'badge bg-amber/15 text-amber border-amber/20',
  approved: 'badge-active',
  rejected: 'badge-absent',
}
const TABS = ['Overview', 'Attendance', 'Leave History']

// ─── Sub-components ─────────────────────────────────────────────────────────
function StatPill({ icon: Icon, label, value, color = 'accent' }) {
  const cs = {
    accent: 'text-accent-light bg-accent/10',
    jade:   'text-jade bg-jade/10',
    coral:  'text-coral bg-coral/10',
    amber:  'text-amber bg-amber/10',
  }
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${cs[color]}`}>
        <Icon size={16} />
      </div>
      <div>
        <p className="text-xs text-ink-400">{label}</p>
        <p className="font-display font-bold text-ink-100">{value}</p>
      </div>
    </div>
  )
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-7 h-7 rounded-lg bg-ink-800 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon size={13} className="text-ink-500" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-ink-500">{label}</p>
        <p className="text-sm text-ink-200 break-words">{value || '—'}</p>
      </div>
    </div>
  )
}

function HierarchyRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-ink-800/50 border border-ink-700/30">
      <div className="w-8 h-8 rounded-full bg-ink-700 flex items-center justify-center flex-shrink-0">
        <Icon size={14} className="text-ink-400" />
      </div>
      <div>
        <p className="text-xs text-ink-500">{label}</p>
        <p className="text-sm text-ink-200">{value}</p>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function EmployeeProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [employee,     setEmployee]     = useState(null)
  const [attendance,   setAttendance]   = useState([])
  const [leaveHistory, setLeaveHistory] = useState([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState(null)
  const [editOpen,     setEditOpen]     = useState(false)
  const [activeTab,    setActiveTab]    = useState('Overview')

  const loadData = useCallback(() => {
    if (!id) return
    setLoading(true)
    setError(null)

    Promise.allSettled([
      employeeApi.get(id),
      attendanceApi.list({ employee_id: id, limit: 30 }),
      leaveApi.list({ employee_id: id }),
    ]).then(([empR, attR, lvR]) => {
      if (empR.status === 'fulfilled') {
        setEmployee(empR.value)
      } else {
        setError('Could not load employee. They may not exist.')
      }
      if (attR.status === 'fulfilled') {
        setAttendance(safeArr(attR.value?.records))
      }
      if (lvR.status === 'fulfilled') {
        // leave endpoint returns a flat array
        setLeaveHistory(safeArr(lvR.value))
      }
    }).finally(() => setLoading(false))
  }, [id])

  useEffect(() => { loadData() }, [loadData])

  const handleSave = async (data) => {
    try {
      await employeeApi.update(id, data)
      const res = await employeeApi.get(id)
      setEmployee(res)
      setEditOpen(false)
      toast.success('Employee updated')
    } catch (err) {
      toast.error(err?.message || 'Update failed')
      throw err
    }
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3 text-ink-500">
      <Loader2 size={32} className="animate-spin text-accent" />
      <p className="text-sm">Loading profile…</p>
    </div>
  )

  // ── Error ────────────────────────────────────────────────────────────────
  if (error || !employee) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="text-ink-500 text-center">
        <XCircle size={32} className="text-coral mx-auto mb-3" />
        <p className="font-semibold text-ink-200">{error || 'Employee not found'}</p>
        <p className="text-sm text-ink-500 mt-1">The employee might have been deleted.</p>
      </div>
      <button onClick={() => navigate('/employees')} className="btn-secondary">
        <ArrowLeft size={14} /> Back to employees
      </button>
    </div>
  )

  // ── Derived stats ──────────────────────────────────────────────────────
  const presentDays = attendance.filter(a => a.status === 'Present').length
  const lateDays    = attendance.filter(a => a.status === 'Late').length
  const absentDays  = attendance.filter(a => a.status === 'Absent').length
  const totalHours  = attendance.reduce((acc, a) => acc + (parseFloat(a.hours_worked) || 0), 0)

  const statusBadge = employee.status === 'Active' ? 'badge-active'
    : employee.status === 'On Leave' ? 'badge-leave' : 'badge-inactive'

  return (
    <div className="max-w-5xl space-y-5 animate-fade-up">
      {/* Top nav */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/employees')} className="btn-ghost">
          <ArrowLeft size={16} /> Back to Employees
        </button>
        <button onClick={() => setEditOpen(true)} className="btn-primary">
          <Pencil size={15} /> Edit Profile
        </button>
      </div>

      {/* Hero */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="relative flex-shrink-0">
            {employee.avatar_url ? (
              <img src={employee.avatar_url} alt=""
                className="w-20 h-20 rounded-2xl object-cover border-2 border-accent/30" />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent/30 to-jade/20 border-2 border-accent/20 flex items-center justify-center text-2xl font-bold text-accent-light">
                {employee.first_name?.[0]}{employee.last_name?.[0]}
              </div>
            )}
            <span className={`absolute -bottom-1.5 -right-1.5 text-xs ${statusBadge}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              {employee.status}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-2xl font-bold text-ink-50 truncate">
              {employee.first_name} {employee.last_name}
            </h1>
            <p className="text-ink-400 mt-0.5">{employee.position || 'No position'} · {employee.department || 'No dept'}</p>
            <p className="text-ink-500 text-sm font-mono mt-1">{employee.employee_id || `ID:${id}`}</p>
          </div>
          {employee.role_permission && (
            <span className="badge bg-accent/10 text-accent-light border border-accent/20 flex-shrink-0">
              {employee.role_permission}
            </span>
          )}
        </div>
      </div>

      {/* Stat pills */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatPill icon={CheckCircle} label="Present (30d)" value={presentDays} color="jade" />
        <StatPill icon={AlertCircle} label="Late (30d)"    value={lateDays}    color="amber" />
        <StatPill icon={XCircle}     label="Absent (30d)"  value={absentDays}  color="coral" />
        <StatPill icon={Clock}       label="Total Hours"   value={`${totalHours.toFixed(1)}h`} color="accent" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-ink-900 border border-ink-800/60 rounded-2xl p-1 w-fit">
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${activeTab === tab
              ? 'bg-accent text-white shadow-sm'
              : 'text-ink-400 hover:text-ink-200 hover:bg-ink-800'}`}>
            {tab}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {activeTab === 'Overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card p-5 space-y-4">
            <h3 className="font-display font-semibold text-ink-200 text-sm border-b border-ink-800 pb-2">
              Contact &amp; Details
            </h3>
            <InfoRow icon={Mail}       label="Email"         value={employee.email} />
            <InfoRow icon={Phone}      label="Phone"         value={employee.phone} />
            <InfoRow icon={MapPin}     label="Address"       value={employee.address} />
            <InfoRow icon={Calendar}   label="Hire Date"     value={fmtDate(employee.hire_date, { month: 'long', year: 'numeric' })} />
            <InfoRow icon={Calendar}   label="Date of Birth" value={employee.date_of_birth ? fmtDate(employee.date_of_birth) : null} />
            <InfoRow icon={DollarSign} label="Salary"        value={employee.salary ? `₹${Number(employee.salary).toLocaleString('en-IN')}` : null} />
          </div>

          <div className="card p-5 space-y-4">
            <h3 className="font-display font-semibold text-ink-200 text-sm border-b border-ink-800 pb-2">
              Hierarchy &amp; Role
            </h3>
            <HierarchyRow icon={User}      label="Reports to"      value={employee.manager_name || 'No manager assigned'} />
            <HierarchyRow icon={Users}     label="Direct Reports"  value={`${employee.direct_reports_count ?? 0} people`} />
            <HierarchyRow icon={Briefcase} label="Role / Permission" value={employee.role_permission || 'Not specified'} />
          </div>
        </div>
      )}

      {/* ── Attendance ── */}
      {activeTab === 'Attendance' && (
        <div className="card overflow-x-auto">
          <div className="px-5 py-4 border-b border-ink-700/40">
            <h3 className="font-display font-semibold text-ink-200 text-sm">
              Recent Attendance <span className="text-ink-500 font-normal">(last 30 records)</span>
            </h3>
          </div>
          {attendance.length === 0 ? (
            <div className="py-14 text-center text-ink-500 text-sm">
              <Clock size={28} className="mx-auto mb-3 text-ink-600" />
              No attendance records yet
            </div>
          ) : (
            <table className="w-full min-w-[560px]">
              <thead className="bg-ink-900/40">
                <tr>
                  {['Date', 'Check In', 'Check Out', 'Hours', 'Status', 'Notes'].map(h => (
                    <th key={h} className="table-header">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {attendance.map(r => (
                  <tr key={r.id} className="table-row">
                    <td className="table-cell text-xs font-mono text-ink-300 whitespace-nowrap">{fmtDate(r.date)}</td>
                    <td className="table-cell text-xs font-mono text-ink-300">{fmtTime(r.check_in)}</td>
                    <td className="table-cell text-xs font-mono text-ink-300">{fmtTime(r.check_out)}</td>
                    <td className="table-cell text-xs font-mono text-ink-300">{r.hours_worked ? `${r.hours_worked}h` : '—'}</td>
                    <td className="table-cell">
                      <span className={ATT_CLASS[r.status] || 'badge'}>{r.status}</span>
                    </td>
                    <td className="table-cell text-xs text-ink-500 max-w-[130px] truncate">{r.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Leave History ── */}
      {activeTab === 'Leave History' && (
        <div className="card overflow-x-auto">
          <div className="px-5 py-4 border-b border-ink-700/40">
            <h3 className="font-display font-semibold text-ink-200 text-sm">
              Leave History <span className="text-ink-500 font-normal">({leaveHistory.length} requests)</span>
            </h3>
          </div>
          {leaveHistory.length === 0 ? (
            <div className="py-14 text-center text-ink-500 text-sm">
              <BookOpen size={28} className="mx-auto mb-3 text-ink-600" />
              No leave requests found for this employee
            </div>
          ) : (
            <table className="w-full min-w-[520px]">
              <thead className="bg-ink-900/40">
                <tr>
                  {['Type', 'From → To', 'Days', 'Reason', 'Status', 'Applied On'].map(h => (
                    <th key={h} className="table-header">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leaveHistory.map(r => {
                  const days = (() => {
                    try { return Math.ceil((new Date(r.end_date) - new Date(r.start_date)) / 86400000) + 1 }
                    catch { return '?' }
                  })()
                  return (
                    <tr key={r.id} className="table-row">
                      <td className="table-cell">
                        <span className="badge bg-accent/10 text-accent-light border border-accent/20 whitespace-nowrap">
                          {r.leave_type}
                        </span>
                      </td>
                      <td className="table-cell text-xs font-mono text-ink-300 whitespace-nowrap">
                        {fmtDate(r.start_date, { month: 'short' })} → {fmtDate(r.end_date, { month: 'short' })}
                      </td>
                      <td className="table-cell text-ink-300 text-sm font-medium text-center">{days}d</td>
                      <td className="table-cell text-ink-500 text-xs max-w-[130px] truncate">{r.reason || '—'}</td>
                      <td className="table-cell">
                        <span className={LEAVE_CLASS[r.status] || 'badge whitespace-nowrap'}>{r.status}</span>
                      </td>
                      <td className="table-cell text-xs text-ink-500 whitespace-nowrap">{fmtDate(r.created_at?.split('T')[0])}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {editOpen && (
        <EmployeeModal employee={employee} onClose={() => setEditOpen(false)} onSave={handleSave} />
      )}
    </div>
  )
}
