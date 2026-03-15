import { useEffect, useState } from 'react'
import { leaveApi, employeeApi } from '../api'
import EmptyState from '../components/EmptyState'
import { Plus, BookOpen, Check, X } from 'lucide-react'
import toast from 'react-hot-toast'

const LEAVE_TYPES = ['Sick','Casual','Earned','Maternity','Paternity','Unpaid']
const STATUS_CLASS = { pending: 'badge bg-amber/15 text-amber border-amber/20', approved: 'badge-active', rejected: 'badge-absent' }

function LeaveModal({ onClose, onSaved }) {
  const [employees, setEmployees] = useState([])
  const [form, setForm] = useState({ employee_id: '', leave_type: 'Sick', start_date: '', end_date: '', reason: '' })
  const [saving, setSaving] = useState(false)
  useEffect(() => { employeeApi.list({ limit: 200, status: 'Active' }).then(r => setEmployees(r.employees)) }, [])
  const handleSave = async () => {
    if (!form.employee_id || !form.start_date || !form.end_date) { toast.error('Fill required fields'); return }
    setSaving(true)
    try {
      await leaveApi.create({ ...form, employee_id: parseInt(form.employee_id) })
      toast.success('Leave request created')
      onSaved()
    } catch (err) { toast.error(err.message || 'Failed') }
    finally { setSaving(false) }
  }
  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="card-solid w-full max-w-md p-6 animate-fade-up space-y-4">
        <h2 className="font-display font-semibold text-ink-100">New Leave Request</h2>
        <div>
          <label className="label">Employee *</label>
          <select className="input-field" value={form.employee_id} onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))}>
            <option value="">Select employee…</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Leave Type</label>
            <select className="input-field" value={form.leave_type} onChange={e => setForm(f => ({ ...f, leave_type: e.target.value }))}>
              {LEAVE_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Start Date *</label><input type="date" className="input-field" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} /></div>
          <div><label className="label">End Date *</label><input type="date" className="input-field" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} /></div>
        </div>
        <div><label className="label">Reason</label><textarea className="input-field resize-none" rows={2} value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} /></div>
        <div className="flex gap-3 pt-2"><button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button><button onClick={handleSave} disabled={saving} className="btn-primary flex-1 justify-center">{saving ? 'Saving…' : 'Submit'}</button></div>
      </div>
    </div>
  )
}

export default function LeavePage() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')

  const fetch = () => {
    setLoading(true)
    leaveApi.list(statusFilter ? { status: statusFilter } : {})
      .then(r => setRequests(r.requests))
      .catch((err) => toast.error(err.message || 'Failed to load leave requests'))
      .finally(() => setLoading(false))
  }
  useEffect(() => { fetch() }, [statusFilter])

  const handleAction = async (id, status) => {
    try {
      await leaveApi.update(id, { status })
      toast.success(`Request ${status}`)
      fetch()
    } catch (err) { toast.error(err.message || 'Failed to update') }
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-50">Leave Requests</h1>
          <p className="text-ink-400 text-sm mt-0.5">{requests.length} requests</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn-primary"><Plus size={16} /> New Request</button>
      </div>

      <div className="card p-4 flex gap-3">
        {['','pending','approved','rejected'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === s ? 'bg-accent text-white' : 'bg-ink-800 text-ink-400 hover:bg-ink-700'}`}>
            {s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All'}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-ink-900/60">
            <tr>{['Employee','Type','Start','End','Days','Reason','Status','Actions'].map(h => <th key={h} className="table-header">{h}</th>)}</tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="py-16 text-center"><div className="spinner w-7 h-7 mx-auto" /></td></tr>
            ) : requests.length === 0 ? (
              <tr><td colSpan={8}>
                <EmptyState 
                  icon={BookOpen}
                  title="No leave requests"
                  message={statusFilter 
                    ? `There are no ${statusFilter} leave requests at the moment.` 
                    : "Wait for employees to submit leave requests."}
                  actionLabel="New Request"
                  onAction={() => setModalOpen(true)}
                />
              </td></tr>
            ) : requests.map(r => {
              const days = Math.ceil((new Date(r.end_date) - new Date(r.start_date)) / 86400000) + 1
              return (
                <tr key={r.id} className="table-row">
                  <td className="table-cell text-ink-200 text-sm font-medium">{r.employee_name}</td>
                  <td className="table-cell"><span className="badge bg-accent/10 text-accent-light border border-accent/20">{r.leave_type}</span></td>
                  <td className="table-cell text-xs font-mono text-ink-300">{r.start_date}</td>
                  <td className="table-cell text-xs font-mono text-ink-300">{r.end_date}</td>
                  <td className="table-cell text-ink-300 text-sm">{days}</td>
                  <td className="table-cell text-ink-500 text-xs max-w-32 truncate">{r.reason || '—'}</td>
                  <td className="table-cell"><span className={STATUS_CLASS[r.status] || 'badge'}>{r.status}</span></td>
                  <td className="table-cell">
                    {r.status === 'pending' && (
                      <div className="flex gap-1">
                        <button onClick={() => handleAction(r.id, 'approved')} className="p-1.5 text-jade hover:bg-jade/10 rounded-lg transition-colors"><Check size={13} /></button>
                        <button onClick={() => handleAction(r.id, 'rejected')} className="p-1.5 text-coral hover:bg-coral/10 rounded-lg transition-colors"><X size={13} /></button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {modalOpen && <LeaveModal onClose={() => setModalOpen(false)} onSaved={() => { setModalOpen(false); fetch() }} />}
    </div>
  )
}
