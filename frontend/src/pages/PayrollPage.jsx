import { useState, useEffect, useCallback, useMemo } from 'react'
import { payrollApi, employeeApi } from '../api'
import toast from 'react-hot-toast'
import { 
  Calendar, CheckCircle, Clock, Search, ChevronDown, Upload, 
  Download, FileText, IndianRupee, PieChart, Users, Loader2,
  TrendingUp, AlertCircle
} from 'lucide-react'

// ─── Helpers ──────────────────────────────────────────────────────────────────
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const safeArr = (v) => (Array.isArray(v) ? v : [])
const fmt = (n) => `₹${parseFloat(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
const fmtNumber = (n) => parseFloat(n || 0).toLocaleString('en-IN')

const BADGE_COLORS = {
  draft:     'badge bg-ink-800 text-ink-400 border-ink-700',
  processed: 'badge bg-accent/10 text-accent-light border-accent/20',
  paid:      'badge-present', // jade
}

// ─── Sub-components ────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color }) {
  const cls = {
    jade:   'text-jade bg-jade/10 border-jade/20',
    accent: 'text-accent-light bg-accent/10 border-accent/20',
    ink:    'text-ink-300 bg-ink-800 border-ink-700',
  }[color] || ''
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 ${cls}`}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-xs text-ink-400">{label}</p>
        <p className="font-display font-bold text-xl text-ink-100">{value}</p>
        {sub && <p className="text-xs text-ink-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function PayslipModal({ payslip, month, year, onClose }) {
  if (!payslip) return null
  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="card-solid w-full max-w-2xl max-h-[90vh] overflow-y-auto p-0 animate-fade-up flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-ink-700/50 flex items-start justify-between bg-ink-900/50 sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0">
              <FileText size={24} className="text-accent-light" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-ink-50">Payslip</h2>
              <p className="text-sm text-ink-400">{MONTHS[month - 1]} {year} · {payslip.status.toUpperCase()}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-ink-500 hover:text-ink-200 hover:bg-ink-800 rounded-xl transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Employee Info */}
          <div className="bg-ink-800/40 border border-ink-700/50 rounded-2xl p-4 flex flex-wrap gap-x-8 gap-y-4">
            <div>
              <p className="text-xs text-ink-500 mb-1">Employee Name</p>
              <p className="font-medium text-ink-100">{payslip.employee_name}</p>
              <p className="text-xs text-ink-400 mt-0.5">{payslip.employee_id_code}</p>
            </div>
            <div>
              <p className="text-xs text-ink-500 mb-1">Department</p>
              <p className="text-sm text-ink-200">{payslip.department}</p>
            </div>
            <div>
              <p className="text-xs text-ink-500 mb-1">Position</p>
              <p className="text-sm text-ink-200">{payslip.position}</p>
            </div>
            <div>
              <p className="text-xs text-ink-500 mb-1">Attendance</p>
              <p className="text-sm text-ink-200">{payslip.present_days} / {payslip.working_days} days</p>
            </div>
          </div>

          {/* Salary Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Earnings */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold tracking-wider text-jade uppercase flex items-center gap-1.5 border-b border-ink-800 pb-2">
                <TrendingUp size={12} /> Earnings
              </h3>
              <div className="space-y-2">
                {[
                  ['Basic Salary', payslip.basic_salary],
                  ['HRA', payslip.hra],
                  ['Transport', payslip.transport],
                  ['Medical', payslip.medical],
                  ['Other Allowances', payslip.other_allowances],
                ].map(([k, v]) => parseFloat(v) > 0 && (
                  <div key={k} className="flex justify-between text-sm">
                    <span className="text-ink-400">{k}</span>
                    <span className="text-ink-200 font-medium">{fmt(v)}</span>
                  </div>
                ))}
              </div>
              {parseFloat(payslip.bonus) > 0 && (
                <div className="flex justify-between text-sm pt-2 border-t border-ink-800/50">
                  <span className="text-jade font-medium">Bonus</span>
                  <span className="text-jade font-medium">+{fmt(payslip.bonus)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm pt-2 border-t border-ink-700 font-semibold bg-ink-800/30 px-3 py-2 rounded-lg mt-2">
                <span className="text-ink-200">Gross Earnings</span>
                <span className="text-ink-100">{fmt(payslip.gross_salary)}</span>
              </div>
            </div>

            {/* Deductions */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold tracking-wider text-coral uppercase flex items-center gap-1.5 border-b border-ink-800 pb-2">
                <TrendingUp size={12} className="rotate-180" /> Deductions
              </h3>
              <div className="space-y-2">
                {[
                  ['PF Deduction', payslip.pf_deduction],
                  ['Tax Deduction', payslip.tax_deduction],
                  ['Other Deductions', payslip.other_deductions],
                ].map(([k, v]) => parseFloat(v) > 0 && (
                  <div key={k} className="flex justify-between text-sm">
                    <span className="text-ink-400">{k}</span>
                    <span className="text-coral font-medium">-{fmt(v)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-ink-700 font-semibold bg-ink-800/30 px-3 py-2 rounded-lg mt-auto">
                <span className="text-ink-200">Total Deductions</span>
                <span className="text-coral">{fmt(payslip.total_deductions)}</span>
              </div>
            </div>
          </div>

          {/* Net Pay */}
          <div className="mt-6 bg-gradient-to-r from-accent/20 to-accent/5 border border-accent/20 rounded-xl p-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-accent-light">Net Payable Amount</p>
              <p className="text-xs text-ink-400 mt-1">Gross Earnings - Total Deductions</p>
            </div>
            <p className="font-display text-2xl font-bold tracking-tight text-white">{fmt(payslip.net_salary)}</p>
          </div>

          <div className="flex gap-3 pt-4">
            <button onClick={onClose} className="btn-secondary flex-1 justify-center">Close</button>
            <button className="btn-primary flex-1 justify-center group pointer-events-none opacity-50">
              <Download size={14} className="group-hover:-translate-y-0.5 transition-transform" /> 
              Download PDF <span className="text-[10px] ml-1 uppercase">(Coming Soon)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PayrollPage() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear]   = useState(now.getFullYear())
  const [records, setRecords] = useState([])
  
  const [loading, setLoading]       = useState(true)
  const [generating, setGenerating] = useState(false)
  const [payslip, setPayslip]       = useState(null)
  
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [actionLoading, setActionLoading] = useState(null) // id

  const fetchPayroll = useCallback(async () => {
    setLoading(true)
    try {
      const res = await payrollApi.list({ month, year })
      setRecords(safeArr(res))
    } catch (e) { 
      toast.error(e?.message || 'Failed to load payroll') 
    } finally { 
      setLoading(false) 
    }
  }, [month, year])

  useEffect(() => { fetchPayroll() }, [fetchPayroll])

  const generate = async () => {
    setGenerating(true)
    try {
      const res = await payrollApi.generate({ month, year })
      toast.success(res.message || 'Payroll generated!')
      fetchPayroll()
    } catch (e) { 
      toast.error(e?.message || 'Failed to generate') 
    } finally { 
      setGenerating(false) 
    }
  }

  const markPaid = async (id) => {
    setActionLoading(id)
    try {
      await payrollApi.updateStatus(id, 'paid')
      toast.success('Marked as Paid')
      fetchPayroll()
    } catch (e) { 
      toast.error(e?.message || 'Failed to update') 
    } finally {
      setActionLoading(null)
    }
  }

  const viewPayslip = async (id) => {
    try {
      const res = await payrollApi.getPayslip(id)
      setPayslip(res)
    } catch (e) { toast.error(e?.message || 'Failed to fetch payslip') }
  }

  // ── Derived State ───────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let res = records
    if (statusFilter) res = res.filter(r => r.status === statusFilter)
    if (searchTerm) {
      const s = searchTerm.toLowerCase()
      res = res.filter(r => r.employee_name?.toLowerCase().includes(s) || r.department?.toLowerCase().includes(s))
    }
    return res
  }, [records, statusFilter, searchTerm])

  const totalNet = records.reduce((s, r) => s + parseFloat(r.net_salary || 0), 0)
  const paidCount = records.filter(r => r.status === 'paid').length
  const pendingCount = records.filter(r => r.status === 'processed').length

  return (
    <div className="space-y-5 max-w-7xl animate-fade-up">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-50">Payroll Management</h1>
          <p className="text-ink-400 text-sm mt-0.5">Generate and manage monthly employee salaries</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 bg-ink-900 border border-ink-800 p-1.5 rounded-2xl">
          <div className="relative">
            <select className="input-field py-1.5 pl-3 pr-8 text-sm appearance-none bg-transparent border-transparent hover:bg-ink-800 min-w-[100px]"
              value={month} onChange={e => setMonth(+e.target.value)}>
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-500 pointer-events-none" />
          </div>
          <div className="w-px h-6 bg-ink-800 mx-1" />
          <input type="number" value={year} onChange={e => setYear(+e.target.value)} min="2020" max="2030"
            className="input-field py-1.5 px-3 text-sm bg-transparent border-transparent hover:bg-ink-800 w-[76px] text-center" />
          
          <button onClick={generate} disabled={generating}
            className="btn-primary ml-2 rounded-xl px-4 py-1.5 shadow-[0_0_15px_rgba(124,106,247,0.3)]">
            {generating ? <><Loader2 size={14} className="animate-spin" /> Generating…</> : '⚡ Run Payroll'}
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Users}       label="Employees Processed" value={records.length} color="ink" />
        <StatCard icon={IndianRupee} label="Total Net Payout"    value={fmt(totalNet)}  color="accent" />
        <StatCard icon={Clock}       label="Pending Payment"     value={pendingCount}   color="accent" />
        <StatCard icon={CheckCircle} label="Fully Paid"          value={paidCount}      color="jade" />
      </div>

      {/* ── Filters ── */}
      <div className="card p-3 flex flex-wrap gap-3 items-center">
        <div className="relative min-w-[200px] flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
          <input className="input-field pl-8 py-2 text-sm" placeholder="Search employee or dept…"
            value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>

        {['', 'draft', 'processed', 'paid'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${statusFilter === s ? 'bg-accent text-white shadow-sm' : 'bg-ink-800 text-ink-400 hover:bg-ink-700 hover:text-ink-200'}`}>
            {s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All Status'}
          </button>
        ))}

        {(searchTerm || statusFilter) && (
          <button onClick={() => { setSearchTerm(''); setStatusFilter('') }} className="text-xs text-ink-500 hover:text-ink-200 mx-2">
            Clear
          </button>
        )}
      </div>

      {/* ── Table ── */}
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead className="bg-ink-900/60">
            <tr>
              {['Employee', 'Department', 'Working Days', 'Gross', 'Deductions', 'Bonus', 'Net Salary', 'Status', 'Actions'].map(h => (
                <th key={h} className="table-header">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="py-20 text-center"><Loader2 size={32} className="animate-spin text-ink-500 mx-auto" /></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={9}>
                <EmptyState icon={PieChart}
                  title={records.length === 0 ? `No payroll for ${MONTHS[month-1]} ${year}` : 'No matching records'}
                  message={records.length === 0 ? "Click 'Run Payroll' to automatically generate salaries for all active employees." : "Try adjusting your search filters."}
                  actionLabel={records.length === 0 ? "⚡ Run Payroll" : "Clear Filters"}
                  onAction={records.length === 0 ? generate : () => { setSearchTerm(''); setStatusFilter('') }} />
              </td></tr>
            ) : filtered.map(r => {
              const pending = r.status === 'processed'
              const doingAction = actionLoading === r.id
              return (
                <tr key={r.id} className="table-row hover:bg-ink-800/20">
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent/20 to-jade/10 text-accent border border-accent/20 flex items-center justify-center font-bold text-xs">
                        {r.employee_name?.[0]}
                      </div>
                      <div>
                        <div className="color-ink-100 font-semibold text-sm">{r.employee_name}</div>
                        <div className="text-ink-500 text-xs font-mono">{r.employee_id_code}</div>
                      </div>
                    </div>
                  </td>
                  <td className="table-cell text-sm text-ink-300">{r.department}</td>
                  <td className="table-cell text-sm text-ink-300">
                    <span className="font-mono text-ink-200">{r.present_days}</span> <span className="text-ink-500 text-xs">/ {r.working_days}</span>
                  </td>
                  <td className="table-cell text-sm font-mono text-ink-300">{fmtNumber(r.gross_salary)}</td>
                  <td className="table-cell text-sm font-mono text-coral">-{fmtNumber(r.total_deductions)}</td>
                  <td className="table-cell text-sm font-mono text-jade">{parseFloat(r.bonus) > 0 ? `+${fmtNumber(r.bonus)}` : '—'}</td>
                  <td className="table-cell font-display font-bold text-ink-50 tracking-wide text-base">{fmt(r.net_salary)}</td>
                  <td className="table-cell">
                    <span className={BADGE_COLORS[r.status] || 'badge'}>{r.status}</span>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => viewPayslip(r.id)} title="View Payslip"
                        className="p-1.5 text-accent-light bg-accent/10 hover:bg-accent/20 border border-accent/20 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium px-2.5">
                        <FileText size={13} /> View
                      </button>
                      
                      {pending && (
                        doingAction ? (
                          <div className="p-1.5 px-3 rounded-lg border border-transparent"><Loader2 size={13} className="animate-spin text-ink-500" /></div>
                        ) : (
                          <button onClick={() => markPaid(r.id)} title="Mark as Paid"
                            className="p-1.5 text-jade bg-jade/10 hover:bg-jade/20 border border-jade/20 rounded-lg transition-colors flex items-center gap-1 text-xs font-medium px-2.5">
                            <CheckCircle size={13} /> Pay
                          </button>
                        )
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        
        {filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-ink-800 flex items-center justify-between text-xs text-ink-500 bg-ink-900/40">
            <span>Showing {filtered.length} employees</span>
            <span>Total Net: <strong className="text-ink-200">{fmt(filtered.reduce((s, r) => s + parseFloat(r.net_salary||0), 0))}</strong></span>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      <PayslipModal payslip={payslip} month={month} year={year} onClose={() => setPayslip(null)} />
    </div>
  )
}
