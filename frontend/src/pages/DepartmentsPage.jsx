import { useEffect, useState } from 'react'
import { departmentApi, employeeApi } from '../api'
import { Plus, Trash2, Building2, Users, X } from 'lucide-react'
import toast from 'react-hot-toast'

function ConfirmDialog({ name, onConfirm, onCancel }) {
  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="bg-ink-900 border border-ink-700/50 rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-fade-up">
        <div className="w-12 h-12 rounded-2xl bg-coral/10 border border-coral/20 flex items-center justify-center mb-4">
          <Trash2 size={20} className="text-coral" />
        </div>
        <h3 className="font-display font-semibold text-ink-100 mb-2">Delete Department?</h3>
        <p className="text-ink-400 text-sm mb-6">
          Delete <strong className="text-ink-200">{name}</strong>? This cannot be undone.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button onClick={onConfirm} className="btn-danger flex-1 justify-center">Delete</button>
        </div>
      </div>
    </div>
  )
}

function AddDeptModal({ onClose, onSaved, employees }) {
  const [form, setForm] = useState({ name: '', code: '', description: '', head_employee_id: '' })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return }
    setSaving(true)
    try {
      const payload = { name: form.name.trim() }
      if (form.code.trim()) payload.code = form.code.trim()
      if (form.description.trim()) payload.description = form.description.trim()
      if (form.head_employee_id) payload.head_employee_id = parseInt(form.head_employee_id)
      await departmentApi.create(payload)
      toast.success('Department created')
      onSaved()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create')
    } finally { setSaving(false) }
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-ink-900 border border-ink-700/50 rounded-2xl w-full max-w-md p-6 animate-fade-up space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-semibold text-ink-100">New Department</h2>
          <button onClick={onClose} className="p-2 text-ink-500 hover:text-ink-200 hover:bg-ink-800 rounded-xl transition-colors"><X size={15} /></button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Name *</label>
            <input className="input-field" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Engineering" />
          </div>
          <div>
            <label className="label">Code</label>
            <input className="input-field" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="ENG" />
          </div>
        </div>
        <div>
          <label className="label">Head of Department</label>
          <select className="input-field" value={form.head_employee_id} onChange={e => setForm(f => ({ ...f, head_employee_id: e.target.value }))}>
            <option value="">Select employee…</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Description</label>
          <textarea className="input-field resize-none" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 justify-center">
            {saving ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}

const GRADIENT_MAP = [
  'from-accent/20 to-accent/5', 'from-jade/20 to-jade/5',
  'from-amber/20 to-amber/5',  'from-coral/20 to-coral/5',
  'from-accent/15 to-jade/5',  'from-amber/15 to-coral/5',
]

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [dRes, eRes] = await Promise.all([
        departmentApi.list(),
        employeeApi.list({ limit: 200, status: 'Active' }),
      ])
      setDepartments(dRes.data.departments)
      setEmployees(eRes.data.employees)
    } catch { toast.error('Failed to load departments') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchAll() }, [])

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await departmentApi.delete(deleteTarget.id)
      toast.success('Department deleted')
      setDeleteTarget(null)
      fetchAll()
    } catch { toast.error('Failed to delete') }
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-50">Departments</h1>
          <p className="text-ink-400 text-sm mt-0.5">{departments.length} departments</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn-primary">
          <Plus size={16} /> Add Department
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(6).fill(0).map((_, i) => <div key={i} className="card p-5 h-36 skeleton animate-pulse" />)}
        </div>
      ) : departments.length === 0 ? (
        <div className="card p-16 text-center">
          <Building2 size={40} className="text-ink-700 mx-auto mb-4" />
          <p className="text-ink-500 text-sm">No departments yet</p>
          <p className="text-ink-600 text-xs mt-1">Add your first department to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map((dept, i) => {
            const head = employees.find(e => e.id === dept.head_employee_id)
            return (
              <div key={dept.id} className="card p-5 group hover:border-ink-600/70 transition-colors relative">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${GRADIENT_MAP[i % GRADIENT_MAP.length]} border border-white/5 flex items-center justify-center mb-4`}>
                  <Building2 size={18} className="text-ink-300" />
                </div>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display font-semibold text-ink-100">{dept.name}</h3>
                    {dept.code && (
                      <span className="text-xs font-mono text-ink-500 bg-ink-800 px-2 py-0.5 rounded mt-1 inline-block">{dept.code}</span>
                    )}
                  </div>
                  <button
                    onClick={() => setDeleteTarget(dept)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-ink-600 hover:text-coral hover:bg-coral/10 rounded-lg transition-all flex-shrink-0"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
                {dept.description && (
                  <p className="text-ink-500 text-xs mt-2 line-clamp-2">{dept.description}</p>
                )}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-ink-800/50">
                  <div className="flex items-center gap-1.5 text-ink-400 text-xs">
                    <Users size={12} />
                    <span>{dept.employee_count || 0} employees</span>
                  </div>
                  {head && (
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center text-accent-light text-xs font-semibold">
                        {head.first_name[0]}
                      </div>
                      <span className="text-xs text-ink-400 truncate max-w-[80px]">{head.first_name} {head.last_name[0]}.</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modalOpen && (
        <AddDeptModal
          employees={employees}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); fetchAll() }}
        />
      )}
      {deleteTarget && (
        <ConfirmDialog
          name={deleteTarget.name}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
