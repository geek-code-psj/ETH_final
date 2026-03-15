import { useEffect, useState, useCallback } from 'react'
import { departmentApi, employeeApi } from '../api'
import EmptyState from '../components/EmptyState'
import { Plus, Trash2, Pencil, Building2, Users, X, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

// ─── helpers ──────────────────────────────────────────────────────────────────
const safeArr = (v) => (Array.isArray(v) ? v : [])

// ─── Confirm Delete Dialog ────────────────────────────────────────────────────
function ConfirmDialog({ name, onConfirm, onCancel, deleting }) {
  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="bg-ink-900 border border-ink-700/50 rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-fade-up">
        <div className="w-12 h-12 rounded-2xl bg-coral/10 border border-coral/20 flex items-center justify-center mb-4">
          <Trash2 size={20} className="text-coral" />
        </div>
        <h3 className="font-display font-semibold text-ink-100 mb-2">Delete Department?</h3>
        <p className="text-ink-400 text-sm mb-6">
          Delete <strong className="text-ink-200">{name}</strong>? All employee links will stay, but the department will be removed. This cannot be undone.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="btn-secondary flex-1 justify-center" disabled={deleting}>
            Cancel
          </button>
          <button onClick={onConfirm} disabled={deleting} className="btn-danger flex-1 justify-center">
            {deleting ? <><Loader2 size={14} className="animate-spin" /> Deleting…</> : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Dept Edit/Create Modal ───────────────────────────────────────────────────
function DeptModal({ dept, employees, onClose, onSaved }) {
  const isEdit = !!dept
  const [form, setForm] = useState({
    name:             dept?.name             || '',
    code:             dept?.code             || '',
    description:      dept?.description      || '',
    head_employee_id: dept?.head_employee_id ?? '',
  })
  const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Department name is required'); return }
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        ...(form.code.trim()        && { code: form.code.trim() }),
        ...(form.description.trim() && { description: form.description.trim() }),
        ...(form.head_employee_id   && { head_employee_id: parseInt(form.head_employee_id) }),
      }
      if (isEdit) {
        await departmentApi.update(dept.id, payload)
        toast.success('Department updated')
      } else {
        await departmentApi.create(payload)
        toast.success('Department created')
      }
      onSaved()
    } catch (err) {
      toast.error(err?.message || 'Operation failed')
    } finally { setSaving(false) }
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-ink-900 border border-ink-700/50 rounded-2xl w-full max-w-md p-6 animate-fade-up space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-semibold text-ink-100">
            {isEdit ? 'Edit Department' : 'New Department'}
          </h2>
          <button onClick={onClose}
            className="p-2 text-ink-500 hover:text-ink-200 hover:bg-ink-800 rounded-xl transition-colors">
            <X size={15} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Name *</label>
            <input className="input-field" value={form.name} onChange={set('name')} placeholder="Engineering" />
          </div>
          <div>
            <label className="label">Code</label>
            <input className="input-field" value={form.code} onChange={set('code')} placeholder="ENG" maxLength={10} />
          </div>
        </div>

        <div>
          <label className="label">Head of Department</label>
          <select className="input-field" value={form.head_employee_id} onChange={set('head_employee_id')}>
            <option value="">None / Not assigned</option>
            {employees.map(e => (
              <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Description</label>
          <textarea className="input-field resize-none" rows={3} value={form.description}
            placeholder="Short description of what this department does…"
            onChange={set('description')} />
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center" disabled={saving}>Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 justify-center">
            {saving
              ? <><Loader2 size={14} className="animate-spin" /> {isEdit ? 'Saving…' : 'Creating…'}</>
              : isEdit ? 'Save Changes' : 'Create Department'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Gradient palette for dept cards ─────────────────────────────────────────
const GRADIENTS = [
  'from-accent/20 to-accent/5',  'from-jade/20 to-jade/5',
  'from-amber/20 to-amber/5',    'from-coral/20 to-coral/5',
  'from-accent/15 to-jade/5',    'from-amber/15 to-coral/5',
]

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DepartmentsPage() {
  const [departments, setDepartments] = useState([])
  const [employees,   setEmployees]   = useState([])
  const [loading,     setLoading]     = useState(true)
  const [deleting,    setDeleting]    = useState(false)
  // modalDept: undefined = closed | null = new | object = edit
  const [modalDept,     setModalDept]     = useState(undefined)
  const [deleteTarget,  setDeleteTarget]  = useState(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [dRes, eRes] = await Promise.all([
        departmentApi.list(),
        employeeApi.list({ limit: 500, status: 'Active' }),
      ])
      setDepartments(safeArr(dRes?.departments))
      setEmployees(safeArr(eRes?.employees))
    } catch (err) {
      toast.error(err?.message || 'Failed to load departments')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await departmentApi.delete(deleteTarget.id)
      toast.success('Department deleted')
      setDeleteTarget(null)
      fetchAll()
    } catch (err) {
      toast.error(err?.message || 'Failed to delete')
    } finally { setDeleting(false) }
  }

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-50">Departments</h1>
          <p className="text-ink-400 text-sm mt-0.5">
            {loading ? 'Loading…' : `${departments.length} department${departments.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button onClick={() => setModalDept(null)} className="btn-primary">
          <Plus size={16} /> Add Department
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card p-5 h-44 animate-pulse bg-ink-800/40" />
          ))}
        </div>
      ) : departments.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No departments yet"
          message="Organize your workforce by creating departments."
          actionLabel="Add Department"
          onAction={() => setModalDept(null)}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map((dept, i) => {
            const head = employees.find(e => e.id === dept.head_employee_id) || null
            return (
              <div key={dept.id} className="card p-5 group hover:border-ink-600/70 transition-all duration-200 relative">
                {/* Icon */}
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${GRADIENTS[i % GRADIENTS.length]} border border-white/5 flex items-center justify-center mb-4`}>
                  <Building2 size={18} className="text-ink-300" />
                </div>

                {/* Name + Actions */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display font-semibold text-ink-100 truncate">{dept.name}</h3>
                    {dept.code && (
                      <span className="text-xs font-mono text-ink-500 bg-ink-800 px-2 py-0.5 rounded mt-1 inline-block">
                        {dept.code}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                    <button onClick={() => setModalDept(dept)} title="Edit"
                      className="p-1.5 text-ink-500 hover:text-accent-light hover:bg-accent/10 rounded-lg transition-colors">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => setDeleteTarget(dept)} title="Delete"
                      className="p-1.5 text-ink-600 hover:text-coral hover:bg-coral/10 rounded-lg transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Description */}
                {dept.description && (
                  <p className="text-ink-500 text-xs mt-2 line-clamp-2">{dept.description}</p>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-ink-800/50">
                  <div className="flex items-center gap-1.5 text-ink-400 text-xs">
                    <Users size={12} />
                    <span>{dept.employee_count ?? 0} employees</span>
                  </div>
                  {head && (
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center text-accent-light text-xs font-semibold">
                        {head.first_name?.[0] || '?'}
                      </div>
                      <span className="text-xs text-ink-400 truncate max-w-[80px]">
                        {head.first_name} {head.last_name?.[0]}.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modals */}
      {modalDept !== undefined && (
        <DeptModal
          dept={modalDept}
          employees={employees}
          onClose={() => setModalDept(undefined)}
          onSaved={() => { setModalDept(undefined); fetchAll() }}
        />
      )}
      {deleteTarget && (
        <ConfirmDialog
          name={deleteTarget.name}
          deleting={deleting}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
