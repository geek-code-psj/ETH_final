import { useEffect, useState, useCallback } from 'react'
import { attendanceApi } from '../api'
import AttendanceModal from '../components/AttendanceModal'
import BulkAttendanceModal from '../components/BulkAttendanceModal'
import { SkeletonRows } from '../components/SkeletonTable'
import { Plus, Users, Pencil, Trash2, ChevronLeft, ChevronRight,
         CalendarCheck, Download, BarChart2 } from 'lucide-react'
import toast from 'react-hot-toast'

const STATUSES = ['','Present','Absent','Late','Half Day','On Leave']
const STATUS_BADGE = { Present:'badge-present', Absent:'badge-absent', Late:'badge-late', 'Half Day':'badge-halfday', 'On Leave':'badge-leave' }

function ConfirmDialog({ onConfirm, onCancel }) {
  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="card-solid w-full max-w-sm p-6 shadow-2xl animate-fade-up">
        <div className="w-12 h-12 rounded-2xl bg-coral/10 border border-coral/20 flex items-center justify-center mb-4"><Trash2 size={20} className="text-coral" /></div>
        <h3 className="font-display font-semibold text-ink-100 mb-2">Delete Record?</h3>
        <p className="text-ink-400 text-sm mb-6">This attendance record will be permanently removed.</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button onClick={onConfirm} className="btn-danger flex-1 justify-center">Delete</button>
        </div>
      </div>
    </div>
  )
}

