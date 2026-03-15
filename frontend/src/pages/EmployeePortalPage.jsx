import { useState } from 'react'
import { employeePortalApi } from '../api'
import toast from 'react-hot-toast'

export default function EmployeePortalLogin({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await employeePortalApi.login({ email, password })
      localStorage.setItem('employee_token', res.access_token)
      toast.success(`Welcome, ${res.name}!`)
      onLogin(res)
    } catch (err) {
      toast.error(err.message || 'Login failed')
    } finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: '#15152a', border: '1px solid rgba(124,106,247,0.2)', borderRadius: '20px', padding: '48px', width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>👤</div>
          <h1 style={{ color: '#e2e2ea', fontSize: '22px', fontWeight: 700, margin: 0 }}>Employee Portal</h1>
          <p style={{ color: '#888', margin: '8px 0 0', fontSize: '14px' }}>Access your HR information</p>
        </div>
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ color: '#aaa', fontSize: '13px', display: 'block', marginBottom: '6px' }}>Work Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              style={{ width: '100%', background: '#1e1e35', border: '1px solid rgba(124,106,247,0.2)', color: '#e2e2ea', borderRadius: '10px', padding: '12px 14px', fontSize: '14px', boxSizing: 'border-box' }}
              placeholder="you@company.com" />
          </div>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ color: '#aaa', fontSize: '13px', display: 'block', marginBottom: '6px' }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
              style={{ width: '100%', background: '#1e1e35', border: '1px solid rgba(124,106,247,0.2)', color: '#e2e2ea', borderRadius: '10px', padding: '12px 14px', fontSize: '14px', boxSizing: 'border-box' }} />
          </div>
          <button type="submit" disabled={loading}
            style={{ width: '100%', background: 'linear-gradient(135deg, #7c6af7, #5b50d6)', color: '#fff', border: 'none', borderRadius: '10px', padding: '13px', fontWeight: 600, fontSize: '15px', cursor: 'pointer' }}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
