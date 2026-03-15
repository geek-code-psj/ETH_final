import { useEffect, useState, useCallback, useMemo } from 'react'
import { departmentApi, employeeApi } from '../api'
import EmptyState from '../components/EmptyState'
import { Plus, Trash2, Pencil, Building2, Users, X, Loader2, Search, ChevronDown, ChevronRight, Mail, Phone } from 'lucide-react'
import toast from 'react-hot-toast'

// ─── helpers ──────────────────────────────────────────────────────────────────
const safeArr = (v) => (Array.isArray(v) ? v : [])

// ─── Delete confirm ───────────────────────────────────────────────────────────
function ConfirmDialog({ name, onConfirm, onCancel, deleting }) {
  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="bg-ink-900 border border-ink-700/50 rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-fade-up">
        <div className="w-12 h-12 rounded-2xl bg-coral/10 border border-coral/20 flex items-center justify-center mb-4">
          <Trash2 size={20} className="text-coral" />
        </div>
        <h3 className="font-display font-semibold text-ink-100 mb-2">Delete Department?</h3>
        <p className="text-ink-400 text-sm mb-6">
          Delete <strong className="text-ink-200">{name}</strong>? Employees in this department won't be affected, but the department record will be removed.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} disabled={deleting} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button onClick={onConfirm} disabled={deleting} className="btn-danger flex-1 justify-center">
            {deleting ? <><Loader2 size={14} className="animate-spin" /> Deleting…</> : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Create / Edit modal ──────────────────────────────────────────────────────
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
        ...(form.code.trim()        && { code: form.code.trim().toUpperCase() }),
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

  const selectedHead = employees.find(e => e.id === parseInt(form.head_employee_id)) || null

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-ink-900 border border-ink-700/50 rounded-2xl w-full max-w-md p-6 animate-fade-up space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-semibold text-ink-100">{isEdit ? 'Edit Department' : 'New Department'}</h2>
          <button onClick={onClose} className="p-2 text-ink-500 hover:text-ink-200 hover:bg-ink-800 rounded-xl transition-colors"><X size={15} /></button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Name *</label>
            <input className="input-field" value={form.name} onChange={set('name')} placeholder="Engineering" autoFocus />
          </div>
          <div>
            <label className="label">Code</label>
            <input className="input-field uppercase" value={form.code} onChange={set('code')} placeholder="ENG" maxLength={8} />
          </div>
        </div>

        <div>
          <label className="label">Head of Department</label>
          <select className="input-field" value={form.head_employee_id} onChange={set('head_employee_id')}>
            <option value="">— None / Not assigned —</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name} · {e.position || 'No position'}</option>)}
          </select>
          {selectedHead && (
            <p className="text-xs text-ink-500 mt-1 flex items-center gap-1">
              <Mail size={11} /> {selectedHead.email}
            </p>
          )}
        </div>

        <div>
          <label className="label">Description</label>
          <textarea className="input-field resize-none" rows={3} value={form.description}
            placeholder="What does this department do? Goals and responsibilities…" onChange={set('description')} />
          <p className="text-xs text-ink-600 mt-1 text-right">{form.description.length}/500</p>
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

