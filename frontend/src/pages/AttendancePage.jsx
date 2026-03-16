import { useEffect, useState, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { attendanceApi } from '../api'
import AttendanceModal from '../components/AttendanceModal'
import BulkAttendanceModal from '../components/BulkAttendanceModal'
import EmptyState from '../components/EmptyState'
import { SkeletonRows } from '../components/SkeletonTable'
import { 
  Plus, Users, Pencil, Trash2, ChevronLeft, ChevronRight,
  CalendarCheck, Download, BarChart2, Loader2, CheckCircle, 
  XCircle, Clock, CalendarDays, Search
} from 'lucide-react'
import toast from 'react-hot-toast'

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STATUSES = ['','Present','Absent','Late','Half Day','On Leave']
const STATUS_BADGE = { 
  Present:  'badge-present', 
  Absent:   'badge-absent', 
  Late:     'badge-late', 
  'Half Day':'badge-halfday', 
  'On Leave':'badge-leave' 
}
const safeArr = (v) => (Array.isArray(v) ? v : [])
const fmtTime = (dt) => dt ? new Date(dt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '—'
const fmtDate = (dt) => new Date(dt+'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

// ─── Subcomponents ────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color }) {
  const cls = {
    jade:   'text-jade bg-jade/10 border-jade/20',
    coral:  'text-coral bg-coral/10 border-coral/20',
    amber:  'text-amber bg-amber/10 border-amber/20',
    accent: 'text-accent-light bg-accent/10 border-accent/20',
    ink:    'text-ink-300 bg-ink-800 border-ink-700'
  }[color] || ''
  
  return (
    <div className="card p-4 flex items-center gap-3 w-full">
      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 ${cls}`}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-xs text-ink-400">{label}</p>
        <p className="font-display font-bold text-xl text-ink-100">{value}</p>
        {sub && <p className="text-[11px] text-ink-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function ConfirmDialog({ onConfirm, onCancel, deleting }) {
  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="bg-ink-900 border border-ink-700/50 rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-fade-up">
        <div className="w-12 h-12 rounded-2xl bg-coral/10 border border-coral/20 flex items-center justify-center mb-4">
          <Trash2 size={20} className="text-coral" />
        </div>
        <h3 className="font-display font-semibold text-ink-100 mb-2">Delete Record?</h3>
        <p className="text-ink-400 text-sm mb-6">This attendance record will be permanently removed.</p>
        <div className="flex gap-3">
          <button onClick={onCancel} disabled={deleting} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button onClick={onConfirm} disabled={deleting} className="btn-danger flex-1 justify-center">
            {deleting ? <><Loader2 size={14} className="animate-spin" /> Deleting</> : 'Delete'}
          </button>
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

  const fetch = useCallback(() => {
    setLoading(true)
    attendanceApi.monthlySummary(month, year)
      .then(setData)
      .catch((err) => toast.error(err?.message || 'Failed to load summary'))
      .finally(() => setLoading(false))
  }, [month, year])

  useEffect(() => { fetch() }, [fetch])

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-ink-900 border border-ink-700/50 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col animate-fade-up">
        <div className="flex items-center justify-between px-6 py-5 border-b border-ink-700/40">
          <div>
            <h2 className="font-display font-bold text-xl text-ink-50">Monthly Summary</h2>
            <p className="text-ink-400 text-xs mt-0.5">Aggregated attendance statistics per employee</p>
          </div>
          <div className="flex items-center gap-2 bg-ink-800 p-1.5 rounded-xl border border-ink-700/50">
            <select className="input-field py-1 border-none bg-transparent hover:bg-ink-700 w-28 text-sm" 
              value={month} onChange={e => setMonth(parseInt(e.target.value))}>
              {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, i) => <option key={i} value={i+1}>{m}</option>)}
            </select>
            <div className="w-px h-5 bg-ink-600" />
            <select className="input-field py-1 border-none bg-transparent hover:bg-ink-700 w-20 text-sm pl-2" 
              value={year} onChange={e => setYear(parseInt(e.target.value))}>
              {[2023,2024,2025,2026].map(y => <option key={y}>{y}</option>)}
            </select>
          </div>
        </div>
        
        <div className="overflow-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-20"><Loader2 size={32} className="animate-spin text-ink-500" /></div>
          ) : !data?.summary?.length ? (
            <div className="py-20 text-center text-ink-500">
              <CalendarDays size={32} className="mx-auto mb-3 opacity-50" />
              <p>No aggregated data available for this month</p>
            </div>
          ) : (
            <table className="w-full min-w-[800px]">
              <thead className="bg-ink-900/80 sticky top-0 backdrop-blur-sm z-10 border-b border-ink-800">
                <tr>{['Employee','Dept','Present','Absent','Late','Half Day','Leave','Expected Hrs','Actual Hrs','Rate%'].map(h => <th key={h} className="table-header">{h}</th>)}</tr>
              </thead>
              <tbody>
                {data.summary.map(r => (
                  <tr key={r.employee_id} className="table-row group">
                    <td className="table-cell">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent/20 to-jade/10 text-accent-light border border-accent/20 flex items-center justify-center font-bold text-xs">
                          {r.employee_name?.[0]}
                        </div>
                        <div>
                          <p className="text-ink-200 text-sm font-medium">{r.employee_name}</p>
                          <p className="text-ink-500 text-[10px] font-mono">{r.employee_id_code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell text-ink-400 text-xs">{r.department}</td>
                    <td className="table-cell font-mono text-jade">{r.present}</td>
                    <td className="table-cell font-mono text-coral">{r.absent}</td>
                    <td className="table-cell font-mono text-amber">{r.late}</td>
                    <td className="table-cell font-mono text-accent-light">{r.half_day}</td>
                    <td className="table-cell font-mono text-ink-500">{r.on_leave}</td>
                    <td className="table-cell font-mono text-ink-500 text-xs">{r.expected_hours}h</td>
                    <td className="table-cell font-mono text-ink-300 text-sm font-medium">{r.total_hours}h</td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2 w-24">
                        <div className="flex-1 bg-ink-800 rounded-full h-1.5 overflow-hidden">
                          <div className={`h-full rounded-full ${r.attendance_rate >= 80 ? 'bg-jade' : r.attendance_rate >= 50 ? 'bg-amber' : 'bg-coral'}`} 
                               style={{ width: `${r.attendance_rate}%` }} />
                        </div>
                        <span className="text-xs font-mono font-medium text-ink-200">{r.attendance_rate}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        
        <div className="px-6 py-4 border-t border-ink-700/40 flex justify-end bg-ink-900/50">
          <button onClick={onClose} className="btn-secondary">Close Summary</button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ───
export default function AttendancePage() {
  const [records, setRecords] = useState([])
  const [total, setTotal]     = useState(0)
  const [loading, setLoading] = useState(true)
  
  // Filters
  const [dateFrom, setDateFrom]         = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0] })
  const [dateTo, setDateTo]             = useState(new Date().toISOString().split('T')[0])
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch]             = useState('')
  
  // Pagination
  const [page, setPage] = useState(0)
  const LIMIT = 25

  // Modals & Action State
  const [modalOpen, setModalOpen]       = useState(false)
  const [bulkOpen, setBulkOpen]         = useState(false)
  const [summaryOpen, setSummaryOpen]   = useState(false)
  const [editRecord, setEditRecord]     = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting]         = useState(false)
  const [exportingCsv, setExportingCsv] = useState(false)
  const [exportingXls, setExportingXls] = useState(false)

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    try {
      const params = { skip: page * LIMIT, limit: LIMIT }
      if (dateFrom) params.date_from = dateFrom
      if (dateTo) params.date_to = dateTo
      if (statusFilter) params.status = statusFilter
      if (search) params.search = search
      const res = await attendanceApi.list(params)
      setRecords(safeArr(res.records))
      setTotal(res.total || 0)
    } catch (err) { 
      toast.error(err?.message || 'Failed to load attendance') 
    } finally { 
      setLoading(false) 
    }
  }, [page, dateFrom, dateTo, statusFilter, search])

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setPage(0); fetchRecords() }, 400)
    return () => clearTimeout(t)
  }, [search, dateFrom, dateTo, statusFilter, fetchRecords])

  const handleSave = async (data) => {
    try {
      if (editRecord) {
        await attendanceApi.update(editRecord.id, data)
        toast.success('Record updated')
      } else {
        await attendanceApi.create(data)
        toast.success('Attendance logged')
      }
      setModalOpen(false)
      setEditRecord(null)
      fetchRecords()
    } catch (err) { 
      toast.error(err?.message || 'Failed to save')
      throw err 
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try { 
      await attendanceApi.delete(deleteTarget.id)
      toast.success('Record deleted')
      setDeleteTarget(null)
      fetchRecords() 
    } catch (err) { 
      toast.error(err?.message || 'Failed to delete') 
    } finally {
      setDeleting(false)
    }
  }

  const handleQuickAction = async (record, newStatus) => {
    try {
      const payload = {
        employee_id: record.employee_id,
        date: record.date.split('T')[0],
        status: newStatus,
        check_in: record.check_in,
        check_out: record.check_out,
        notes: record.notes
      }
      await attendanceApi.update(record.id, payload)
      toast.success(`Marked as ${newStatus}`)
      fetchRecords()
    } catch (err) {
      toast.error(err?.message || `Failed to mark ${newStatus}`)
    }
  }

  const handleExport = async (fmt) => {
    const setExp = fmt === 'csv' ? setExportingCsv : setExportingXls
    setExp(true)
    try {
      const params = { format: fmt }
      if (dateFrom) params.date_from = dateFrom
      if (dateTo) params.date_to = dateTo
      if (statusFilter) params.status = statusFilter
      
      const res = await attendanceApi.export(params)
      const ext = fmt === 'excel' ? 'xlsx' : 'csv'
      const url = window.URL.createObjectURL(new Blob([res]))
      const a = document.createElement('a')
      a.href = url
      a.download = `attendance_${dateFrom}_${dateTo}.${ext}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      toast.success(`Downloaded as ${fmt.toUpperCase()}`)
    } catch (err) {
      toast.error(err?.message || 'Export failed')
    } finally {
      setExp(false)
    }
  }

  const totalPages = Math.ceil(total / LIMIT)

  // Derived visible stats (for current page/filter)
  const stats = useMemo(() => {
    return records.reduce((acc, r) => {
      acc.hours += parseFloat(r.hours_worked || 0)
      if (r.status === 'Present') acc.present++
      if (r.status === 'Absent') acc.absent++
      if (r.status === 'Late') acc.late++
      return acc
    }, { hours: 0, present: 0, absent: 0, late: 0 })
  }, [records])

  return (
    <div className="space-y-5 max-w-7xl animate-fade-up">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-50">Attendance Tracker</h1>
          <p className="text-ink-400 text-sm mt-0.5">{total} total records found</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setSummaryOpen(true)} className="btn-secondary">
            <BarChart2 size={14} /> Monthly Report
          </button>
          
          <div className="relative group/export">
            <button className="btn-secondary">
              <Download size={14} /> Export Options
            </button>
            <div className="absolute right-0 top-full mt-2 w-36 bg-ink-800 border border-ink-600/50 rounded-xl shadow-xl hidden group-hover/export:block z-20 overflow-hidden">
              <button onClick={() => handleExport('csv')} disabled={exportingCsv} className="w-full text-left px-4 py-2.5 text-sm text-ink-200 hover:bg-ink-700 transition-colors flex items-center gap-2">
                {exportingCsv ? <Loader2 size={14} className="animate-spin" /> : '📄 CSV'}
              </button>
              <button onClick={() => handleExport('excel')} disabled={exportingXls} className="w-full text-left px-4 py-2.5 text-sm text-ink-200 hover:bg-ink-700 transition-colors flex items-center gap-2">
                {exportingXls ? <Loader2 size={14} className="animate-spin" /> : '📊 Excel'}
              </button>
            </div>
          </div>
          
          <button onClick={() => setBulkOpen(true)} className="btn-secondary border-accent/30 hover:border-accent text-accent-light">
            <Users size={14} /> <span className="hidden sm:inline">Bulk Mark</span>
          </button>
          
          <button onClick={() => { setEditRecord(null); setModalOpen(true) }} className="btn-primary shadow-[0_0_15px_rgba(124,106,247,0.3)]">
            <Plus size={15} /> Log Entry
          </button>
        </div>
      </div>

      {/* ── Summary Stats (Current View) ── */}
      {records.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={CheckCircle} label="Present (View)" value={stats.present} color="jade" sub="Active on screen" />
          <StatCard icon={Clock} label="Total Hours" value={`${stats.hours.toFixed(1)}h`} color="accent" sub="Logged on screen" />
          <StatCard icon={XCircle} label="Absent" value={stats.absent} color="coral" />
          <StatCard icon={CalendarDays} label="Late" value={stats.late} color="amber" />
        </div>
      )}

      {/* ── Filters ── */}
      <div className="card p-3 flex flex-wrap gap-3 items-center">
        <div className="relative min-w-[180px] flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
          <input className="input-field pl-8 py-2 text-sm" placeholder="Search employee…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        
        <div className="flex items-center gap-2">
          <input type="date" className="input-field py-2 text-sm w-[130px]" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          <span className="text-ink-500 text-sm">to</span>
          <input type="date" className="input-field py-2 text-sm w-[130px]" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>

        <div className="flex items-center gap-1 bg-ink-900 border border-ink-800 rounded-xl p-1 overflow-x-auto">
          {['', 'Present', 'Absent', 'Late', 'Half Day'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${statusFilter === s ? 'bg-ink-700 text-white shadow-sm' : 'text-ink-400 hover:text-ink-200 hover:bg-ink-800'}`}>
              {s || 'All Status'}
            </button>
          ))}
        </div>

        {(search || statusFilter || dateFrom || dateTo !== new Date().toISOString().split('T')[0]) && (
          <button onClick={() => { 
            const d = new Date(); d.setDate(1); 
            setDateFrom(d.toISOString().split('T')[0]); 
            setDateTo(new Date().toISOString().split('T')[0]); 
            setStatusFilter(''); 
            setSearch('') 
          }} className="text-xs text-ink-500 hover:text-ink-200 ml-1">
            Reset
          </button>
        )}
      </div>

      {/* ── Table ── */}
      <div className="card overflow-hidden">
        <div className="table-mobile-scroll">
          <table className="w-full min-w-[900px]">
            <thead className="bg-ink-900/60">
              <tr>{['Employee','Date','Check In','Check Out','Hours','Late','Status','Notes','Actions'].map(h => <th key={h} className="table-header">{h}</th>)}</tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="py-20 text-center"><Loader2 size={32} className="animate-spin text-ink-500 mx-auto" /></td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={9}>
                  <EmptyState 
                    icon={CalendarCheck}
                    title="No logs found"
                    message="No attendance matches your filters. Try adjusting the dates or searching someone else."
                    actionLabel="Log New Entry"
                    onAction={() => setModalOpen(true)}
                  />
                </td></tr>
              ) : records.map(r => (
                <tr key={r.id} className="table-row group">
                  <td className="table-cell">
                    <Link to={`/employees/${r.employee_id}`} className="flex items-center gap-2 group/link hover:opacity-80 transition-opacity">
                       <div className="w-7 h-7 rounded-md bg-ink-800 border border-ink-700 flex items-center justify-center text-xs font-bold text-ink-300">
                         {r.employee_name?.[0] || '?'}
                       </div>
                       <div>
                         <p className="text-ink-200 text-sm font-medium group-hover/link:text-accent-light transition-colors">{r.employee_name || `#${r.employee_id}`}</p>
                         {r.employee_department && <p className="text-ink-500 text-[10px]">{r.employee_department}</p>}
                       </div>
                    </Link>
                  </td>
                  <td className="table-cell text-xs font-mono text-ink-300 whitespace-nowrap">{fmtDate(r.date)}</td>
                  <td className="table-cell text-xs font-mono text-ink-300 whitespace-nowrap">{fmtTime(r.check_in)}</td>
                  <td className="table-cell text-xs font-mono text-ink-400 whitespace-nowrap">{fmtTime(r.check_out)}</td>
                  <td className="table-cell">
                    {r.hours_worked ? <span className="px-2 py-0.5 bg-ink-800 rounded font-mono text-xs text-accent-light">{parseFloat(r.hours_worked).toFixed(1)}h</span> : <span className="text-ink-700">—</span>}
                  </td>
                  <td className="table-cell">
                    {r.is_late ? <span className="text-amber text-xs font-mono flex items-center gap-1 bg-amber/10 px-1.5 py-0.5 rounded w-fit"><Clock size={10} /> +{r.late_minutes}m</span> : <span className="text-ink-700">—</span>}
                  </td>
                  <td className="table-cell"><span className={STATUS_BADGE[r.status] || 'badge'}>{r.status}</span></td>
                  <td className="table-cell text-xs text-ink-500 max-w-[150px] truncate" title={r.notes}>{r.notes || '—'}</td>
                  <td className="table-cell">
                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* Quick Actions */}
                      {r.status !== 'Present' && (
                        <button onClick={() => handleQuickAction(r, 'Present')} title="Mark Present"
                                className="px-2 py-1 text-[10px] font-semibold tracking-wider uppercase text-jade bg-jade/10 hover:bg-jade/20 rounded border border-jade/20 transition-colors">
                          Present
                        </button>
                      )}
                      {r.status !== 'Absent' && (
                        <button onClick={() => handleQuickAction(r, 'Absent')} title="Mark Absent"
                                className="px-2 py-1 text-[10px] font-semibold tracking-wider uppercase text-coral bg-coral/10 hover:bg-coral/20 rounded border border-coral/20 transition-colors">
                          Absent
                        </button>
                      )}
                      
                      <div className="w-px h-4 bg-ink-700 mx-1" />
                      
                      {/* Standard Actions */}
                      <button onClick={() => { setEditRecord(r); setModalOpen(true) }} title="Edit"
                              className="p-1.5 text-ink-500 hover:text-accent-light hover:bg-accent/10 rounded-lg transition-colors"><Pencil size={13} /></button>
                      <button onClick={() => setDeleteTarget(r)} title="Delete"
                              className="p-1.5 text-ink-500 hover:text-coral hover:bg-coral/10 rounded-lg transition-colors"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-ink-800/50 bg-ink-900/30">
            <p className="text-xs text-ink-500">Showing {page*LIMIT+1}–{Math.min((page+1)*LIMIT,total)} out of {total} records</p>
            <div className="flex gap-1">
              <button onClick={() => setPage(0)} disabled={page===0} 
                      className="px-2 py-1 text-xs text-ink-400 hover:text-ink-100 disabled:opacity-30">«</button>
              <button onClick={() => setPage(p => Math.max(0,p-1))} disabled={page===0} 
                      className="p-1.5 text-ink-400 hover:bg-ink-800 rounded-lg disabled:opacity-30"><ChevronLeft size={14} /></button>
              <span className="px-3 py-1 text-xs text-ink-300 font-mono font-medium">{page+1} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages-1,p+1))} disabled={page>=totalPages-1} 
                      className="p-1.5 text-ink-400 hover:bg-ink-800 rounded-lg disabled:opacity-30"><ChevronRight size={14} /></button>
              <button onClick={() => setPage(totalPages-1)} disabled={page>=totalPages-1} 
                      className="px-2 py-1 text-xs text-ink-400 hover:text-ink-100 disabled:opacity-30">»</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {modalOpen && <AttendanceModal record={editRecord} onClose={() => { setModalOpen(false); setEditRecord(null) }} onSave={handleSave} />}
      {bulkOpen && <BulkAttendanceModal onClose={() => setBulkOpen(false)} onSaved={() => { setBulkOpen(false); fetchRecords() }} />}
      {summaryOpen && <MonthlySummaryModal onClose={() => setSummaryOpen(false)} />}
      {deleteTarget && <ConfirmDialog deleting={deleting} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />}
    </div>
  )
}