function MonthlySummaryModal({ onClose }) {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  const fetch = () => {
    setLoading(true)
    attendanceApi.monthlySummary(month, year)
      .then(r => setData(r.data))
      .catch(() => toast.error('Failed to load summary'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetch() }, [month, year])

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="card-solid w-full max-w-3xl max-h-[85vh] flex flex-col animate-fade-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-700/40">
          <h2 className="font-display font-semibold text-ink-100">Monthly Summary</h2>
          <div className="flex items-center gap-3">
            <select className="input-field w-28" value={month} onChange={e => setMonth(parseInt(e.target.value))}>
              {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, i) => <option key={i} value={i+1}>{m}</option>)}
            </select>
            <select className="input-field w-24" value={year} onChange={e => setYear(parseInt(e.target.value))}>
              {[2023,2024,2025,2026].map(y => <option key={y}>{y}</option>)}
            </select>
          </div>
        </div>
        <div className="overflow-auto flex-1">
          {loading ? <div className="flex items-center justify-center py-12"><div className="spinner w-7 h-7" /></div> :
          !data?.summary?.length ? <div className="py-12 text-center text-ink-500 text-sm">No data for this period</div> :
          <table className="w-full">
            <thead className="bg-ink-900/60 sticky top-0">
              <tr>{['Employee','Dept','Present','Absent','Late','Half Day','Leave','Hours','Rate%'].map(h => <th key={h} className="table-header">{h}</th>)}</tr>
            </thead>
            <tbody>
              {data.summary.map(r => (
                <tr key={r.employee_id} className="table-row">
                  <td className="table-cell"><p className="text-ink-200 text-sm">{r.employee_name}</p><p className="text-ink-500 text-xs font-mono">{r.employee_id_code}</p></td>
                  <td className="table-cell text-ink-400 text-xs">{r.department}</td>
                  <td className="table-cell text-jade text-sm">{r.present}</td>
                  <td className="table-cell text-coral text-sm">{r.absent}</td>
                  <td className="table-cell text-amber text-sm">{r.late}</td>
                  <td className="table-cell text-accent-light text-sm">{r.half_day}</td>
                  <td className="table-cell text-ink-400 text-sm">{r.on_leave}</td>
                  <td className="table-cell text-ink-300 text-sm font-mono">{r.total_hours}h</td>
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-ink-700 rounded-full h-1.5 w-16">
                        <div className="bg-jade rounded-full h-1.5" style={{ width: `${r.attendance_rate}%` }} />
                      </div>
                      <span className="text-xs font-mono text-ink-300">{r.attendance_rate}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>}
        </div>
        <div className="px-6 py-4 border-t border-ink-700/40 flex justify-end">
          <button onClick={onClose} className="btn-secondary">Close</button>
        </div>
      </div>
    </div>
  )
}

export default function AttendancePage() {
  const [records, setRecords] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0] })
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0])
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [editRecord, setEditRecord] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const LIMIT = 25

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    try {
      const params = { skip: page * LIMIT, limit: LIMIT }
      if (dateFrom) params.date_from = dateFrom
      if (dateTo) params.date_to = dateTo
      if (statusFilter) params.status = statusFilter
      const res = await attendanceApi.list(params)
      setRecords(res.data.records)
      setTotal(res.data.total)
    } catch { toast.error('Failed to load attendance') }
    finally { setLoading(false) }
  }, [page, dateFrom, dateTo, statusFilter])

  useEffect(() => { fetchRecords() }, [fetchRecords])
  useEffect(() => { setPage(0) }, [dateFrom, dateTo, statusFilter])

  const handleSave = async (data) => {
    try {
      if (editRecord) {
        await attendanceApi.update(editRecord.id, data); toast.success('Record updated')
      } else {
        await attendanceApi.create(data); toast.success('Attendance logged')
      }
      setModalOpen(false); setEditRecord(null); fetchRecords()
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to save'); throw err }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try { await attendanceApi.delete(deleteTarget.id); toast.success('Record deleted'); setDeleteTarget(null); fetchRecords() }
    catch { toast.error('Failed to delete') }
  }

  const handleExport = async (fmt) => {
    try {
      const params = { format: fmt }
      if (dateFrom) params.date_from = dateFrom
      if (dateTo) params.date_to = dateTo
      const res = await attendanceApi.export(params)
      const ext = fmt === 'excel' ? 'xlsx' : 'csv'
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `attendance_${dateFrom}_${dateTo}.${ext}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      toast.success(`Downloaded as ${fmt.toUpperCase()}`)
    } catch {
      toast.error('Export failed')
    }
  }

  const totalPages = Math.ceil(total / LIMIT)
  const fmt = (dt) => dt ? new Date(dt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—'

  return (
    <div className="space-y-5 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-50">Attendance</h1>
          <p className="text-ink-400 text-sm mt-0.5">{total} records</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setSummaryOpen(true)} className="btn-secondary"><BarChart2 size={15} /> Summary</button>
          <div className="relative group">
            <button className="btn-secondary"><Download size={15} /> Export</button>
            <div className="absolute right-0 top-full mt-1 w-32 bg-ink-800 border border-ink-600/50 rounded-xl shadow-xl hidden group-hover:block z-10">
              <button onClick={() => handleExport('csv')} className="w-full text-left px-4 py-2.5 text-sm text-ink-200 hover:bg-ink-700 rounded-t-xl">CSV</button>
              <button onClick={() => handleExport('excel')} className="w-full text-left px-4 py-2.5 text-sm text-ink-200 hover:bg-ink-700 rounded-b-xl">Excel</button>
            </div>
          </div>
          <button onClick={() => setBulkOpen(true)} className="btn-secondary"><Users size={15} /> <span className="hidden sm:inline">Bulk Mark</span></button>
          <button onClick={() => { setEditRecord(null); setModalOpen(true) }} className="btn-primary"><Plus size={15} /> Log</button>
        </div>
      </div>

      <div className="card p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div><label className="label">From</label><input type="date" className="input-field w-36" value={dateFrom} onChange={e => setDateFrom(e.target.value)} /></div>
          <div><label className="label">To</label><input type="date" className="input-field w-36" value={dateTo} onChange={e => setDateTo(e.target.value)} /></div>
          <div>
            <label className="label">Status</label>
            <select className="input-field w-36" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              {STATUSES.map(s => <option key={s} value={s}>{s || 'All'}</option>)}
            </select>
          </div>
          <button onClick={() => { setDateFrom(new Date().toISOString().split('T')[0]); setDateTo(new Date().toISOString().split('T')[0]) }} className="btn-ghost">Today</button>
          <button onClick={() => { const d = new Date(); d.setDate(1); setDateFrom(d.toISOString().split('T')[0]); setDateTo(new Date().toISOString().split('T')[0]); setStatusFilter('') }} className="btn-ghost">Reset</button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="table-mobile-scroll">
          <table className="w-full">
            <thead className="bg-ink-900/60">
              <tr>{['Employee','Date','Check In','Check Out','Hours','Late','Status','Notes',''].map(h => <th key={h} className="table-header">{h}</th>)}</tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonRows cols={9} rows={8} />
              ) : records.length === 0 ? (
                <tr><td colSpan={9} className="py-16 text-center">
                  <CalendarCheck size={36} className="text-ink-700 mx-auto mb-3" />
                  <p className="text-ink-500 text-sm">No records found</p>
                  <p className="text-ink-600 text-xs mt-1">Try adjusting the date range or use Bulk Mark</p>
                </td></tr>
              ) : records.map(r => (
                <tr key={r.id} className="table-row">
                  <td className="table-cell">
                    <p className="text-ink-200 text-sm font-medium">{r.employee_name || `#${r.employee_id}`}</p>
                    {r.employee_department && <p className="text-ink-500 text-xs">{r.employee_department}</p>}
                  </td>
                  <td className="table-cell text-xs font-mono text-ink-300">{new Date(r.date+'T00:00:00').toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</td>
                  <td className="table-cell text-xs font-mono text-ink-300">{fmt(r.check_in)}</td>
                  <td className="table-cell text-xs font-mono text-ink-300">{fmt(r.check_out)}</td>
                  <td className="table-cell text-xs font-mono text-ink-300">{r.hours_worked ? `${r.hours_worked}h` : '—'}</td>
                  <td className="table-cell">
                    {r.is_late ? <span className="text-amber text-xs font-mono">+{r.late_minutes}m</span> : <span className="text-ink-700">—</span>}
                  </td>
                  <td className="table-cell"><span className={STATUS_BADGE[r.status] || 'badge'}>{r.status}</span></td>
                  <td className="table-cell text-xs text-ink-500 max-w-24 truncate">{r.notes || '—'}</td>
                  <td className="table-cell">
                    <div className="flex gap-1.5">
                      <button onClick={() => { setEditRecord(r); setModalOpen(true) }} className="p-1.5 text-ink-500 hover:text-accent-light hover:bg-accent/10 rounded-lg transition-colors"><Pencil size={13} /></button>
                      <button onClick={() => setDeleteTarget(r)} className="p-1.5 text-ink-500 hover:text-coral hover:bg-coral/10 rounded-lg transition-colors"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-ink-700/40">
            <p className="text-xs text-ink-500">{page*LIMIT+1}–{Math.min((page+1)*LIMIT,total)} of {total}</p>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(0,p-1))} disabled={page===0} className="p-1.5 text-ink-400 hover:text-ink-100 hover:bg-ink-800 rounded-lg disabled:opacity-30"><ChevronLeft size={15} /></button>
              <span className="px-3 py-1 text-xs text-ink-400 font-mono">{page+1}/{totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages-1,p+1))} disabled={page>=totalPages-1} className="p-1.5 text-ink-400 hover:text-ink-100 hover:bg-ink-800 rounded-lg disabled:opacity-30"><ChevronRight size={15} /></button>
            </div>
          </div>
        )}
      </div>

      {modalOpen && <AttendanceModal record={editRecord} onClose={() => { setModalOpen(false); setEditRecord(null) }} onSave={handleSave} />}
      {bulkOpen && <BulkAttendanceModal onClose={() => setBulkOpen(false)} onSaved={() => { setBulkOpen(false); fetchRecords() }} />}
      {summaryOpen && <MonthlySummaryModal onClose={() => setSummaryOpen(false)} />}
      {deleteTarget && <ConfirmDialog onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />}
    </div>
  )
}