// ─── Expandable member list ───────────────────────────────────────────────────
function DeptMembers({ deptName, employees }) {
  const [open, setOpen] = useState(false)
  const members = useMemo(() => employees.filter(e => e.department === deptName), [employees, deptName])
  if (members.length === 0) return null
  return (
    <div className="mt-2">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-xs text-ink-500 hover:text-ink-300 transition-colors">
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        {open ? 'Hide' : 'Show'} {members.length} member{members.length !== 1 ? 's' : ''}
      </button>
      {open && (
        <div className="mt-2 space-y-1.5 max-h-36 overflow-y-auto pr-1">
          {members.slice(0, 15).map(m => (
            <div key={m.id} className="flex items-center gap-2 bg-ink-800/40 rounded-lg px-2 py-1.5">
              <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center text-accent-light text-xs font-semibold flex-shrink-0">
                {m.first_name?.[0]}
              </div>
              <div className="min-w-0">
                <p className="text-xs text-ink-200 truncate">{m.first_name} {m.last_name}</p>
                <p className="text-xs text-ink-500 truncate">{m.position || '—'}</p>
              </div>
              <span className={`ml-auto flex-shrink-0 text-xs ${m.status === 'Active' ? 'text-jade' : 'text-ink-500'}`}>
                {m.status === 'Active' ? '●' : '○'}
              </span>
            </div>
          ))}
          {members.length > 15 && (
            <p className="text-xs text-ink-600 text-center py-1">+{members.length - 15} more</p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Gradient map ─────────────────────────────────────────────────────────────
const GRADIENTS = [
  'from-accent/20 to-accent/5',  'from-jade/20 to-jade/5',
  'from-amber/20 to-amber/5',    'from-coral/20 to-coral/5',
  'from-accent/15 to-jade/5',    'from-amber/15 to-coral/5',
]

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DepartmentsPage() {
  const [departments,  setDepartments]  = useState([])
  const [employees,    setEmployees]    = useState([])
  const [loading,      setLoading]      = useState(true)
  const [deleting,     setDeleting]     = useState(false)
  const [search,       setSearch]       = useState('')
  // modalDept: undefined=closed, null=new, object=edit
  const [modalDept,    setModalDept]    = useState(undefined)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [view,         setView]         = useState('grid') // grid | list

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [dRes, eRes] = await Promise.all([
        departmentApi.list(),
        employeeApi.list({ limit: 500 }),
      ])
      setDepartments(safeArr(dRes?.departments))
      setEmployees(safeArr(eRes?.employees))
    } catch (err) {
      toast.error(err?.message || 'Failed to load')
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

  // Filtered departments
  const filtered = useMemo(() => {
    if (!search) return departments
    const s = search.toLowerCase()
    return departments.filter(d => d.name.toLowerCase().includes(s) || d.code?.toLowerCase().includes(s))
  }, [departments, search])

  // Stats
  const totalEmployees = employees.filter(e => e.status === 'Active').length
  const deptWithHead   = departments.filter(d => d.head_employee_id).length
  const largestDept    = departments.reduce((max, d) => (d.employee_count || 0) > (max.employee_count || 0) ? d : max, {})

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-50">Departments</h1>
          <p className="text-ink-400 text-sm mt-0.5">
            {loading ? 'Loading…' : `${departments.length} departments · ${totalEmployees} active employees`}
          </p>
        </div>
        <button onClick={() => setModalDept(null)} className="btn-primary">
          <Plus size={16} /> Add Department
        </button>
      </div>

      {/* Summary stats */}
      {!loading && departments.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total Departments', value: departments.length, sub: `${deptWithHead} with a dept head` },
            { label: 'Total Employees',   value: totalEmployees, sub: 'Active employees' },
            { label: 'Largest Dept',      value: largestDept?.name || '—', sub: `${largestDept?.employee_count || 0} members` },
          ].map(s => (
            <div key={s.label} className="card p-3">
              <p className="text-2xl font-display font-bold text-ink-100">{s.value}</p>
              <p className="text-xs text-ink-400 mt-0.5">{s.label}</p>
              <p className="text-xs text-ink-600 mt-1">{s.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Search + view toggle */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
          <input className="input-field pl-8 py-2 text-sm" placeholder="Search departments…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <div className="flex gap-1 bg-ink-900 border border-ink-800 rounded-xl p-1 ml-auto">
          {['grid', 'list'].map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${view === v ? 'bg-ink-700 text-ink-100' : 'text-ink-500 hover:text-ink-300'}`}>
              {v === 'grid' ? '⊞ Grid' : '≡ List'}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card p-5 h-52 animate-pulse bg-ink-800/40" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Building2}
          title={search ? 'No departments match' : 'No departments yet'}
          message={search ? 'Try a different search term.' : 'Organize your workforce by creating departments.'}
          actionLabel={search ? 'Clear Search' : 'Add Department'}
          onAction={search ? () => setSearch('') : () => setModalDept(null)} />
      ) : view === 'grid' ? (
        /* ── Grid View ── */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((dept, i) => {
            const head = employees.find(e => e.id === dept.head_employee_id) || null
            const activeCount = employees.filter(e => e.department === dept.name && e.status === 'Active').length
            return (
              <div key={dept.id} className="card p-5 group hover:border-ink-600/70 transition-all duration-200">
                {/* Icon + actions */}
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${GRADIENTS[i % GRADIENTS.length]} border border-white/5 flex items-center justify-center`}>
                    <Building2 size={18} className="text-ink-300" />
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
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

                {/* Name */}
                <h3 className="font-display font-semibold text-ink-100 truncate">{dept.name}</h3>
                {dept.code && (
                  <span className="text-xs font-mono text-ink-500 bg-ink-800 px-2 py-0.5 rounded mt-1 inline-block">{dept.code}</span>
                )}
                {dept.description && (
                  <p className="text-ink-500 text-xs mt-2 line-clamp-2">{dept.description}</p>
                )}

                {/* Head info */}
                {head && (
                  <div className="flex items-center gap-2 mt-3 px-2.5 py-2 rounded-lg bg-ink-800/40">
                    <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-accent-light text-xs font-semibold flex-shrink-0">
                      {head.first_name?.[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-ink-300 font-medium truncate">{head.first_name} {head.last_name}</p>
                      <p className="text-xs text-ink-600 truncate">Head of Dept</p>
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-ink-800/50">
                  <div className="flex items-center gap-1.5 text-ink-400 text-xs">
                    <Users size={12} />
                    <span>{activeCount} active</span>
                    {dept.employee_count > activeCount && (
                      <span className="text-ink-600">/ {dept.employee_count} total</span>
                    )}
                  </div>
                  {!dept.is_active && (
                    <span className="text-xs text-amber font-medium">Inactive</span>
                  )}
                </div>

                {/* Expandable members list */}
                <DeptMembers deptName={dept.name} employees={employees} />
              </div>
            )
          })}
        </div>
      ) : (
        /* ── List View ── */
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-ink-900/60">
              <tr>
                {['Department', 'Code', 'Head', 'Employees', 'Description', 'Actions'].map(h => (
                  <th key={h} className="table-header">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((dept, i) => {
                const head = employees.find(e => e.id === dept.head_employee_id) || null
                const activeCount = employees.filter(e => e.department === dept.name && e.status === 'Active').length
                return (
                  <tr key={dept.id} className="table-row group">
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${GRADIENTS[i % GRADIENTS.length]} border border-white/5 flex items-center justify-center flex-shrink-0`}>
                          <Building2 size={13} className="text-ink-300" />
                        </div>
                        <span className="font-medium text-ink-100 text-sm">{dept.name}</span>
                      </div>
                    </td>
                    <td className="table-cell">
                      {dept.code ? <span className="font-mono text-xs text-ink-400 bg-ink-800 px-2 py-0.5 rounded">{dept.code}</span> : <span className="text-ink-700">—</span>}
                    </td>
                    <td className="table-cell text-sm text-ink-300">
                      {head ? `${head.first_name} ${head.last_name}` : <span className="text-ink-700">Not assigned</span>}
                    </td>
                    <td className="table-cell">
                      <span className="text-sm font-mono text-ink-200">{activeCount}</span>
                      <span className="text-xs text-ink-600 ml-1">active</span>
                    </td>
                    <td className="table-cell text-xs text-ink-500 max-w-[160px] truncate">{dept.description || '—'}</td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => setModalDept(dept)} title="Edit"
                          className="p-1.5 text-ink-500 hover:text-accent-light hover:bg-accent/10 rounded-lg transition-colors">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => setDeleteTarget(dept)} title="Delete"
                          className="p-1.5 text-ink-600 hover:text-coral hover:bg-coral/10 rounded-lg transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {modalDept !== undefined && (
        <DeptModal dept={modalDept} employees={employees}
          onClose={() => setModalDept(undefined)}
          onSaved={() => { setModalDept(undefined); fetchAll() }} />
      )}
      {deleteTarget && (
        <ConfirmDialog name={deleteTarget.name} deleting={deleting}
          onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
      )}
    </div>
  )
}
