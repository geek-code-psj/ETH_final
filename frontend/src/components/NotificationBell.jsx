import { useState, useEffect, useRef } from 'react'
import { notificationApi } from '../api'
import toast from 'react-hot-toast'

export default function NotificationBell() {
  const [count, setCount] = useState(0)
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)
  const ref = useRef(null)

  const fetchCount = async () => {
    try {
      const res = await notificationApi.count()
      setCount(res.unread_count || 0)
    } catch (_) {}
  }

  useEffect(() => {
    fetchCount()
    const interval = setInterval(fetchCount, 30000) // poll every 30s
    return () => clearInterval(interval)
  }, [])

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleOpen = async () => {
    setOpen(o => !o)
    if (!open) {
      setLoading(true)
      try {
        const res = await notificationApi.list(false)
        setNotifications(Array.isArray(res) ? res : [])
      } catch (_) {} finally { setLoading(false) }
    }
  }

  const markRead = async (id) => {
    try {
      await notificationApi.markRead(id)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
      setCount(c => Math.max(0, c - 1))
    } catch (_) {}
  }

  const markAll = async () => {
    try {
      await notificationApi.markAllRead()
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setCount(0)
    } catch (_) { toast.error('Failed to mark all read') }
  }

  const typeIcon = (type) => {
    const icons = {
      leave_update: '🏖️', employee_added: '👤', payroll: '💰',
      attendance: '📋', general: '🔔'
    }
    return icons[type] || '🔔'
  }

  const timeAgo = (dateStr) => {
    if (!dateStr) return ''
    const diff = (new Date() - new Date(dateStr)) / 1000
    if (diff < 60) return 'just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={handleOpen}
        style={{
          position: 'relative', background: 'rgba(124,106,247,0.1)', border: '1px solid rgba(124,106,247,0.2)',
          borderRadius: '10px', padding: '8px 10px', cursor: 'pointer', fontSize: '18px',
          transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(124,106,247,0.2)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(124,106,247,0.1)'}
      >
        🔔
        {count > 0 && (
          <span style={{
            position: 'absolute', top: '-4px', right: '-4px',
            background: '#f97462', color: '#fff', borderRadius: '50%',
            width: '18px', height: '18px', fontSize: '10px', fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid #0a0a1a'
          }}>
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '110%', right: 0, width: '360px', zIndex: 1000,
          background: '#15152a', border: '1px solid rgba(124,106,247,0.2)',
          borderRadius: '16px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{
            padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            borderBottom: '1px solid rgba(124,106,247,0.1)'
          }}>
            <span style={{ color: '#e2e2ea', fontWeight: 600, fontSize: '14px' }}>Notifications</span>
            {count > 0 && (
              <button onClick={markAll} style={{
                background: 'none', border: 'none', color: '#7c6af7', cursor: 'pointer', fontSize: '12px'
              }}>Mark all read</button>
            )}
          </div>

          {/* List */}
          <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#888' }}>Loading…</div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: '#888' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔕</div>
                <div style={{ fontSize: '13px' }}>All caught up!</div>
              </div>
            ) : notifications.map(n => (
              <div
                key={n.id}
                onClick={() => !n.is_read && markRead(n.id)}
                style={{
                  padding: '14px 20px',
                  background: n.is_read ? 'transparent' : 'rgba(124,106,247,0.06)',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  cursor: n.is_read ? 'default' : 'pointer',
                  transition: 'background 0.15s'
                }}
              >
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '20px' }}>{typeIcon(n.type)}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span style={{ color: '#e2e2ea', fontSize: '13px', fontWeight: n.is_read ? 400 : 600 }}>
                        {n.title}
                      </span>
                      {!n.is_read && (
                        <span style={{
                          width: '6px', height: '6px', background: '#7c6af7',
                          borderRadius: '50%', flexShrink: 0, marginTop: '4px'
                        }} />
                      )}
                    </div>
                    <p style={{ color: '#888', fontSize: '12px', margin: '3px 0 4px' }}>{n.message}</p>
                    <span style={{ color: '#555', fontSize: '11px' }}>{timeAgo(n.created_at)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
