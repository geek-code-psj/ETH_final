import { useState, useEffect, useRef } from 'react'
import { X, Upload, User } from 'lucide-react'

const DEPARTMENTS = ['Engineering','HR','Finance','Marketing','Operations','Sales','Design','Legal']
const STATUSES    = ['Active','Inactive','On Leave']
const ROLES       = ['Individual Contributor','Team Lead','Manager','Senior Manager','Director','VP','C-Level','Intern','Contractor']

export default function EmployeeModal({ employee, onClose, onSave, allEmployees = [] }) {
  const isEdit = !!employee
  const fileRef = useRef()
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    department: 'Engineering', position: '', role_permission: '',
    salary: '', hire_date: new Date().toISOString().split('T')[0],
    date_of_birth: '', address: '', status: 'Active',
    avatar_url: '', manager_id: '',
  })
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (employee) {
      setForm({
        first_name:      employee.first_name    || '',
        last_name:       employee.last_name     || '',
        email:           employee.email         || '',
        phone:           employee.phone         || '',
        department:      employee.department    || 'Engineering',
        position:        employee.position      || '',
        role_permission: employee.role_permission || '',
        salary:          employee.salary        || '',
        hire_date:       employee.hire_date     || '',
        date_of_birth:   employee.date_of_birth || '',
        address:         employee.address       || '',
        status:          employee.status        || 'Active',
        avatar_url:      employee.avatar_url    || '',
        manager_id:      employee.manager_id    || '',
      })
      if (employee.avatar_url) setAvatarPreview(employee.avatar_url)
    }
  }, [employee])

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }))
    if (errors[k]) setErrors(e => ({ ...e, [k]: null }))
  }

  // Avatar: convert to base64 for preview, store as data URL
  const handleAvatarFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 500 * 1024) { setErrors(er => ({ ...er, avatar: 'Max 500KB' })); return }
    const reader = new FileReader()
    reader.onload = (ev) => {
      const url = ev.target.result
      setAvatarPreview(url)
      set('avatar_url', url)
    }
    reader.readAsDataURL(file)
  }

  const validate = () => {
    const e = {}
    if (!form.first_name.trim()) e.first_name = 'Required'
    if (!form.last_name.trim())  e.last_name  = 'Required'
    if (!form.email.trim())      e.email      = 'Required'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email'
    if (!form.position.trim())   e.position   = 'Required'
    if (!form.hire_date)         e.hire_date  = 'Required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      const payload = { ...form }
      if (!payload.salary)       delete payload.salary
      if (!payload.phone)        delete payload.phone
      if (!payload.date_of_birth) delete payload.date_of_birth
      if (!payload.address)      delete payload.address
      if (!payload.manager_id)   delete payload.manager_id
      else                       payload.manager_id = parseInt(payload.manager_id)
      await onSave(payload)
    } finally { setSaving(false) }
  }

  const initials = `${form.first_name?.[0] || ''}${form.last_name?.[0] || ''}`.toUpperCase() || '?'

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-ink-900 border border-ink-700/50 rounded-2xl w-full max-w-2xl shadow-2xl animate-fade-up max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-700/40 flex-shrink-0">
          <div>
            <h2 className="font-display font-semibold text-ink-100">{isEdit ? 'Edit Employee' : 'Add New Employee'}</h2>
            <p className="text-xs text-ink-500 mt-0.5">{isEdit ? `Editing ${employee.first_name} ${employee.last_name}` : 'Fill in the details below'}</p>
          </div>
          <button onClick={onClose} className="p-2 text-ink-500 hover:text-ink-200 hover:bg-ink-800 rounded-xl transition-colors"><X size={16} /></button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          {/* Avatar upload */}
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent/30 to-jade/20 border-2 border-accent/20 flex items-center justify-center text-xl font-bold text-accent-light overflow-hidden flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => fileRef.current?.click()}
            >
              {avatarPreview
                ? <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
                : initials
              }
            </div>
            <div>
              <button type="button" onClick={() => fileRef.current?.click()}
                className="btn-secondary text-xs py-1.5">
                <Upload size={13} /> Upload Photo
              </button>
              <p className="text-xs text-ink-600 mt-1">JPG, PNG · max 500KB</p>
              {errors.avatar && <p className="text-coral text-xs mt-1">{errors.avatar}</p>}
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp"
                className="hidden" onChange={handleAvatarFile} />
            </div>
            <div className="flex-1 min-w-0">
              <label className="label">Avatar URL (optional)</label>
              <input className="input-field text-xs" value={form.avatar_url}
                onChange={e => { set('avatar_url', e.target.value); setAvatarPreview(e.target.value) }}
                placeholder="https://…" />
            </div>
          </div>

          {/* Name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">First Name *</label>
              <input className={`input-field ${errors.first_name ? 'border-coral/60' : ''}`}
                value={form.first_name} onChange={e => set('first_name', e.target.value)} placeholder="John" />
              {errors.first_name && <p className="text-coral text-xs mt-1">{errors.first_name}</p>}
            </div>
            <div>
              <label className="label">Last Name *</label>
              <input className={`input-field ${errors.last_name ? 'border-coral/60' : ''}`}
                value={form.last_name} onChange={e => set('last_name', e.target.value)} placeholder="Doe" />
              {errors.last_name && <p className="text-coral text-xs mt-1">{errors.last_name}</p>}
            </div>
          </div>

          {/* Email + Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Email *</label>
              <input className={`input-field ${errors.email ? 'border-coral/60' : ''}`}
                type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="john@company.com" />
              {errors.email && <p className="text-coral text-xs mt-1">{errors.email}</p>}
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input-field" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 98765 43210" />
            </div>
          </div>

          {/* Dept + Position */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Department *</label>
              <select className="input-field" value={form.department} onChange={e => set('department', e.target.value)}>
                {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Position *</label>
              <input className={`input-field ${errors.position ? 'border-coral/60' : ''}`}
                value={form.position} onChange={e => set('position', e.target.value)} placeholder="Software Engineer" />
              {errors.position && <p className="text-coral text-xs mt-1">{errors.position}</p>}
            </div>
          </div>

          {/* Role + Manager */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Role / Level</label>
              <select className="input-field" value={form.role_permission} onChange={e => set('role_permission', e.target.value)}>
                <option value="">Select role…</option>
                {ROLES.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Reports To (Manager)</label>
              <select className="input-field" value={form.manager_id} onChange={e => set('manager_id', e.target.value)}>
                <option value="">No manager</option>
                {allEmployees.filter(e => !employee || e.id !== employee.id).map(e => (
                  <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Salary + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Salary (₹)</label>
              <input className="input-field" type="number" value={form.salary}
                onChange={e => set('salary', e.target.value)} placeholder="50000" />
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input-field" value={form.status} onChange={e => set('status', e.target.value)}>
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Hire Date *</label>
              <input className={`input-field ${errors.hire_date ? 'border-coral/60' : ''}`}
                type="date" value={form.hire_date} onChange={e => set('hire_date', e.target.value)} />
              {errors.hire_date && <p className="text-coral text-xs mt-1">{errors.hire_date}</p>}
            </div>
            <div>
              <label className="label">Date of Birth</label>
              <input className="input-field" type="date" value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="label">Address</label>
            <textarea className="input-field resize-none" rows={2} value={form.address}
              onChange={e => set('address', e.target.value)} placeholder="123 Main St, City, State" />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-ink-700/40 flex-shrink-0">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="btn-primary min-w-[130px] justify-center">
            {saving ? <><div className="spinner w-4 h-4" /> Saving…</> : isEdit ? 'Save Changes' : 'Add Employee'}
          </button>
        </div>
      </div>
    </div>
  )
}
