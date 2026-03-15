import { useState, useEffect } from 'react'
import { payrollApi, employeeApi } from '../api'
import toast from 'react-hot-toast'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const statusColor = (s) => ({
  draft: 'rgba(255,255,255,0.1)',
  processed: 'rgba(124,106,247,0.2)',
  paid: 'rgba(45,212,160,0.2)'
})[s] || 'rgba(255,255,255,0.1)'

const statusText = (s) => ({
  draft: '#aaa', processed: '#b3aaff', paid: '#2dd4a0'
})[s] || '#aaa'

export default function PayrollPage() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [payslip, setPayslip] = useState(null)
  const [showPayslip, setShowPayslip] = useState(false)

  const fetchPayroll = async () => {
    setLoading(true)
    try {
      const res = await payrollApi.list({ month, year })
      setRecords(Array.isArray(res) ? res : [])
    } catch (e) { toast.error(e.message) } finally { setLoading(false) }
  }

  useEffect(() => { fetchPayroll() }, [month, year])

  const generate = async () => {
    setGenerating(true)
    try {
      const res = await payrollApi.generate({ month, year })
      toast.success(res.message || 'Payroll generated!')
      fetchPayroll()
    } catch (e) { toast.error(e.message) } finally { setGenerating(false) }
  }

  const viewPayslip = async (id) => {
    try {
      const res = await payrollApi.getPayslip(id)
      setPayslip(res)
      setShowPayslip(true)
    } catch (e) { toast.error(e.message) }
  }

  const markPaid = async (id) => {
    try {
      await payrollApi.updateStatus(id, 'paid')
      toast.success('Marked as Paid')
      fetchPayroll()
    } catch (e) { toast.error(e.message) }
  }

  const fmt = (n) => `₹${parseFloat(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
  const totalNet = records.reduce((s, r) => s + parseFloat(r.net_salary || 0), 0)

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ color: '#e2e2ea', fontSize: '24px', fontWeight: 700, margin: 0 }}>Payroll</h1>
          <p style={{ color: '#888', margin: '4px 0 0', fontSize: '14px' }}>Manage monthly salary records & payslips</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <select value={month} onChange={e => setMonth(+e.target.value)}
            style={{ background: '#1e1e35', border: '1px solid rgba(124,106,247,0.2)', color: '#e2e2ea', borderRadius: '10px', padding: '8px 14px', fontSize: '14px' }}>
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <input type="number" value={year} onChange={e => setYear(+e.target.value)} min="2020" max="2030"
            style={{ background: '#1e1e35', border: '1px solid rgba(124,106,247,0.2)', color: '#e2e2ea', borderRadius: '10px', padding: '8px 14px', fontSize: '14px', width: '90px' }} />
          <button onClick={generate} disabled={generating}
            style={{ background: generating ? 'rgba(124,106,247,0.3)' : 'linear-gradient(135deg, #7c6af7, #5b50d6)', color: '#fff', border: 'none', borderRadius: '10px', padding: '8px 20px', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}>
            {generating ? '⏳ Generating…' : '⚡ Generate Payroll'}
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Total Employees', value: records.length, icon: '👥' },
          { label: 'Total Payout', value: fmt(totalNet), icon: '💰' },
          { label: 'Processed', value: records.filter(r => r.status !== 'draft').length, icon: '✅' },
          { label: 'Paid', value: records.filter(r => r.status === 'paid').length, icon: '🏦' },
        ].map(c => (
          <div key={c.label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(124,106,247,0.1)', borderRadius: '14px', padding: '20px' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>{c.icon}</div>
            <div style={{ color: '#e2e2ea', fontSize: '22px', fontWeight: 700 }}>{c.value}</div>
            <div style={{ color: '#888', fontSize: '12px', marginTop: '4px' }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(124,106,247,0.1)', borderRadius: '16px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#888' }}>Loading payroll…</div>
        ) : records.length === 0 ? (
          <div style={{ padding: '64px', textAlign: 'center', color: '#888' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>💸</div>
            <p style={{ margin: 0 }}>No payroll records for {MONTHS[month - 1]} {year}</p>
            <p style={{ fontSize: '13px', marginTop: '8px' }}>Click "Generate Payroll" to create records for all active employees.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['Employee', 'Dept', 'Days', 'Gross', 'Deductions', 'Bonus', 'Net Salary', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '14px 16px', textAlign: 'left', color: '#888', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ color: '#e2e2ea', fontWeight: 600, fontSize: '14px' }}>{r.employee_name}</div>
                    <div style={{ color: '#888', fontSize: '12px' }}>{r.employee_id_code}</div>
                  </td>
                  <td style={{ padding: '14px 16px', color: '#aaa', fontSize: '13px' }}>{r.department}</td>
                  <td style={{ padding: '14px 16px', color: '#aaa', fontSize: '13px' }}>{r.present_days}/{r.working_days}</td>
                  <td style={{ padding: '14px 16px', color: '#e2e2ea', fontSize: '13px' }}>{fmt(r.gross_salary)}</td>
                  <td style={{ padding: '14px 16px', color: '#f97462', fontSize: '13px' }}>-{fmt(r.total_deductions)}</td>
                  <td style={{ padding: '14px 16px', color: '#2dd4a0', fontSize: '13px' }}>+{fmt(r.bonus)}</td>
                  <td style={{ padding: '14px 16px', color: '#7c6af7', fontSize: '14px', fontWeight: 700 }}>{fmt(r.net_salary)}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ background: statusColor(r.status), color: statusText(r.status), padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>
                      {r.status}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => viewPayslip(r.id)}
                        style={{ background: 'rgba(124,106,247,0.15)', border: '1px solid rgba(124,106,247,0.3)', color: '#b3aaff', borderRadius: '8px', padding: '5px 10px', cursor: 'pointer', fontSize: '12px' }}>
                        📄 Payslip
                      </button>
                      {r.status !== 'paid' && (
                        <button onClick={() => markPaid(r.id)}
                          style={{ background: 'rgba(45,212,160,0.1)', border: '1px solid rgba(45,212,160,0.3)', color: '#2dd4a0', borderRadius: '8px', padding: '5px 10px', cursor: 'pointer', fontSize: '12px' }}>
                          ✓ Paid
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Payslip Modal */}
      {showPayslip && payslip && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}
          onClick={() => setShowPayslip(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#15152a', border: '1px solid rgba(124,106,247,0.2)', borderRadius: '20px', width: '100%', maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto', padding: '32px' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '36px' }}>💼</div>
              <h2 style={{ color: '#e2e2ea', fontSize: '20px', fontWeight: 700, margin: '8px 0 4px' }}>Payslip</h2>
              <p style={{ color: '#888', margin: 0, fontSize: '14px' }}>{MONTHS[payslip.month - 1]} {payslip.year}</p>
            </div>
            <div style={{ background: 'rgba(124,106,247,0.06)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
              <div style={{ color: '#e2e2ea', fontWeight: 700, fontSize: '16px' }}>{payslip.employee_name}</div>
              <div style={{ color: '#888', fontSize: '13px' }}>{payslip.employee_id_code} • {payslip.department} • {payslip.position}</div>
            </div>
            {[
              { label: 'Earnings', items: [
                ['Basic Salary', payslip.basic_salary],
                ['HRA', payslip.hra],
                ['Transport', payslip.transport],
                ['Medical', payslip.medical],
                ['Other Allowances', payslip.other_allowances],
                ['Bonus', payslip.bonus],
              ], color: '#2dd4a0' },
              { label: 'Deductions', items: [
                ['PF Deduction', payslip.pf_deduction],
                ['Tax', payslip.tax_deduction],
                ['Other Deductions', payslip.other_deductions],
              ], color: '#f97462' },
            ].map(section => (
              <div key={section.label} style={{ marginBottom: '16px' }}>
                <div style={{ color: '#888', fontSize: '12px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '8px' }}>{section.label}</div>
                {section.items.map(([k, v]) => parseFloat(v || 0) > 0 && (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <span style={{ color: '#aaa', fontSize: '13px' }}>{k}</span>
                    <span style={{ color: section.color, fontSize: '13px', fontWeight: 500 }}>{fmt(v)}</span>
                  </div>
                ))}
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', background: 'linear-gradient(135deg, rgba(124,106,247,0.15), rgba(91,80,214,0.15))', borderRadius: '12px', padding: '16px', marginTop: '16px' }}>
              <span style={{ color: '#e2e2ea', fontWeight: 700, fontSize: '16px' }}>Net Salary</span>
              <span style={{ color: '#7c6af7', fontWeight: 800, fontSize: '20px' }}>{fmt(payslip.net_salary)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#888', fontSize: '12px', marginTop: '12px' }}>
              <span>Working Days: {payslip.working_days}</span>
              <span>Present Days: {payslip.present_days}</span>
            </div>
            <button onClick={() => setShowPayslip(false)}
              style={{ width: '100%', marginTop: '24px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#aaa', borderRadius: '10px', padding: '10px', cursor: 'pointer', fontSize: '13px' }}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
