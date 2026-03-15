import { useEffect, useState, useCallback, useMemo } from 'react'
import { leaveApi, employeeApi } from '../api'
import EmptyState from '../components/EmptyState'
import {
  Plus, BookOpen, Check, X, Clock, CheckCircle, XCircle,
  Calendar, Loader2, ChevronDown, Download, Filter, Search,
  AlertTriangle, TrendingUp, Users2
} from 'lucide-react'
import toast from 'react-hot-toast'

// ─── Helpers ──────────────────────────────────────────────────────────────────
const safeArr = (v) => (Array.isArray(v) ? v : [])
const calcDays = (s, e) => { try { return Math.ceil((new Date(e) - new Date(s)) / 86400000) + 1 } catch { return 0 } }
const fmtDate  = (d) => { try { return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) } catch { return d || '—' } }
const fmtShort = (d) => { try { return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) } catch { return d || '—' } }

const LEAVE_TYPES = ['Sick', 'Casual', 'Earned', 'Maternity', 'Paternity', 'Unpaid']
const STATUS_CLASS = {
  pending:  'badge bg-amber/15 text-amber border-amber/20',
  approved: 'badge-active',
  rejected: 'badge-absent',
}
const STATUS_ICON = { pending: Clock, approved: CheckCircle, rejected: XCircle }

