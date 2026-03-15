import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { employeeApi } from '../api'
import EmployeeModal from '../components/EmployeeModal'
import EmptyState from '../components/EmptyState'
import { SkeletonRows } from '../components/SkeletonTable'
import { Plus, Search, Pencil, Trash2, ChevronLeft, ChevronRight,
         Users, ChevronUp, ChevronDown, Eye } from 'lucide-react'
import toast from 'react-hot-toast'

const DEPARTMENTS = ['','Engineering','HR','Finance','Marketing','Operations','Sales','Design','Legal']
const STATUSES = ['','Active','Inactive','On Leave']

const STATUS_DOT = {
  Active: 'w-1.5 h-1.5 rounded-full bg-jade',
  Inactive: 'w-1.5 h-1.5 rounded-full bg-ink-500',
  'On Leave': 'w-1.5 h-1.5 rounded-full bg-amber',
}

function ConfirmDialog({ name, onConfirm, onCancel }) {
  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="card-solid w-full max-w-sm p-6 shadow-2xl animate-fade-up">
        <div className="w-12 h-12 rounded-2xl bg-coral/10 border border-coral/20 flex items-center justify-center mb-4">
          <Trash2 size={20} className="text-coral" />
        </div>
        <h3 className="font-display font-semibold text-ink-100 mb-2">Delete Employee?</h3>
        <p className="text-ink-400 text-sm mb-6">
          This permanently deletes <strong className="text-ink-200">{name}</strong> and all their attendance records.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button onClick={onConfirm} className="btn-danger flex-1 justify-center">Delete</button>
        </div>
      </div>
    </div>
  )
}

function SortIcon({ col, sortBy, sortDir }) {
  if (sortBy !== col) return <ChevronUp size={12} className="text-ink-700" />
  return sortDir === 'asc'
    ? <ChevronUp size={12} className="text-accent-light" />
    : <ChevronDown size={12} className="text-accent-light" />
}

