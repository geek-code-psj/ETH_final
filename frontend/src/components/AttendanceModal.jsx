import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { employeeApi } from '../api'

const STATUSES = ['Present', 'Absent', 'Late', 'Half Day', 'On Leave']

export default function AttendanceModal({ record, onClose, onSave }) {
  const isEdit = !!record
  const [form, setForm] = useState({
    employee_id: '',
    date: new Date().toISOString().split('T')[0],
    check_in: '',
    check_out: '',
    status: 'Present',
    notes: '',
  })
  const [employees, setEmployees] = useState([])
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    employeeApi.list({ limit: 200, status: 'Active' }).then(res => {
      setEmployees(res.data.employees)
    })
  }, [])

  useEffect(() => {
    if (record) {
      setForm({
        employee_id: record.employee_id || '',
        date: record.date || '',
        check_in: record.check_in ? record.check_in.slice(0, 16) : '',
        check_out: record.check_out ? record.check_out.slice(0, 16) : '',
        status: record.status || 'Present',
        notes: record.notes || '',
      })
    }
  }, [record])

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }))
    if (errors[k]) setErrors(e => ({ ...e, [k]: null }))
  }

  const validate = () => {
    const e = {}
    if (!form.employee_id) e.employee_id = 'Select an employee'
    if (!form.date) e.date = 'Required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      const payload = {
        ...form,
        employee_id: parseInt(form.employee_id),
        check_in: form.check_in ? new Date(form.check_in).toISOString() : null,
        check_out: form.check_out ? new Date(form.check_out).toISOString() : null,
      }
      if (!payload.check_in) delete payload.check_in
      if (!payload.check_out) delete payload.check_out
      if (!payload.notes) delete payload.notes
      await onSave(payload)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-ink-900 border border-ink-700/50 rounded-2xl w-full max-w-lg mx-4 shadow-2xl animate-fade-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-700/40">
          <div>
            <h2 className="font-display font-semibold text-ink-100">
              {isEdit ? 'Edit Attendance' : 'Log Attendance'}
            </h2>
            <p className="text-xs text-ink-500 mt-0.5">Record check-in and status</p>
          </div>
          <button onClick={onClose} className="p-2 text-ink-500 hover:text-ink-200 hover:bg-ink-800 rounded-xl transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {!isEdit && (
            <div>
              <label className="label">Employee *</label>
              <select
                className={`input-field ${errors.employee_id ? 'border-coral/60' : ''}`}
                value={form.employee_id}
                onChange={e => set('employee_id', e.target.value)}
              >
                <option value="">Select employee…</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name} ({emp.employee_id})
                  </option>
                ))}
              </select>
              {errors.employee_id && <p className="text-coral text-xs mt-1">{errors.employee_id}</p>}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Date *</label>
              <input
                className={`input-field ${errors.date ? 'border-coral/60' : ''}`}
                type="date"
                value={form.date}
                onChange={e => set('date', e.target.value)}
                disabled={isEdit}
              />
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input-field" value={form.status} onChange={e => set('status', e.target.value)}>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Check In</label>
              <input
                className="input-field"
                type="datetime-local"
                value={form.check_in}
                onChange={e => set('check_in', e.target.value)}
              />
            </div>
            <div>
              <label className="label">Check Out</label>
              <input
                className="input-field"
                type="datetime-local"
                value={form.check_out}
                onChange={e => set('check_out', e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="label">Notes</label>
            <textarea
              className="input-field resize-none"
              rows={2}
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Optional remarks…"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-ink-700/40">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="btn-primary min-w-[110px] justify-center">
            {saving ? <><div className="spinner w-4 h-4" /> Saving…</> : isEdit ? 'Save Changes' : 'Log Record'}
          </button>
        </div>
      </div>
    </div>
  )
}