// ─── Sub-components ──────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color }) {
  const cls = { amber: 'text-amber bg-amber/10 border-amber/20', jade: 'text-jade bg-jade/10 border-jade/20', coral: 'text-coral bg-coral/10 border-coral/20', accent: 'text-accent-light bg-accent/10 border-accent/20' }[color] || ''
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 ${cls}`}><Icon size={18} /></div>
      <div>
        <p className="text-xs text-ink-400">{label}</p>
        <p className="font-display font-bold text-xl text-ink-100">{value}</p>
        {sub && <p className="text-xs text-ink-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function LeaveTypeBadge({ type }) {
  const colors = { Sick: 'bg-coral/10 text-coral border-coral/20', Casual: 'bg-amber/10 text-amber border-amber/20', Earned: 'bg-jade/10 text-jade border-jade/20', Maternity: 'bg-accent/10 text-accent-light border-accent/20', Paternity: 'bg-accent/10 text-accent-light border-accent/20', Unpaid: 'bg-ink-700 text-ink-400 border-ink-600' }
  return <span className={`badge ${colors[type] || 'badge'} whitespace-nowrap`}>{type}</span>
}

// ─── Leave Request Modal ──────────────────────────────────────────────────────
function LeaveModal({ onClose, onSaved, editRequest }) {
  const isEdit = !!editRequest
  const [employees, setEmployees] = useState([])
  const [form, setForm] = useState({
    employee_id: editRequest?.employee_id || '',
    leave_type:  editRequest?.leave_type  || 'Sick',
    start_date:  editRequest?.start_date  || '',
    end_date:    editRequest?.end_date    || '',
    reason:      editRequest?.reason      || '',
  })
  const [saving, setSaving] = useState(false)
  const [loadingEmps, setLoadingEmps] = useState(!isEdit)

  useEffect(() => {
    if (isEdit) return
    employeeApi.list({ limit: 500, status: 'Active' })
      .then(r => setEmployees(safeArr(r?.employees)))
      .catch(() => toast.error('Could not load employees'))
      .finally(() => setLoadingEmps(false))
  }, [isEdit])

  const days = form.start_date && form.end_date ? calcDays(form.start_date, form.end_date) : 0
  const set  = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSave = async () => {
    if (!form.employee_id && !isEdit) { toast.error('Select an employee'); return }
    if (!form.start_date)             { toast.error('Select start date'); return }
    if (!form.end_date)               { toast.error('Select end date'); return }
    if (form.end_date < form.start_date) { toast.error('End date must be after start date'); return }
    setSaving(true)
    try {
      if (isEdit) {
        await leaveApi.update(editRequest.id, { leave_type: form.leave_type, start_date: form.start_date, end_date: form.end_date, reason: form.reason })
        toast.success('Leave request updated')
      } else {
        await leaveApi.create({ ...form, employee_id: parseInt(form.employee_id) })
        toast.success('Leave request submitted')
      }
      onSaved()
    } catch (err) {
      toast.error(err?.message || 'Operation failed')
    } finally { setSaving(false) }
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="card-solid w-full max-w-lg p-6 animate-fade-up space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display font-semibold text-ink-100">{isEdit ? 'Edit Leave Request' : 'New Leave Request'}</h2>
            {days > 0 && <p className="text-xs text-ink-500 mt-0.5">{days} day{days !== 1 ? 's' : ''} selected</p>}
          </div>
          <button onClick={onClose} className="p-2 text-ink-500 hover:text-ink-200 hover:bg-ink-800 rounded-xl transition-colors"><X size={14} /></button>
        </div>

        {!isEdit && (
          <div>
            <label className="label">Employee *</label>
            {loadingEmps
              ? <div className="flex items-center gap-2 text-ink-500 text-sm py-2"><Loader2 size={14} className="animate-spin" /> Loading employees…</div>
              : (
                <select className="input-field" value={form.employee_id} onChange={set('employee_id')}>
                  <option value="">Select employee…</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name} — {e.department || 'No dept'}</option>)}
                </select>
              )}
          </div>
        )}

        <div>
          <label className="label">Leave Type</label>
          <div className="grid grid-cols-3 gap-2">
            {LEAVE_TYPES.map(t => (
              <button key={t} onClick={() => setForm(f => ({ ...f, leave_type: t }))}
                className={`py-2 px-3 rounded-xl text-xs font-medium border transition-colors ${form.leave_type === t ? 'bg-accent text-white border-accent' : 'bg-ink-800/60 text-ink-400 border-ink-700 hover:border-ink-600'}`}>
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Start Date *</label>
            <input type="date" className="input-field" value={form.start_date} onChange={set('start_date')} />
          </div>
          <div>
            <label className="label">End Date *</label>
            <input type="date" className="input-field" value={form.end_date} min={form.start_date || undefined} onChange={set('end_date')} />
          </div>
        </div>

        {days > 0 && (
          <div className="flex items-center gap-2 text-xs text-accent-light bg-accent/8 border border-accent/15 rounded-xl px-3 py-2">
            <Calendar size={13} />
            <span>{days} calendar day{days !== 1 ? 's' : ''} requested ({form.leave_type})</span>
          </div>
        )}

        <div>
          <label className="label">Reason <span className="text-ink-600">(optional but recommended)</span></label>
          <textarea className="input-field resize-none" rows={3} value={form.reason}
            placeholder="Describe the reason for this leave request…" onChange={set('reason')} />
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center" disabled={saving}>Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 justify-center">
            {saving ? <><Loader2 size={14} className="animate-spin" /> {isEdit ? 'Updating…' : 'Submitting…'}</> : isEdit ? 'Update Request' : 'Submit Request'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Reject with Comment Modal ────────────────────────────────────────────────
function RejectModal({ request, onClose, onRejected }) {
  const [saving, setSaving] = useState(false)
  const handleReject = async () => {
    setSaving(true)
    try {
      await leaveApi.update(request.id, { status: 'rejected' })
      toast.success('Leave request rejected')
      onRejected()
    } catch (err) { toast.error(err?.message || 'Failed') }
    finally { setSaving(false) }
  }
  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="card-solid w-full max-w-sm p-6 animate-fade-up space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-coral/10 border border-coral/20 flex items-center justify-center">
            <XCircle size={18} className="text-coral" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-ink-100">Reject Leave?</h3>
            <p className="text-xs text-ink-500">{request.employee_name} · {request.leave_type}</p>
          </div>
        </div>
        <p className="text-sm text-ink-400">
          Rejecting <strong className="text-ink-200">{calcDays(request.start_date, request.end_date)} days</strong> of leave from {fmtShort(request.start_date)} to {fmtShort(request.end_date)}.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center" disabled={saving}>Cancel</button>
          <button onClick={handleReject} disabled={saving} className="btn-danger flex-1 justify-center">
            {saving ? <Loader2 size={14} className="animate-spin" /> : 'Confirm Reject'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function LeavePage() {
  const [requests,      setRequests]      = useState([])
  const [loading,       setLoading]       = useState(true)
  const [modalOpen,     setModalOpen]     = useState(false)
  const [editRequest,   setEditRequest]   = useState(null)
  const [rejectTarget,  setRejectTarget]  = useState(null)
  const [actionLoading, setActionLoading] = useState(null)
  const [statusFilter,  setStatusFilter]  = useState('')
  const [typeFilter,    setTypeFilter]    = useState('')
  const [searchTerm,    setSearchTerm]    = useState('')
  const [bulkSelected,  setBulkSelected]  = useState(new Set())
  const [bulkLoading,   setBulkLoading]   = useState(false)

  const fetchRequests = useCallback(() => {
    setLoading(true)
    const params = {}
    if (statusFilter) params.status = statusFilter
    leaveApi.list(params)
      .then(data => setRequests(safeArr(data)))
      .catch(err => toast.error(err?.message || 'Failed to load'))
      .finally(() => setLoading(false))
  }, [statusFilter])

  useEffect(() => { fetchRequests() }, [fetchRequests])

  // Derived: client-side filtered results
  const filtered = useMemo(() => {
    let res = requests
    if (typeFilter) res = res.filter(r => r.leave_type === typeFilter)
    if (searchTerm) {
      const s = searchTerm.toLowerCase()
      res = res.filter(r => r.employee_name?.toLowerCase().includes(s))
    }
    return res
  }, [requests, typeFilter, searchTerm])

  // Stats
  const pending  = requests.filter(r => r.status === 'pending').length
  const approved = requests.filter(r => r.status === 'approved').length
  const rejected = requests.filter(r => r.status === 'rejected').length
  const totalDays = requests.filter(r => r.status === 'approved').reduce((s, r) => s + calcDays(r.start_date, r.end_date), 0)

  const pendingRequests = filtered.filter(r => r.status === 'pending')

  const handleApprove = async (id) => {
    setActionLoading(id)
    try { await leaveApi.update(id, { status: 'approved' }); toast.success('Approved ✓'); fetchRequests() }
    catch (err) { toast.error(err?.message || 'Failed') }
    finally { setActionLoading(null) }
  }

  // Bulk approve
  const handleBulkApprove = async () => {
    if (bulkSelected.size === 0) return
    setBulkLoading(true)
    let successCount = 0
    for (const id of bulkSelected) {
      try { await leaveApi.update(id, { status: 'approved' }); successCount++ }
      catch { /* skip */ }
    }
    toast.success(`Approved ${successCount} request${successCount !== 1 ? 's' : ''}`)
    setBulkSelected(new Set())
    setBulkLoading(false)
    fetchRequests()
  }

  const toggleSelect = (id) => {
    setBulkSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  const toggleSelectAll = () => {
    if (bulkSelected.size === pendingRequests.length) setBulkSelected(new Set())
    else setBulkSelected(new Set(pendingRequests.map(r => r.id)))
  }

  const clearFilters = () => { setStatusFilter(''); setTypeFilter(''); setSearchTerm('') }
  const hasFilters = statusFilter || typeFilter || searchTerm

  return (
    <div className="space-y-5 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-50">Leave Management</h1>
          <p className="text-ink-400 text-sm mt-0.5">
            {loading ? 'Loading…' : `${requests.length} requests · ${pending} pending approval`}
          </p>
        </div>
        <button onClick={() => { setEditRequest(null); setModalOpen(true) }} className="btn-primary">
          <Plus size={16} /> New Request
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Calendar}    label="Total Requests" value={requests.length} color="accent" />
        <StatCard icon={Clock}       label="Pending"        value={pending}   sub={pending > 0 ? 'Needs action' : 'All clear'} color="amber" />
        <StatCard icon={CheckCircle} label="Approved"       value={approved}  sub={`${totalDays} total days`} color="jade" />
        <StatCard icon={XCircle}     label="Rejected"       value={rejected}  color="coral" />
      </div>

      {/* Pending review alert */}
      {pending > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-amber/25 bg-amber/8 text-sm">
          <AlertTriangle size={16} className="text-amber flex-shrink-0" />
          <span className="text-amber font-medium">{pending} leave request{pending !== 1 ? 's' : ''} waiting for approval</span>
          <button onClick={() => setStatusFilter('pending')} className="ml-auto text-xs text-amber underline">View pending</button>
        </div>
      )}

      {/* Filters + Bulk actions */}
      <div className="card p-3 flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative min-w-40 flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
          <input className="input-field pl-8 py-2 text-sm" placeholder="Search employee…"
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>

        {/* Status filter */}
        {['', 'pending', 'approved', 'rejected'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${statusFilter === s ? 'bg-accent text-white shadow-sm' : 'bg-ink-800 text-ink-400 hover:bg-ink-700 hover:text-ink-200'}`}>
            {s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All'}
          </button>
        ))}

        {/* Type filter */}
        <div className="relative">
          <select className="input-field py-1.5 pr-8 text-xs appearance-none"
            value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="">All Types</option>
            {LEAVE_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-500 pointer-events-none" />
        </div>

        {hasFilters && (
          <button onClick={clearFilters} className="text-xs text-ink-500 hover:text-ink-200 flex items-center gap-1">
            <X size={12} /> Clear
          </button>
        )}

        {/* Bulk approve */}
        {bulkSelected.size > 0 && (
          <button onClick={handleBulkApprove} disabled={bulkLoading}
            className="ml-auto px-3 py-1.5 rounded-lg text-xs font-medium bg-jade/15 text-jade border border-jade/25 hover:bg-jade/25 transition-colors flex items-center gap-1.5">
            {bulkLoading ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
            Approve {bulkSelected.size} selected
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead className="bg-ink-900/60">
            <tr>
              {/* Bulk select header */}
              <th className="table-header w-10">
                <input type="checkbox"
                  checked={pendingRequests.length > 0 && bulkSelected.size === pendingRequests.length}
                  onChange={toggleSelectAll}
                  className="rounded border-ink-600 text-accent"
                  disabled={pendingRequests.length === 0} />
              </th>
              {['Employee', 'Type', 'Duration', 'Days', 'Reason', 'Status', 'Applied', 'Actions'].map(h => (
                <th key={h} className="table-header">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="py-16 text-center"><Loader2 size={28} className="animate-spin text-ink-500 mx-auto" /></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={9}>
                <EmptyState icon={BookOpen}
                  title="No leave requests"
                  message={hasFilters ? 'No requests match your filter. Try clearing it.' : 'No leave requests submitted yet.'}
                  actionLabel={hasFilters ? 'Clear Filters' : 'New Request'}
                  onAction={hasFilters ? clearFilters : () => setModalOpen(true)} />
              </td></tr>
            ) : filtered.map(r => {
              const days = calcDays(r.start_date, r.end_date)
              const isActioning = actionLoading === r.id
              const SIcon = STATUS_ICON[r.status]
              return (
                <tr key={r.id} className={`table-row ${bulkSelected.has(r.id) ? 'bg-accent/5' : ''}`}>
                  <td className="table-cell">
                    {r.status === 'pending' && (
                      <input type="checkbox" checked={bulkSelected.has(r.id)} onChange={() => toggleSelect(r.id)}
                        className="rounded border-ink-600" />
                    )}
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-accent/25 to-jade/15 border border-accent/20 flex items-center justify-center text-xs font-semibold text-accent-light flex-shrink-0">
                        {r.employee_name?.[0] || '?'}
                      </div>
                      <span className="text-ink-200 text-sm font-medium">{r.employee_name || '—'}</span>
                    </div>
                  </td>
                  <td className="table-cell"><LeaveTypeBadge type={r.leave_type} /></td>
                  <td className="table-cell text-xs font-mono text-ink-300 whitespace-nowrap">
                    {fmtShort(r.start_date)} → {fmtShort(r.end_date)}
                  </td>
                  <td className="table-cell">
                    <span className="font-mono text-sm font-semibold text-ink-200">{days}</span>
                    <span className="text-ink-500 text-xs ml-0.5">d</span>
                  </td>
                  <td className="table-cell text-ink-500 text-xs max-w-[130px] truncate" title={r.reason}>
                    {r.reason || <span className="italic text-ink-700">No reason</span>}
                  </td>
                  <td className="table-cell">
                    <span className={`${STATUS_CLASS[r.status] || 'badge'} whitespace-nowrap flex items-center gap-1`}>
                      {SIcon && <SIcon size={10} />} {r.status}
                    </span>
                  </td>
                  <td className="table-cell text-xs text-ink-500 whitespace-nowrap">
                    {r.created_at ? fmtDate(r.created_at.split('T')[0]) : '—'}
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-1">
                      {r.status === 'pending' && (
                        isActioning ? (
                          <Loader2 size={14} className="animate-spin text-ink-500" />
                        ) : (
                          <>
                            <button onClick={() => handleApprove(r.id)} title="Approve"
                              className="p-1.5 text-jade hover:bg-jade/10 rounded-lg transition-colors">
                              <Check size={13} />
                            </button>
                            <button onClick={() => setRejectTarget(r)} title="Reject"
                              className="p-1.5 text-coral hover:bg-coral/10 rounded-lg transition-colors">
                              <X size={13} />
                            </button>
                          </>
                        )
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* Table footer summary */}
        {filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-ink-800/50 flex items-center justify-between text-xs text-ink-500">
            <span>Showing {filtered.length} of {requests.length} requests</span>
            <span>{filtered.filter(r => r.status === 'approved').reduce((s, r) => s + calcDays(r.start_date, r.end_date), 0)} approved days in view</span>
          </div>
        )}
      </div>

      {/* Modals */}
      {modalOpen && (
        <LeaveModal
          editRequest={editRequest}
          onClose={() => { setModalOpen(false); setEditRequest(null) }}
          onSaved={() => { setModalOpen(false); setEditRequest(null); fetchRequests() }} />
      )}
      {rejectTarget && (
        <RejectModal
          request={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onRejected={() => { setRejectTarget(null); fetchRequests() }} />
      )}
    </div>
  )
}
