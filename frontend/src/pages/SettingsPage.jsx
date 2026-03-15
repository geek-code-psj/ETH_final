import { useEffect, useState, useMemo } from 'react'
import { settingsApi } from '../api'
import { Building2, Clock, Save, Loader2, Globe, Shield, CreditCard } from 'lucide-react'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('company')
  const [form, setForm] = useState({ 
    company_name: '', company_email: '', company_phone: '', 
    company_address: '', work_start_time: '09:00', work_end_time: '18:00', 
    late_threshold_minutes: 15, timezone: 'Asia/Kolkata' 
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    settingsApi.get().then(d => {
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
    }).catch((err) => toast.error(err?.message || 'Failed to load settings')).finally(() => setLoading(false))
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    setSaving(true)
    try {
      await settingsApi.update(form)
      toast.success('Settings saved successfully')
    } catch (err) { 
      toast.error(err?.message || 'Failed to save settings') 
    } finally { 
      setSaving(false) 
    }
  }

  // Derived state to check if form is filled enough to save
  const isValid = useMemo(() => form.company_name.trim().length > 0, [form.company_name])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4 animate-fade-up">
        <Loader2 size={32} className="animate-spin text-accent" />
        <p className="text-ink-500 text-sm">Loading Workspace Context…</p>
      </div>
    )
  }

  const TABS = [
    { id: 'company', label: 'Company Profile', icon: Building2 },
    { id: 'attendance', label: 'Attendance Rules', icon: Clock },
    { id: 'security', label: 'Security & Access', icon: Shield, disabled: true },
    { id: 'billing', label: 'Billing & Plans', icon: CreditCard, disabled: true },
  ]

  return (
    <div className="max-w-4xl space-y-6 animate-fade-up">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-ink-800 pb-5">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-50">Workspace Settings</h1>
          <p className="text-ink-400 text-sm mt-1">Configure company profile and system-wide tracking rules</p>
        </div>
        <button 
          onClick={handleSave} 
          disabled={saving || !isValid} 
          className="btn-primary min-w-[140px] justify-center shadow-[0_0_15px_rgba(124,106,247,0.3)] transition-all"
        >
          {saving ? <><Loader2 size={16} className="animate-spin" /> Saving…</> : <><Save size={16} /> Save Changes</>}
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* ── Sidebar Tabs ── */}
        <div className="w-full md:w-56 flex-shrink-0 space-y-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => !tab.disabled && setActiveTab(tab.id)}
              disabled={tab.disabled}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.id 
                  ? 'bg-accent/10 text-accent-light border border-accent/20' 
                  : tab.disabled 
                    ? 'text-ink-600 cursor-not-allowed border border-transparent' 
                    : 'text-ink-400 hover:bg-ink-800 hover:text-ink-200 border border-transparent'
              }`}
            >
              <span className="flex items-center gap-3">
                <tab.icon size={16} className={activeTab === tab.id ? 'text-accent' : 'text-ink-500'} />
                {tab.label}
              </span>
              {tab.disabled && <span className="text-[10px] uppercase font-bold bg-ink-800 px-1.5 py-0.5 rounded text-ink-500">Soon</span>}
            </button>
          ))}
        </div>

        {/* ── Content Area ── */}
        <div className="flex-1 space-y-6">
          {activeTab === 'company' && (
            <div className="card p-6 space-y-8 animate-fade-up">
              <div>
                <h3 className="font-display font-semibold text-lg text-ink-100 flex items-center gap-2">
                  <Building2 size={18} className="text-accent" /> Company Profile
                </h3>
                <p className="text-sm text-ink-500 mt-1">Update your organization's core details and contact info.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                <div className="sm:col-span-2">
                  <label className="label">Company Name <span className="text-coral">*</span></label>
                  <input className="input-field max-w-md" value={form.company_name} onChange={e => set('company_name', e.target.value)} placeholder="e.g. Acme Corporation" />
                </div>
                
                <div>
                  <label className="label">Contact Email</label>
                  <input className="input-field" type="email" value={form.company_email} onChange={e => set('company_email', e.target.value)} placeholder="hr@company.com" />
                </div>
                
                <div>
                  <label className="label">Phone Number</label>
                  <input className="input-field" value={form.company_phone} onChange={e => set('company_phone', e.target.value)} placeholder="+91 98765 43210" />
                </div>
                
                <div className="sm:col-span-2 border-t border-ink-800/50 pt-5 mt-2">
                  <label className="label flex items-center gap-2"><Globe size={14} className="text-ink-400" /> Default Timezone</label>
                  <select className="input-field max-w-xs" value={form.timezone} onChange={e => set('timezone', e.target.value)}>
                    <optgroup label="Asia">
                      {['Asia/Kolkata','Asia/Dubai','Asia/Singapore','Asia/Tokyo'].map(tz => <option key={tz} value={tz}>{tz.split('/')[1].replace('_',' ')}</option>)}
                    </optgroup>
                    <optgroup label="Europe">
                      {['Europe/London','Europe/Paris','Europe/Berlin'].map(tz => <option key={tz} value={tz}>{tz.split('/')[1].replace('_',' ')}</option>)}
                    </optgroup>
                    <optgroup label="Americas">
                      {['America/New_York','America/Los_Angeles','America/Toronto'].map(tz => <option key={tz} value={tz}>{tz.split('/')[1].replace('_',' ')}</option>)}
                    </optgroup>
                    <option value="UTC">UTC Standard</option>
                  </select>
                  <p className="text-xs text-ink-500 mt-1.5">This timezone is used for evaluating Check In and Check Out times.</p>
                </div>

                <div className="sm:col-span-2">
                  <label className="label">Registered Address</label>
                  <textarea className="input-field resize-none" rows={3} value={form.company_address} onChange={e => set('company_address', e.target.value)} placeholder="123 Business Avenue, Suite 100..." />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'attendance' && (
            <div className="card p-6 space-y-8 animate-fade-up">
              <div>
                <h3 className="font-display font-semibold text-lg text-ink-100 flex items-center gap-2">
                  <Clock size={18} className="text-amber" /> Attendance Rules
                </h3>
                <p className="text-sm text-ink-500 mt-1">Configure global working hours and late calculation thresholds.</p>
              </div>

              <div className="p-4 rounded-xl border border-amber/20 bg-amber/5 text-amber text-sm flex items-start gap-3">
                <Clock size={16} className="shrink-0 mt-0.5" />
                <p>Changes to working hours only affect future attendance records. Existing records evaluating 'Late' status will not be recalculated retroactively.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-6">
                <div>
                  <label className="label">Work Start Time</label>
                  <input className="input-field" type="time" value={form.work_start_time} onChange={e => set('work_start_time', e.target.value)} />
                </div>
                
                <div>
                  <label className="label">Work End Time</label>
                  <input className="input-field" type="time" value={form.work_end_time} onChange={e => set('work_end_time', e.target.value)} />
                </div>
                
                <div className="sm:col-span-2 border-t border-ink-800/50 pt-5">
                  <label className="label">Late Threshold (Grace Period)</label>
                  <div className="flex items-center gap-3">
                    <div className="relative max-w-[120px]">
                      <input className="input-field pr-12 text-right font-mono" type="number" min={0} max={240} step={5} 
                             value={form.late_threshold_minutes} onChange={e => set('late_threshold_minutes', parseInt(e.target.value) || 0)} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-500 text-sm">min</span>
                    </div>
                    <p className="text-sm text-ink-400">Minutes after <strong className="text-ink-200">{form.work_start_time}</strong> before an employee is marked as 'Late'.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
