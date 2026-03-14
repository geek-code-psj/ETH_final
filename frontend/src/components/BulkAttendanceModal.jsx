import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { employeeApi, attendanceApi } from '../api'
import toast from 'react-hot-toast'

const STATUS_OPTIONS = ['Present', 'Absent', 'Late', 'Half Day', 'On Leave']

const STATUS_COLORS = {
  Present: 'text-jade bg-jade/10 border-jade/20',
  Absent: 'text-coral bg-coral/10 border-coral/20',
  Late: 'text-amber bg-amber/10 border-amber/20',
  'Half Day': 'text-accent-light bg-accent/10 border-accent/20',
  'On Leave': 'text-ink-400 bg-ink-700/30 border-ink-600/30',
}

export default function BulkAttendanceModal({ onClose, onSaved }) {
  const [employees, setEmployees] = useState([])
  const [attendance, setAttendance] = useState({})
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [defaultStatus, setDefaultStatus] = useState('Present')

  useEffect(() => {
    employeeApi.list({ limit: 200, status: 'Active' }).then(res => {
      const emps = res.data.employees
      setEmployees(emps)
      const initial = {}
      emps.forEach(e => { initial[e.id] = 'Present' })
      setAttendance(initial)
      setLoading(false)
    })
  }, [])

  const setAll = (status) => {
    setDefaultStatus(status)
    const updated = {}
    employees.forEach(e => { updated[e.id] = status })
    setAttendance(updated)
  }

  const setOne = (id, status) => {
    setAttendance(a => ({ ...a, [id]: status }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const records = employees.map(emp => ({
        employee_id: emp.id,
        date,
        status: attendance[emp.id] || 'Present',
      }))
      await attendanceApi.bulk(records)
      toast.success(`Attendance marked for ${records.length} employees`)
      onSaved()
    } catch {
      toast.error('Failed to save attendance')
    } finally {
      setSaving(false)
    }
  }

  const counts = employees.reduce((acc, emp) => {
    const s = attendance[emp.id] || 'Present'
    acc[s] = (acc[s] || 0) + 1
    return acc
  }, {})

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-ink-900 border border-ink-700/50 rounded-2xl w-full max-w-2xl mx-4 shadow-2xl animate-fade-up max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-700/40">
          <div>
            <h2 className="font-display font-semibold text-ink-100">Bulk Attendance</h2>
            <p className="text-xs text-ink-500 mt-0.5">Mark all employees at once</p>
          </div>
          <button onClick={onClose} className="p-2 text-ink-500 hover:text-ink-200 hover:bg-ink-800 rounded-xl transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Controls */}
        <div className="px-6 py-4 border-b border-ink-700/40 space-y-3">
          <div className="flex items-center gap-3">
            <div>
              <label className="label">Date</label>
              <input
                type="date"
                className="input-field w-44"
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <label className="label">Mark All As</label>
              <div className="flex gap-2 flex-wrap">
                {STATUS_OPTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => setAll(s)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                      defaultStatus === s ? STATUS_COLORS[s] : 'bg-ink-800/50 border-ink-700/50 text-ink-400 hover:border-ink-600'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Summary row */}
          <div className="flex gap-3 text-xs">
            <span className="text-jade">✓ {counts.Present || 0} Present</span>
            <span className="text-coral">✗ {counts.Absent || 0} Absent</span>
            <span className="text-amber">⧗ {counts.Late || 0} Late</span>
            {counts['Half Day'] > 0 && <span className="text-accent-light">½ {counts['Half Day']} Half Day</span>}
            {counts['On Leave'] > 0 && <span className="text-ink-400">✈ {counts['On Leave']} On Leave</span>}
          </div>
        </div>

        {/* Employee list */}
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="spinner w-7 h-7" />
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-ink-900/60 sticky top-0">
                <tr>
                  <th className="table-header">Employee</th>
                  <th className="table-header">Department</th>
                  <th className="table-header">Status</th>
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => (
                  <tr key={emp.id} className="table-row">
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-accent/15 border border-accent/20 flex items-center justify-center text-xs font-semibold text-accent-light flex-shrink-0">
                          {emp.first_name[0]}{emp.last_name[0]}
                        </div>
                        <div>
                          <p className="text-ink-200 text-xs font-medium">{emp.first_name} {emp.last_name}</p>
                          <p className="text-ink-500 text-xs font-mono">{emp.employee_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell text-ink-400 text-xs">{emp.department}</td>
                    <td className="table-cell">
                      <select
                        className={`text-xs font-medium px-2.5 py-1.5 rounded-lg border bg-transparent cursor-pointer transition-colors ${STATUS_COLORS[attendance[emp.id]] || ''}`}
                        value={attendance[emp.id] || 'Present'}
                        onChange={e => setOne(emp.id, e.target.value)}
                      >
                        {STATUS_OPTIONS.map(s => <option key={s} value={s} className="bg-ink-800 text-ink-100">{s}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-ink-700/40">
          <p className="text-xs text-ink-500">{employees.length} employees</p>
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary">Cancel</button>
            <button onClick={handleSave} disabled={saving || loading} className="btn-primary min-w-[130px] justify-center">
              {saving ? <><div className="spinner w-4 h-4" /> Saving…</> : 'Save Attendance'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