export default function EmployeesPage() {
  const navigate = useNavigate()
  const [employees, setEmployees] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [department, setDepartment] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(0)
  const [sortBy, setSortBy] = useState('created_at')
  const [sortDir, setSortDir] = useState('desc')
  const [modalOpen, setModalOpen] = useState(false)
  const [editEmployee, setEditEmployee] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [allEmployees, setAllEmployees] = useState([])
  const searchTimer = useRef(null)
  const LIMIT = 15

  // Debounce search
  useEffect(() => {
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => { setDebouncedSearch(search); setPage(0) }, 350)
    return () => clearTimeout(searchTimer.current)
  }, [search])

  useEffect(() => { setPage(0) }, [department, status, sortBy, sortDir])

  useEffect(() => {
    employeeApi.list({ limit: 200 }).then(r => setAllEmployees(r.employees)).catch(() => {})
  }, [])

  const fetchEmployees = useCallback(async () => {
    setLoading(true)
    try {
      const params = { skip: page * LIMIT, limit: LIMIT, sort_by: sortBy, sort_dir: sortDir }
      if (debouncedSearch) params.search = debouncedSearch
      if (department) params.department = department
      if (status) params.status = status
      const res = await employeeApi.list(params)
      setEmployees(res.employees)
      setTotal(res.total)
    } catch (err) { toast.error(err.message || 'Failed to load employees') }
    finally { setLoading(false) }
  }, [page, debouncedSearch, department, status, sortBy, sortDir])

  useEffect(() => { fetchEmployees() }, [fetchEmployees])

  const handleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('asc') }
  }

  const handleSave = async (formData) => {
    try {
      if (editEmployee) {
        await employeeApi.update(editEmployee.id, formData)
        toast.success('Employee updated successfully')
      } else {
        await employeeApi.create(formData)
        toast.success('Employee added successfully')
      }
      setModalOpen(false); setEditEmployee(null); fetchEmployees()
    } catch (err) {
      toast.error(err.message)
      throw err
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await employeeApi.delete(deleteTarget.id)
      toast.success('Employee deleted')
      setDeleteTarget(null); fetchEmployees()
    } catch { toast.error('Failed to delete employee') }
  }

  const totalPages = Math.ceil(total / LIMIT)

  const COLS = [
    { key: 'name', label: 'Employee', sortKey: 'name' },
    { key: 'department', label: 'Department', sortKey: 'department' },
    { key: 'position', label: 'Position', sortKey: null },
    { key: 'hire_date', label: 'Hire Date', sortKey: 'hire_date' },
    { key: 'salary', label: 'Salary', sortKey: 'salary' },
    { key: 'status', label: 'Status', sortKey: 'status' },
    { key: 'actions', label: '', sortKey: null },
  ]

  return (
    <div className="space-y-5 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-50">Employees</h1>
          <p className="text-ink-400 text-sm mt-0.5">{total} total records</p>
        </div>
        <button onClick={() => { setEditEmployee(null); setModalOpen(true) }} className="btn-primary">
          <Plus size={16} /> <span className="hidden sm:inline">Add Employee</span>
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-40">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
            <input className="input-field pl-9" placeholder="Search name, email, ID…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="input-field w-40" value={department} onChange={e => setDepartment(e.target.value)}>
            {DEPARTMENTS.map(d => <option key={d} value={d}>{d || 'All Departments'}</option>)}
          </select>
          <select className="input-field w-36" value={status} onChange={e => setStatus(e.target.value)}>
            {STATUSES.map(s => <option key={s} value={s}>{s || 'All Statuses'}</option>)}
          </select>
          {(search || department || status) && (
            <button onClick={() => { setSearch(''); setDepartment(''); setStatus('') }} className="btn-ghost">
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="table-mobile-scroll">
          <table className="w-full">
            <thead className="bg-ink-900/60">
              <tr>
                {COLS.map(col => (
                  <th key={col.key}
                    className={col.sortKey ? 'table-header-sortable' : 'table-header'}
                    onClick={() => col.sortKey && handleSort(col.sortKey)}
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      {col.sortKey && <SortIcon col={col.sortKey} sortBy={sortBy} sortDir={sortDir} />}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonRows cols={7} rows={8} />
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState 
                      icon={Users}
                      title="No employees found"
                      message={debouncedSearch || department || status 
                        ? "No employees match your current filters. Try clear filters?" 
                        : "You haven't added any employees yet."}
                      actionLabel={debouncedSearch || department || status ? "Clear Filters" : "Add Employee"}
                      onAction={() => {
                        if (debouncedSearch || department || status) {
                          setSearch(''); setDepartment(''); setStatus('')
                        } else {
                          setModalOpen(true)
                        }
                      }}
                    />
                  </td>
                </tr>
              ) : employees.map(emp => (
                <tr key={emp.id} className="table-row">
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      {emp.avatar_url ? (
                        <img src={emp.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-ink-700" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent/30 to-jade/20 border border-accent/20 flex items-center justify-center text-xs font-semibold text-accent-light flex-shrink-0">
                          {emp.first_name[0]}{emp.last_name[0]}
                        </div>
                      )}
                      <div>
                        <p className="text-ink-100 font-medium text-sm">{emp.first_name} {emp.last_name}</p>
                        <p className="text-ink-500 text-xs font-mono">{emp.employee_id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="table-cell text-ink-300 text-sm">{emp.department}</td>
                  <td className="table-cell text-ink-300 text-sm">{emp.position}</td>
                  <td className="table-cell text-ink-400 text-xs font-mono">
                    {new Date(emp.hire_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="table-cell">
                    {emp.salary ? <span className="text-ink-300 text-sm font-mono">₹{Number(emp.salary).toLocaleString('en-IN')}</span>
                      : <span className="text-ink-700">—</span>}
                  </td>
                  <td className="table-cell">
                    <span className={emp.status === 'Active' ? 'badge-active' : emp.status === 'On Leave' ? 'badge-leave' : 'badge-inactive'}>
                      <span className={STATUS_DOT[emp.status]} />
                      {emp.status}
                    </span>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => navigate(`/employees/${emp.id}`)}
                        className="p-1.5 text-ink-500 hover:text-ink-200 hover:bg-ink-700/50 rounded-lg transition-colors" title="View profile">
                        <Eye size={13} />
                      </button>
                      <button onClick={() => { setEditEmployee(emp); setModalOpen(true) }}
                        className="p-1.5 text-ink-500 hover:text-accent-light hover:bg-accent/10 rounded-lg transition-colors" title="Edit">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => setDeleteTarget(emp)}
                        className="p-1.5 text-ink-500 hover:text-coral hover:bg-coral/10 rounded-lg transition-colors" title="Delete">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-ink-700/40">
            <p className="text-xs text-ink-500">
              Showing {page * LIMIT + 1}–{Math.min((page + 1) * LIMIT, total)} of {total}
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(0)} disabled={page === 0}
                className="px-2 py-1 text-xs text-ink-400 hover:text-ink-100 hover:bg-ink-800 rounded-lg disabled:opacity-30 transition-colors">«</button>
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                className="p-1.5 text-ink-400 hover:text-ink-100 hover:bg-ink-800 rounded-lg disabled:opacity-30 transition-colors">
                <ChevronLeft size={15} />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = Math.max(0, Math.min(page - 2 + i, totalPages - 1))
                return (
                  <button key={p} onClick={() => setPage(p)}
                    className={`w-7 h-7 text-xs rounded-lg transition-colors ${p === page ? 'bg-accent text-white' : 'text-ink-400 hover:bg-ink-800 hover:text-ink-100'}`}>
                    {p + 1}
                  </button>
                )
              })}
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                className="p-1.5 text-ink-400 hover:text-ink-100 hover:bg-ink-800 rounded-lg disabled:opacity-30 transition-colors">
                <ChevronRight size={15} />
              </button>
              <button onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1}
                className="px-2 py-1 text-xs text-ink-400 hover:text-ink-100 hover:bg-ink-800 rounded-lg disabled:opacity-30 transition-colors">»</button>
            </div>
          </div>
        )}
      </div>

      {modalOpen && (
        <EmployeeModal employee={editEmployee} allEmployees={allEmployees}
          onClose={() => { setModalOpen(false); setEditEmployee(null) }}
          onSave={handleSave} />
      )}
      {deleteTarget && (
        <ConfirmDialog
          name={`${deleteTarget.first_name} ${deleteTarget.last_name}`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)} />
      )}
    </div>
  )
}
