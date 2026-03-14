import { useEffect, useState } from 'react'
import { settingsApi } from '../api'
import { Settings, Save } from 'lucide-react'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const [form, setForm] = useState({ company_name: '', company_email: '', company_phone: '', company_address: '', work_start_time: '09:00', work_end_time: '18:00', late_threshold_minutes: 15, timezone: 'Asia/Kolkata' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    settingsApi.get().then(r => {
      const d = r.data
      setForm({
        company_name: d.company_name || '',
        company_email: d.company_email || '',
        company_phone: d.company_phone || '',
        company_address: d.company_address || '',
        work_start_time: d.work_start_time || '09:00',
        work_end_time: d.work_end_time || '18:00',
        late_threshold_minutes: d.late_threshold_minutes || 15,
        timezone: d.timezone || 'Asia/Kolkata',
      })
    }).catch(() => toast.error('Failed to load settings')).finally(() => setLoading(false))
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    setSaving(true)
    try {
      await settingsApi.update(form)
      toast.success('Settings saved')
    } catch { toast.error('Failed to save settings') }
    finally { setSaving(false) }
  }

  if (loading) return <div className="flex items-center justify-center h-48"><div className="spinner w-7 h-7" /></div>

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-50">Settings</h1>
        <p className="text-ink-400 text-sm mt-0.5">Company profile and system configuration</p>
      </div>

      <div className="card p-6 space-y-5">
        <h3 className="font-display font-semibold text-ink-200 text-sm border-b border-ink-700/40 pb-3">Company Profile</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className="label">Company Name</label><input className="input-field" value={form.company_name} onChange={e => set('company_name', e.target.value)} placeholder="Acme Corp" /></div>
          <div><label className="label">Company Email</label><input className="input-field" type="email" value={form.company_email} onChange={e => set('company_email', e.target.value)} placeholder="hr@company.com" /></div>
          <div><label className="label">Phone</label><input className="input-field" value={form.company_phone} onChange={e => set('company_phone', e.target.value)} placeholder="+91 98765 43210" /></div>
          <div><label className="label">Timezone</label>
            <select className="input-field" value={form.timezone} onChange={e => set('timezone', e.target.value)}>
              {['Asia/Kolkata','Asia/Dubai','Asia/Singapore','Europe/London','America/New_York','America/Los_Angeles','UTC'].map(tz => <option key={tz}>{tz}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2"><label className="label">Address</label><textarea className="input-field resize-none" rows={2} value={form.company_address} onChange={e => set('company_address', e.target.value)} /></div>
        </div>
      </div>

      <div className="card p-6 space-y-5">
        <h3 className="font-display font-semibold text-ink-200 text-sm border-b border-ink-700/40 pb-3">Attendance Rules</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div><label className="label">Work Start Time</label><input className="input-field" type="time" value={form.work_start_time} onChange={e => set('work_start_time', e.target.value)} /></div>
          <div><label className="label">Work End Time</label><input className="input-field" type="time" value={form.work_end_time} onChange={e => set('work_end_time', e.target.value)} /></div>
          <div>
            <label className="label">Late Threshold (min)</label>
            <input className="input-field" type="number" min={0} max={120} value={form.late_threshold_minutes} onChange={e => set('late_threshold_minutes', parseInt(e.target.value))} />
            <p className="text-xs text-ink-600 mt-1">Minutes after start time to mark Late</p>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving} className="btn-primary min-w-32 justify-center">
          {saving ? <><div className="spinner w-4 h-4" /> Saving…</> : <><Save size={15} /> Save Settings</>}
        </button>
      </div>
    </div>
  )
}
