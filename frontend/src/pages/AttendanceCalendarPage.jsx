import { useEffect, useState } from 'react'
import { attendanceApi, employeeApi } from '../api'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import toast from 'react-hot-toast'

const STATUS_COLOR = {
  Present:  'bg-jade text-white',
  Absent:   'bg-coral text-white',
  Late:     'bg-amber text-ink-900',
  'Half Day': 'bg-accent text-white',
  'On Leave': 'bg-ink-600 text-ink-200',
}
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

export default function AttendanceCalendarPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [employees, setEmployees] = useState([])
  const [records, setRecords] = useState({})   // date string → record
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    employeeApi.list({ limit: 200, status: 'Active' })
      .then(r => { 
        if (r.employees && r.employees[0]) {
          setEmployees(r.employees)
          setSelectedEmployee(String(r.employees[0].id)) 
        }
      })
  }, [])

  useEffect(() => {
    if (!selectedEmployee) return
    setLoading(true)
    const firstDay = `${year}-${String(month + 1).padStart(2, '0')}-01`
    const lastDay = new Date(year, month + 1, 0)
    const lastDayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`
    attendanceApi.list({ employee_id: selectedEmployee, date_from: firstDay, date_to: lastDayStr, limit: 100 })
      .then(r => {
        const map = {}
        r.records.forEach(rec => { map[rec.date] = rec })
        setRecords(map)
      })
      .catch((err) => toast.error(err.message || 'Failed to load calendar'))
      .finally(() => setLoading(false))
  }, [selectedEmployee, month, year])

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1) }

  const firstDayOfMonth = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells = []
  for (let i = 0; i < firstDayOfMonth; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const dateStr = (d) => `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`

  // Summary counts
  const present = Object.values(records).filter(r => r.status === 'Present').length
  const absent  = Object.values(records).filter(r => r.status === 'Absent').length
  const late    = Object.values(records).filter(r => r.status === 'Late').length
  const leave   = Object.values(records).filter(r => r.status === 'On Leave').length

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-50">Attendance Calendar</h1>
        <p className="text-ink-400 text-sm mt-0.5">Monthly view per employee</p>
      </div>

      {/* Controls */}
      <div className="card p-4 flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-48">
          <label className="label">Employee</label>
          <select className="input-field" value={selectedEmployee} onChange={e => setSelectedEmployee(e.target.value)}>
            {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name} ({e.employee_id})</option>)}
          </select>
        </div>
        <div>
          <label className="label">Month</label>
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="p-2 text-ink-400 hover:text-ink-100 hover:bg-ink-800 rounded-xl transition-colors"><ChevronLeft size={16} /></button>
            <span className="text-ink-100 font-medium text-sm w-36 text-center">{MONTHS[month]} {year}</span>
            <button onClick={nextMonth} className="p-2 text-ink-400 hover:text-ink-100 hover:bg-ink-800 rounded-xl transition-colors"><ChevronRight size={16} /></button>
          </div>
        </div>
      </div>

      {/* Summary pills */}
      <div className="flex gap-3 flex-wrap">
        {[
          { label: 'Present', val: present, cls: 'bg-jade/15 text-jade border-jade/20' },
          { label: 'Absent',  val: absent,  cls: 'bg-coral/15 text-coral border-coral/20' },
          { label: 'Late',    val: late,    cls: 'bg-amber/15 text-amber border-amber/20' },
          { label: 'On Leave',val: leave,   cls: 'bg-ink-700/50 text-ink-400 border-ink-600/30' },
        ].map(({ label, val, cls }) => (
          <div key={label} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-sm font-medium ${cls}`}>
            <span className="font-bold">{val}</span> {label}
          </div>
        ))}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-ink-700/30 bg-ink-800/30 text-sm text-ink-300">
          <span className="font-bold">{Object.keys(records).length}</span> tracked days
        </div>
      </div>

      {/* Calendar grid */}
      <div className="card p-5 relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-ink-950/50 rounded-2xl z-10">
            <div className="spinner w-7 h-7" />
          </div>
        )}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {DAYS.map(d => <div key={d} className="text-center text-xs font-semibold text-ink-500 py-1">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {cells.map((day, i) => {
            if (!day) return <div key={`empty-${i}`} />
            const ds = dateStr(day)
            const rec = records[ds]
            const isToday = ds === now.toISOString().split('T')[0]
            const isWeekend = new Date(year, month, day).getDay() === 0 || new Date(year, month, day).getDay() === 6
            return (
              <div key={day}
                className={`relative rounded-xl p-1.5 min-h-[52px] flex flex-col border transition-colors
                  ${rec ? STATUS_COLOR[rec.status] || 'bg-ink-700 text-ink-200' : isWeekend ? 'bg-ink-900/30 border-ink-800/20' : 'bg-ink-800/20 border-ink-700/20'}
                  ${isToday ? 'ring-2 ring-accent ring-offset-1 ring-offset-ink-950' : 'border-transparent'}`}
              >
                <span className={`text-xs font-bold ${rec ? '' : isWeekend ? 'text-ink-600' : 'text-ink-400'}`}>{day}</span>
                {rec && (
                  <div className="mt-auto">
                    <p className="text-xs font-medium leading-tight opacity-90">{rec.status}</p>
                    {rec.check_in && (
                      <p className="text-xs opacity-70 leading-tight">
                        {new Date(rec.check_in).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })}
                      </p>
                    )}
                  </div>
                )}
                {isWeekend && !rec && <span className="text-xs opacity-40 mt-auto">off</span>}
              </div>
            )
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-ink-800/40">
          {Object.entries(STATUS_COLOR).map(([status, cls]) => (
            <div key={status} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded ${cls}`} />
              <span className="text-xs text-ink-400">{status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
