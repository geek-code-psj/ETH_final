import { useEffect, useState } from 'react'
import { auditApi } from '../api'
import { ClipboardList, ChevronLeft, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'

const ACTION_COLORS = {
  CREATE: 'bg-jade/15 text-jade border-jade/20',
  UPDATE: 'bg-accent/15 text-accent-light border-accent/20',
  DELETE: 'bg-coral/15 text-coral border-coral/20',
  EXPORT: 'bg-amber/15 text-amber border-amber/20',
  LOGIN:  'bg-ink-700/50 text-ink-400 border-ink-600/30',
}

export default function AuditPage() {
  const [logs, setLogs] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const LIMIT = 30

  useEffect(() => {
    setLoading(true)
    auditApi.list({ skip: page * LIMIT, limit: LIMIT })
      .then(r => { setLogs(r.data.logs); setTotal(r.data.total) })
      .catch(() => toast.error('Failed to load audit log'))
      .finally(() => setLoading(false))
  }, [page])

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-50">Audit Log</h1>
        <p className="text-ink-400 text-sm mt-0.5">{total} total events</p>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-ink-900/60">
            <tr>{['Time','Action','Resource','ID','Admin','Details'].map(h => <th key={h} className="table-header">{h}</th>)}</tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="py-16 text-center"><div className="spinner w-7 h-7 mx-auto" /></td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={6} className="py-16 text-center"><ClipboardList size={32} className="text-ink-700 mx-auto mb-3" /><p className="text-ink-500 text-sm">No audit events yet</p></td></tr>
            ) : logs.map(l => (
              <tr key={l.id} className="table-row">
                <td className="table-cell text-xs font-mono text-ink-400">
                  {l.created_at ? new Date(l.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                </td>
                <td className="table-cell"><span className={`badge border ${ACTION_COLORS[l.action] || ''}`}>{l.action}</span></td>
                <td className="table-cell text-ink-300 text-sm capitalize">{l.resource || '—'}</td>
                <td className="table-cell text-ink-500 text-xs font-mono">{l.resource_id || '—'}</td>
                <td className="table-cell text-ink-400 text-xs truncate max-w-32">{l.admin_email || '—'}</td>
                <td className="table-cell text-ink-500 text-xs max-w-48 truncate" title={l.details}>{l.details || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-ink-700/40">
            <p className="text-xs text-ink-500">{page * LIMIT + 1}–{Math.min((page + 1) * LIMIT, total)} of {total}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="p-1.5 text-ink-400 hover:text-ink-100 hover:bg-ink-800 rounded-lg disabled:opacity-30"><ChevronLeft size={15} /></button>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="p-1.5 text-ink-400 hover:text-ink-100 hover:bg-ink-800 rounded-lg disabled:opacity-30"><ChevronRight size={15} /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
