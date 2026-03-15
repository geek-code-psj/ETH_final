import { useEffect, useState } from 'react'
import { dashboardApi } from '../api'
import { Link } from 'react-router-dom'
import { Users, UserCheck, Clock, TrendingUp, UserX, Calendar, ArrowRight,
         Briefcase, Plus, CalendarCheck, ClipboardList } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
         PieChart, Pie, Legend, LineChart, Line, CartesianGrid } from 'recharts'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

const DEPT_COLORS = ['#7c6af7','#2dd4a0','#f5b944','#f97462','#a89bf9','#6ee9c0','#f8cf7a','#fba396']

const ACTION_COLORS = { CREATE: 'text-jade', UPDATE: 'text-accent-light', DELETE: 'text-coral', EXPORT: 'text-amber', LOGIN: 'text-ink-400' }

function StatCard({ icon: Icon, label, value, sub, color = 'accent' }) {
  const c = {
    accent: 'text-accent-light bg-accent/10 border-accent/20',
    jade:   'text-jade bg-jade/10 border-jade/20',
    coral:  'text-coral bg-coral/10 border-coral/20',
    amber:  'text-amber bg-amber/10 border-amber/20',
  }
  return (
    <div className="stat-card animate-fade-up">
      <div className="flex items-start justify-between">
        <div className={`w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0 ${c[color]}`}>
          <Icon size={16} />
        </div>
        {sub && <span className="text-xs text-ink-500 font-mono bg-ink-800/60 px-2 py-0.5 rounded-lg">{sub}</span>}
      </div>
      <div>
        <p className="text-2xl font-display font-bold text-ink-50">{value}</p>
        <p className="text-xs text-ink-400 mt-0.5">{label}</p>
      </div>
    </div>
  )
}

const CT = ({ active, payload, label }) => active && payload?.length ? (
  <div className="bg-ink-800 border border-ink-600/50 rounded-xl px-3 py-2 text-xs shadow-xl">
    <p className="text-ink-300 mb-1">{label}</p>
    {payload.map((p, i) => <p key={i} style={{ color: p.color || '#7c6af7' }}>{p.name}: {p.value}</p>)}
  </div>
) : null

function SkeletonCard() {
  return <div className="stat-card"><div className="skeleton w-9 h-9 rounded-xl" /><div className="space-y-2"><div className="skeleton h-7 w-16 rounded" /><div className="skeleton-text w-24" /></div></div>
}

