import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { employeeApi, attendanceApi } from '../api'
import EmployeeModal from '../components/EmployeeModal'
import { ArrowLeft, Pencil, Mail, Phone, MapPin, Calendar, Briefcase,
         DollarSign, Users, Clock, CheckCircle, XCircle, AlertCircle, User } from 'lucide-react'
import toast from 'react-hot-toast'

const STATUS_CLASS = {
  Active: 'badge-active', Inactive: 'badge-inactive', 'On Leave': 'badge-leave'
}
const ATT_CLASS = {
  Present: 'badge-present', Absent: 'badge-absent', Late: 'badge-late',
  'Half Day': 'badge-halfday', 'On Leave': 'badge-leave'
}

function StatPill({ icon: Icon, label, value, color = 'accent' }) {
  const c = { accent: 'text-accent-light bg-accent/10', jade: 'text-jade bg-jade/10',
               coral: 'text-coral bg-coral/10', amber: 'text-amber bg-amber/10' }
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${c[color]}`}>
        <Icon size={16} />
      </div>
      <div>
        <p className="text-xs text-ink-400">{label}</p>
        <p className="font-display font-bold text-ink-100">{value}</p>
      </div>
    </div>
  )
}

export default function EmployeeProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [employee, setEmployee] = useState(null)
  const [attendance, setAttendance] = useState([])
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)

  useEffect(() => {
    Promise.all([
      employeeApi.get(id),
      attendanceApi.list({ employee_id: id, limit: 30 })
    ]).then(([emp, att]) => {
      setEmployee(emp)
      setAttendance(att.records)
    }).catch((err) => toast.error(err.message || 'Failed to load profile'))
    .finally(() => setLoading(false))
  }, [id])

  const handleSave = async (data) => {
    try {
      await employeeApi.update(id, data)
      const res = await employeeApi.get(id)
      setEmployee(res)
      setEditOpen(false)
      toast.success('Employee updated')
    } catch (err) {
      toast.error(err.message)
      throw err
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64"><div className="spinner w-8 h-8" /></div>
  )
  if (!employee) return (
    <div className="text-center py-16 text-ink-500">Employee not found</div>
  )

  const presentDays = attendance.filter(a => a.status === 'Present').length
  const lateDays = attendance.filter(a => a.status === 'Late').length
  const absentDays = attendance.filter(a => a.status === 'Absent').length
  const totalHours = attendance.reduce((s, a) => s + (parseFloat(a.hours_worked) || 0), 0)

  return (
    <div className="max-w-5xl space-y-5 animate-fade-up">
      {/* Back + edit */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/employees')} className="btn-ghost">
          <ArrowLeft size={16} /> Back to Employees
        </button>
        <button onClick={() => setEditOpen(true)} className="btn-primary">
          <Pencil size={15} /> Edit Profile
        </button>
      </div>

      {/* Hero card */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="relative">
            {employee.avatar_url ? (
              <img src={employee.avatar_url} alt="" className="w-20 h-20 rounded-2xl object-cover border-2 border-accent/30" />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent/30 to-jade/20 border-2 border-accent/20 flex items-center justify-center text-2xl font-bold text-accent-light">
                {employee.first_name[0]}{employee.last_name[0]}
              </div>
            )}
            <span className={`absolute -bottom-1.5 -right-1.5 ${employee.status === 'Active' ? 'badge-active' : employee.status === 'On Leave' ? 'badge-leave' : 'badge-inactive'} text-xs`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              {employee.status}
            </span>
          </div>
          <div className="flex-1">
            <h1 className="font-display text-2xl font-bold text-ink-50">{employee.first_name} {employee.last_name}</h1>
            <p className="text-ink-400 mt-0.5">{employee.position} · {employee.department}</p>
            <p className="text-ink-500 text-sm font-mono mt-1">{employee.employee_id}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {employee.role_permission && (
              <span className="badge bg-accent/10 text-accent-light border border-accent/20">{employee.role_permission}</span>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatPill icon={CheckCircle} label="Present (30d)" value={presentDays} color="jade" />
        <StatPill icon={AlertCircle} label="Late (30d)" value={lateDays} color="amber" />
        <StatPill icon={XCircle} label="Absent (30d)" value={absentDays} color="coral" />
        <StatPill icon={Clock} label="Total Hours" value={`${totalHours.toFixed(1)}h`} color="accent" />
      </div>

      {/* Details + hierarchy */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Contact info */}
        <div className="card p-5 space-y-3">
          <h3 className="font-display font-semibold text-ink-200 text-sm">Contact & Details</h3>
          {[
            { icon: Mail, label: 'Email', value: employee.email },
            { icon: Phone, label: 'Phone', value: employee.phone || '—' },
            { icon: MapPin, label: 'Address', value: employee.address || '—' },
            { icon: Calendar, label: 'Hire Date', value: new Date(employee.hire_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) },
            { icon: Calendar, label: 'Date of Birth', value: employee.date_of_birth ? new Date(employee.date_of_birth).toLocaleDateString('en-IN') : '—' },
            { icon: DollarSign, label: 'Salary', value: employee.salary ? `₹${Number(employee.salary).toLocaleString('en-IN')}` : '—' },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-ink-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Icon size={13} className="text-ink-500" />
              </div>
              <div>
                <p className="text-xs text-ink-500">{label}</p>
                <p className="text-sm text-ink-200 break-all">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Manager / hierarchy */}
        <div className="card p-5 space-y-3">
          <h3 className="font-display font-semibold text-ink-200 text-sm">Hierarchy</h3>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-ink-800/50 border border-ink-700/30">
            <div className="w-8 h-8 rounded-full bg-ink-700 flex items-center justify-center">
              <User size={14} className="text-ink-400" />
            </div>
            <div>
              <p className="text-xs text-ink-500">Reports to</p>
              <p className="text-sm text-ink-200">{employee.manager_name || 'No manager assigned'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-ink-800/50 border border-ink-700/30">
            <div className="w-8 h-8 rounded-full bg-ink-700 flex items-center justify-center">
              <Users size={14} className="text-ink-400" />
            </div>
            <div>
              <p className="text-xs text-ink-500">Direct Reports</p>
              <p className="text-sm text-ink-200">{employee.direct_reports_count || 0} people</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-ink-800/50 border border-ink-700/30">
            <div className="w-8 h-8 rounded-full bg-ink-700 flex items-center justify-center">
              <Briefcase size={14} className="text-ink-400" />
            </div>
            <div>
              <p className="text-xs text-ink-500">Role / Permission</p>
              <p className="text-sm text-ink-200">{employee.role_permission || 'Not specified'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent attendance */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-ink-700/40">
          <h3 className="font-display font-semibold text-ink-200 text-sm">Recent Attendance (last 30 records)</h3>
        </div>
        {attendance.length === 0 ? (
          <div className="py-12 text-center text-ink-500 text-sm">No attendance records yet</div>
        ) : (
          <table className="w-full">
            <thead className="bg-ink-900/40">
              <tr>
                {['Date','Check In','Check Out','Hours','Status','Notes'].map(h => (
                  <th key={h} className="table-header">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {attendance.map(r => (
                <tr key={r.id} className="table-row">
                  <td className="table-cell text-xs font-mono text-ink-300">
                    {new Date(r.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="table-cell text-xs font-mono text-ink-300">
                    {r.check_in ? new Date(r.check_in).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </td>
                  <td className="table-cell text-xs font-mono text-ink-300">
                    {r.check_out ? new Date(r.check_out).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </td>
                  <td className="table-cell text-xs font-mono text-ink-300">{r.hours_worked ? `${r.hours_worked}h` : '—'}</td>
                  <td className="table-cell"><span className={ATT_CLASS[r.status] || 'badge'}>{r.status}</span></td>
                  <td className="table-cell text-xs text-ink-500 max-w-32 truncate">{r.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editOpen && (
        <EmployeeModal employee={employee}
          onClose={() => setEditOpen(false)}
          onSave={handleSave} />
      )}
    </div>
  )
}
