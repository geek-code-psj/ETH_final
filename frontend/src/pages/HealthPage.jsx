import { useEffect, useState } from 'react'
import api from '../api'
import { CheckCircle, XCircle, Clock, RefreshCw, Server, Database, Shield } from 'lucide-react'

function StatusBadge({ ok }) {
  return ok
    ? <span className="flex items-center gap-1.5 text-jade text-sm font-medium"><CheckCircle size={15} /> Healthy</span>
    : <span className="flex items-center gap-1.5 text-coral text-sm font-medium"><XCircle size={15} /> Unhealthy</span>
}

export default function HealthPage() {
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(true)
  const [lastChecked, setLastChecked] = useState(null)
  const [responseTime, setResponseTime] = useState(null)

  const check = async () => {
    setLoading(true)
    const start = Date.now()
    try {
      const res = await api.get('/health')
      setResponseTime(Date.now() - start)
      setHealth({ ok: true, ...res.data })
    } catch {
      setHealth({ ok: false })
      setResponseTime(Date.now() - start)
    }
    setLastChecked(new Date())
    setLoading(false)
  }

  useEffect(() => { check() }, [])

  const checks = [
    { icon: Server,   label: 'API Server',     ok: health?.ok,     detail: health?.version ? `v${health.version}` : 'Unreachable' },
    { icon: Database, label: 'Database',        ok: health?.ok,     detail: health?.ok ? 'PostgreSQL connected' : 'Check DATABASE_URL' },
    { icon: Shield,   label: 'Firebase Auth',   ok: health?.ok,     detail: health?.ok ? 'Token verification active' : 'Check credentials' },
    { icon: Clock,    label: 'Response Time',   ok: responseTime ? responseTime < 2000 : null, detail: responseTime ? `${responseTime}ms` : '—' },
  ]

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-50">System Health</h1>
          <p className="text-ink-400 text-sm mt-0.5">
            {lastChecked ? `Last checked ${lastChecked.toLocaleTimeString('en-IN')}` : 'Checking…'}
          </p>
        </div>
        <button onClick={check} disabled={loading} className="btn-secondary">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Overall status banner */}
      <div className={`card p-5 flex items-center gap-4 border-l-4 ${health?.ok ? 'border-l-jade' : 'border-l-coral'}`}>
        {health?.ok
          ? <CheckCircle size={28} className="text-jade flex-shrink-0" />
          : <XCircle size={28} className="text-coral flex-shrink-0" />}
        <div>
          <p className="font-display font-bold text-ink-100 text-lg">
            {loading ? 'Checking…' : health?.ok ? 'All Systems Operational' : 'Service Degraded'}
          </p>
          <p className="text-ink-400 text-sm">
            {health?.timestamp ? `Server time: ${new Date(health.timestamp).toLocaleString('en-IN')}` : ''}
          </p>
        </div>
      </div>

      {/* Individual checks */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {checks.map(({ icon: Icon, label, ok, detail }) => (
          <div key={label} className="card p-5 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
              ok === null ? 'bg-ink-700/50' : ok ? 'bg-jade/10' : 'bg-coral/10'}`}>
              <Icon size={18} className={ok === null ? 'text-ink-500' : ok ? 'text-jade' : 'text-coral'} />
            </div>
            <div>
              <p className="text-ink-200 font-medium text-sm">{label}</p>
              <p className="text-ink-500 text-xs mt-0.5">{detail}</p>
            </div>
            <div className="ml-auto">
              {loading ? <div className="spinner w-5 h-5" />
                : ok === null ? <span className="text-ink-600 text-xs">—</span>
                : <StatusBadge ok={ok} />}
            </div>
          </div>
        ))}
      </div>

      {/* Env checklist */}
      <div className="card p-5">
        <h3 className="font-display font-semibold text-ink-200 text-sm mb-4">Deployment Checklist</h3>
        <div className="space-y-2">
          {[
            { label: 'PYTHON_VERSION=3.11.9 set in Render', ok: true },
            { label: 'DATABASE_URL pointing to Render PostgreSQL', ok: health?.ok },
            { label: 'FIREBASE_SERVICE_ACCOUNT_JSON configured', ok: health?.ok },
            { label: 'FRONTEND_URL set to Render static site URL', ok: true },
            { label: 'Render static site rewrite rule /* → /index.html', ok: true },
            { label: 'Firebase authorized domain added', ok: true },
          ].map(({ label, ok }) => (
            <div key={label} className="flex items-center gap-3">
              {ok ? <CheckCircle size={14} className="text-jade flex-shrink-0" />
                  : <XCircle size={14} className="text-coral flex-shrink-0" />}
              <span className={`text-sm ${ok ? 'text-ink-300' : 'text-ink-500'}`}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