export default function DashboardPage() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    dashboardApi.stats()
      .then(setStats)
      .catch((err) => toast.error(err.message || 'Failed to load dashboard'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="space-y-6 max-w-7xl">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{Array(8).fill(0).map((_, i) => <SkeletonCard key={i} />)}</div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-5 lg:col-span-2 h-64 skeleton" />
        <div className="card p-5 h-64 skeleton" />
      </div>
    </div>
  )

  if (!stats) return null

  const deptData = Object.entries(stats.department_breakdown || {}).map(([d, c]) => ({ name: d, count: c }))
  const pieData = [
    { name: 'Present', value: stats.present_today, color: '#2dd4a0' },
    { name: 'Absent', value: stats.absent_today, color: '#f97462' },
    { name: 'Late', value: stats.late_today, color: '#f5b944' },
    { name: 'On Leave', value: stats.on_leave, color: '#7c6af7' },
  ].filter(d => d.value > 0)

  const quickActions = [
    { icon: Plus, label: 'Add Employee', color: 'bg-accent/10 border-accent/20 text-accent-light', action: () => navigate('/employees') },
    { icon: CalendarCheck, label: 'Mark Attendance', color: 'bg-jade/10 border-jade/20 text-jade', action: () => navigate('/attendance') },
    { icon: Calendar, label: 'Leave Request', color: 'bg-amber/10 border-amber/20 text-amber', action: () => navigate('/leave') },
    { icon: ClipboardList, label: 'Audit Log', color: 'bg-coral/10 border-coral/20 text-coral', action: () => navigate('/audit') },
  ]

  return (
    <div className="space-y-5 max-w-7xl">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-50">Overview</h1>
        <p className="text-ink-400 text-sm mt-0.5">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Users} label="Total Employees" value={stats.total_employees} color="accent" />
        <StatCard icon={UserCheck} label="Active Staff" value={stats.active_employees} color="jade" />
        <StatCard icon={Calendar} label="Present Today" value={stats.present_today} sub={`${stats.attendance_rate}%`} color="jade" />
        <StatCard icon={UserX} label="Absent Today" value={stats.absent_today} color="coral" />
        <StatCard icon={Clock} label="Late Today" value={stats.late_today} color="amber" />
        <StatCard icon={Briefcase} label="On Leave" value={stats.on_leave} color="amber" />
        <StatCard icon={TrendingUp} label="Attendance Rate" value={`${stats.attendance_rate}%`} color="jade" />
        <StatCard icon={Users} label="Departments" value={Object.keys(stats.department_breakdown || {}).length} color="accent" />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {quickActions.map(({ icon: Icon, label, color, action }) => (
          <button key={label} onClick={action}
            className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all hover:scale-105 ${color}`}>
            <Icon size={20} />
            <span className="text-xs font-medium">{label}</span>
          </button>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display font-semibold text-ink-100 text-sm">Headcount by Department</h3>
              <p className="text-ink-500 text-xs mt-0.5">Active employees</p>
            </div>
          </div>
          {deptData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={deptData} barSize={24}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6b6b8a' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip content={<CT />} cursor={{ fill: 'rgba(124,106,247,0.05)' }} />
                <Bar dataKey="count" radius={[5,5,0,0]}>
                  {deptData.map((_, i) => <Cell key={i} fill={DEPT_COLORS[i % DEPT_COLORS.length]} fillOpacity={0.85} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-44 flex items-center justify-center text-ink-600 text-sm">No data yet</div>}
        </div>

        <div className="card p-5">
          <div className="mb-3">
            <h3 className="font-display font-semibold text-ink-100 text-sm">Today's Attendance</h3>
            <p className="text-ink-500 text-xs mt-0.5">Status breakdown</p>
          </div>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="45%" innerRadius={45} outerRadius={68} paddingAngle={3} dataKey="value">
                  {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: '11px', color: '#9898b0' }} />
                <Tooltip contentStyle={{ background: '#15152a', border: '1px solid rgba(124,106,247,0.2)', borderRadius: '10px', fontSize: '12px', color: '#e2e2ea' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="h-44 flex items-center justify-center text-ink-600 text-sm">No records today</div>}
        </div>
      </div>

      {/* Attendance trend */}
      {stats.monthly_trend?.length > 0 && (
        <div className="card p-5">
          <div className="mb-4">
            <h3 className="font-display font-semibold text-ink-100 text-sm">Attendance Trend</h3>
            <p className="text-ink-500 text-xs mt-0.5">Monthly attendance rate (last 6 months)</p>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={stats.monthly_trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(124,106,247,0.08)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b6b8a' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#6b6b8a' }} axisLine={false} tickLine={false} unit="%" />
              <Tooltip content={<CT />} />
              <Line type="monotone" dataKey="rate" name="Rate %" stroke="#7c6af7" strokeWidth={2} dot={{ fill: '#7c6af7', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Bottom row: recent hires + activity feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent hires */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-ink-700/40">
            <h3 className="font-display font-semibold text-ink-100 text-sm">Recent Hires</h3>
            <Link to="/employees" className="text-xs text-accent-light hover:text-accent flex items-center gap-1 transition-colors">
              View all <ArrowRight size={11} />
            </Link>
          </div>
          <div>
            {stats.recent_hires.length === 0 ? (
              <div className="py-10 text-center text-ink-500 text-sm">No employees yet</div>
            ) : stats.recent_hires.map(emp => (
              <Link key={emp.id} to={`/employees/${emp.id}`}
                className="flex items-center gap-3 px-5 py-3 border-b border-ink-800/40 hover:bg-ink-800/30 transition-colors last:border-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent/30 to-jade/20 border border-accent/20 flex items-center justify-center text-xs font-semibold text-accent-light flex-shrink-0">
                  {emp.first_name[0]}{emp.last_name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink-100 truncate">{emp.first_name} {emp.last_name}</p>
                  <p className="text-xs text-ink-500">{emp.position} · {emp.department}</p>
                </div>
                <span className={emp.status === 'Active' ? 'badge-active' : 'badge-leave'}>{emp.status}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Activity feed */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-ink-700/40">
            <h3 className="font-display font-semibold text-ink-100 text-sm">Recent Activity</h3>
            <Link to="/audit" className="text-xs text-accent-light hover:text-accent flex items-center gap-1 transition-colors">
              View all <ArrowRight size={11} />
            </Link>
          </div>
          <div>
            {stats.recent_activity.length === 0 ? (
              <div className="py-10 text-center text-ink-500 text-sm">No activity yet</div>
            ) : stats.recent_activity.map(a => (
              <div key={a.id} className="flex items-start gap-3 px-5 py-3 border-b border-ink-800/40 last:border-0">
                <div className={`text-xs font-mono font-semibold mt-0.5 w-14 flex-shrink-0 ${ACTION_COLORS[a.action] || 'text-ink-400'}`}>
                  {a.action}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-ink-300 truncate">
                    <span className="text-ink-200 font-medium">{a.resource}</span>
                    {a.details && <span className="text-ink-500"> — {a.details.slice(0, 50)}</span>}
                  </p>
                  <p className="text-xs text-ink-600 mt-0.5">{a.admin_email}</p>
                </div>
                <p className="text-xs text-ink-600 font-mono flex-shrink-0">
                  {a.created_at ? new Date(a.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
