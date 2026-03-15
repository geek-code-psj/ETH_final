import { useEffect, useState, useCallback } from 'react'
import { leaveApi, employeeApi } from '../api'
import EmptyState from '../components/EmptyState'
import { Plus, BookOpen, Check, X, Clock, CheckCircle, XCircle, Calendar, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

// ─── helpers ─────────────────────────────────────────────────────────────────
const safeArr = (v) => (Array.isArray(v) ? v : [])
const calcDays = (start, end) => {
  try { return Math.ceil((new Date(end) - new Date(start)) / 86400000) + 1 } catch { return '?' }
}
const fmtDate = (d) => {
  try { return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) }
  catch { return d || '—' }
}

const LEAVE_TYPES = ['Sick', 'Casual', 'Earned', 'Maternity', 'Paternity', 'Unpaid']
const STATUS_CLASS = {
  pending:  'badge bg-amber/15 text-amber border-amber/20',
  approved: 'badge-active',
  rejected: 'badge-absent',
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color }) {
  const cls = {
    amber:  'text-amber  bg-amber/10  border-amber/20',
    jade:   'text-jade   bg-jade/10   border-jade/20',
    coral:  'text-coral  bg-coral/10  border-coral/20',
    accent: 'text-accent-light bg-accent/10 border-accent/20',
  }[color] || ''
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 ${cls}`}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-xs text-ink-400">{label}</p>
        <p className="font-display font-bold text-xl text-ink-100">{value}</p>
      </div>
    </div>
  )
}

// ─── Leave Request Modal ───────────────────────────────────────────────────────
function LeaveModal({ onClose, onSaved }) {
  const [employees, setEmployees] = useState([])
  const [form, setForm] = useState({
    employee_id: '', leave_type: 'Sick', start_date: '', end_date: '', reason: ''
  })
  const [saving, setSaving] = useState(false)
  const [loadingEmps, setLoadingEmps] = useState(true)

  useEffect(() => {
    employeeApi.list({ limit: 500, status: 'Active' })
      .then(r => setEmployees(safeArr(r?.employees)))
      .catch(() => toast.error('Could not load employees'))
      .finally(() => setLoadingEmps(false))
  }, [])

  const handleSave = async () => {
    if (!form.employee_id) { toast.error('Select an employee'); return }
    if (!form.start_date)  { toast.error('Select start date'); return }
    if (!form.end_date)    { toast.error('Select end date'); return }
    if (form.end_date < form.start_date) { toast.error('End date cannot be before start date'); return }
    setSaving(true)
    try {
      await leaveApi.create({ ...form, employee_id: parseInt(form.employee_id) })
      toast.success('Leave request submitted')
      onSaved()
    } catch (err) {
      toast.error(err?.message || 'Failed to submit request')
    } finally { setSaving(false) }
  }

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="card-solid w-full max-w-md p-6 animate-fade-up space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-semibold text-ink-100">New Leave Request</h2>
          <button onClick={onClose} className="p-2 text-ink-500 hover:text-ink-200 hover:bg-ink-800 rounded-xl transition-colors">
            <X size={14} />
          </button>
        </div>

        <div>
          <label className="label">Employee *</label>
          {loadingEmps ? (
            <div className="flex items-center gap-2 text-ink-500 text-sm"><Loader2 size={14} className="animate-spin" /> Loading…</div>
          ) : (
            <select className="input-field" value={form.employee_id} onChange={set('employee_id')}>
              <option value="">Select employee…</option>
              {employees.map(e => (
                <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="label">Leave Type</label>
          <select className="input-field" value={form.leave_type} onChange={set('leave_type')}>
            {LEAVE_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Start Date *</label>
            <input type="date" className="input-field" value={form.start_date} onChange={set('start_date')} />
          </div>
          <div>
            <label className="label">End Date *</label>
            <input type="date" className="input-field" value={form.end_date}
              min={form.start_date || undefined} onChange={set('end_date')} />
          </div>
        </div>

        <div>
          <label className="label">Reason <span className="text-ink-600">(optional)</span></label>
          <textarea className="input-field resize-none" rows={3} value={form.reason}
            placeholder="Brief reason for the leave…"
            onChange={set('reason')} />
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 justify-center">
            {saving ? <><Loader2 size={14} className="animate-spin" /> Submitting…</> : 'Submit Request'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function LeavePage() {
  const [requests, setRequests]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [modalOpen, setModalOpen]   = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [actionLoading, setActionLoading] = useState(null) // id of row being actioned

  const fetchRequests = useCallback(() => {
    setLoading(true)
    const params = statusFilter ? { status: statusFilter } : {}
    leaveApi.list(params)
      .then(data => {
        // API returns a plain array: list[LeaveRequestResponse]
        setRequests(safeArr(data))
      })
      .catch(err => toast.error(err?.message || 'Failed to load leave requests'))
      .finally(() => setLoading(false))
  }, [statusFilter])

  useEffect(() => { fetchRequests() }, [fetchRequests])

  const handleAction = async (id, status) => {
    setActionLoading(id)
    try {
      await leaveApi.update(id, { status })
      toast.success(`Leave request ${status}`)
      fetchRequests()
    } catch (err) {
      toast.error(err?.message || 'Could not update')
    } finally { setActionLoading(null) }
  }

  // stats — derived from current list
  const pending  = requests.filter(r => r.status === 'pending').length
  const approved = requests.filter(r => r.status === 'approved').length
  const rejected = requests.filter(r => r.status === 'rejected').length

  return (
    <div className="space-y-5 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-50">Leave Management</h1>
          <p className="text-ink-400 text-sm mt-0.5">
            {loading ? 'Loading…' : `${requests.length} request${requests.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn-primary">
          <Plus size={16} /> New Request
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Calendar}     label="Total"    value={requests.length} color="accent" />
        <StatCard icon={Clock}        label="Pending"  value={pending}         color="amber" />
        <StatCard icon={CheckCircle}  label="Approved" value={approved}        color="jade" />
        <StatCard icon={XCircle}      label="Rejected" value={rejected}        color="coral" />
      </div>

      {/* Filter Bar */}
      <div className="card p-3 flex flex-wrap gap-2">
        {['', 'pending', 'approved', 'rejected'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === s
              ? 'bg-accent text-white shadow-sm'
              : 'bg-ink-800 text-ink-400 hover:bg-ink-700 hover:text-ink-200'}`}>
            {s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All'}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead className="bg-ink-900/60">
            <tr>
              {['Employee', 'Type', 'From → To', 'Days', 'Reason', 'Status', 'Actions'].map(h => (
                <th key={h} className="table-header">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="py-16 text-center">
                  <Loader2 size={28} className="animate-spin text-ink-500 mx-auto" />
                </td>
              </tr>
            ) : requests.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <EmptyState
                    icon={BookOpen}
                    title="No leave requests"
                    message={statusFilter ? `No ${statusFilter} requests found.` : 'No requests submitted yet.'}
                    actionLabel="New Request"
                    onAction={() => setModalOpen(true)}
                  />
                </td>
              </tr>
            ) : requests.map(r => {
              const days = calcDays(r.start_date, r.end_date)
              const isActioning = actionLoading === r.id
              return (
                <tr key={r.id} className="table-row">
                  <td className="table-cell text-ink-200 text-sm font-medium">{r.employee_name || '—'}</td>
                  <td className="table-cell">
                    <span className="badge bg-accent/10 text-accent-light border border-accent/20 whitespace-nowrap">
                      {r.leave_type}
                    </span>
                  </td>
                  <td className="table-cell text-xs font-mono text-ink-300 whitespace-nowrap">
                    {fmtDate(r.start_date)} → {fmtDate(r.end_date)}
                  </td>
                  <td className="table-cell text-ink-300 text-sm font-medium text-center">{days}d</td>
                  <td className="table-cell text-ink-500 text-xs max-w-[140px] truncate">{r.reason || '—'}</td>
                  <td className="table-cell">
                    <span className={STATUS_CLASS[r.status] || 'badge whitespace-nowrap'}>{r.status}</span>
                  </td>
                  <td className="table-cell">
                    {r.status === 'pending' && (
                      isActioning ? (
                        <Loader2 size={14} className="animate-spin text-ink-500" />
                      ) : (
                        <div className="flex gap-1">
                          <button onClick={() => handleAction(r.id, 'approved')} title="Approve"
                            className="p-1.5 text-jade hover:bg-jade/10 rounded-lg transition-colors">
                            <Check size={14} />
                          </button>
                          <button onClick={() => handleAction(r.id, 'rejected')} title="Reject"
                            className="p-1.5 text-coral hover:bg-coral/10 rounded-lg transition-colors">
                            <X size={14} />
                          </button>
                        </div>
                      )
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <LeaveModal onClose={() => setModalOpen(false)} onSaved={() => { setModalOpen(false); fetchRequests() }} />
      )}
    </div>
  )
}
