import axios from 'axios'
import { auth } from './firebase'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({ baseURL: API_URL, headers: { 'Content-Type': 'application/json' } })

// Admin (Firebase) auth interceptor
api.interceptors.request.use(async (config) => {
  const user = auth.currentUser
  if (user) config.headers.Authorization = `Bearer ${await user.getIdToken()}`
  return config
})

api.interceptors.response.use(
  r => r.data,
  err => {
    if (err.response?.status === 401) window.location.href = '/login'
    const msg = err.response?.data?.detail || err.message || 'Something went wrong'
    return Promise.reject({ ...err, message: msg })
  }
)

// Employee portal axios instance (JWT-based, not Firebase)
const portalApi = axios.create({ baseURL: API_URL, headers: { 'Content-Type': 'application/json' } })
portalApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('employee_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
portalApi.interceptors.response.use(r => r.data, err => {
  const msg = err.response?.data?.detail || err.message || 'Something went wrong'
  return Promise.reject({ ...err, message: msg })
})

const BASE = '/api/v1'

export const employeeApi = {
  list: (p) => api.get(`${BASE}/employees`, { params: p }),
  get: (id) => api.get(`${BASE}/employees/${id}`),
  create: (d) => api.post(`${BASE}/employees`, d),
  update: (id, d) => api.put(`${BASE}/employees/${id}`, d),
  delete: (id) => api.delete(`${BASE}/employees/${id}`),
  listDocuments: (id) => api.get(`${BASE}/employees/${id}/documents`),
  deleteDocument: (empId, docId) => api.delete(`${BASE}/employees/${empId}/documents/${docId}`),
}

export const attendanceApi = {
  list: (p) => api.get(`${BASE}/attendance`, { params: p }),
  today: () => api.get(`${BASE}/attendance/today`),
  monthlySummary: (month, year, empId) => api.get(`${BASE}/attendance/monthly-summary`, { params: { month, year, employee_id: empId } }),
  create: (d) => api.post(`${BASE}/attendance`, d),
  update: (id, d) => api.put(`${BASE}/attendance/${id}`, d),
  delete: (id) => api.delete(`${BASE}/attendance/${id}`),
  bulk: (records) => api.post(`${BASE}/attendance/bulk`, { records }),
  export: async (params) => {
    const res = await api.get(`${BASE}/attendance/export`, { params, responseType: 'blob' })
    return res
  },
}

export const dashboardApi = { stats: () => api.get(`${BASE}/dashboard`) }

export const leaveApi = {
  list: (p) => api.get(`${BASE}/leave`, { params: p }),
  create: (d) => api.post(`${BASE}/leave`, d),
  update: (id, d) => api.put(`${BASE}/leave/${id}`, d),
  // Leave types
  listTypes: () => api.get(`${BASE}/leave-types`),
  createType: (d) => api.post(`${BASE}/leave-types`, d),
  updateType: (id, d) => api.put(`${BASE}/leave-types/${id}`, d),
  // Balances
  getBalances: (empId, year) => api.get(`${BASE}/leave-types/balances/${empId}`, { params: { year } }),
  allocate: (d) => api.post(`${BASE}/leave-types/allocate`, d),
}

export const departmentApi = {
  list:   ()        => api.get(`${BASE}/departments`),
  create: (d)       => api.post(`${BASE}/departments`, d),
  update: (id, d)   => api.put(`${BASE}/departments/${id}`, d),
  delete: (id)      => api.delete(`${BASE}/departments/${id}`),
}

export const settingsApi = {
  get: () => api.get(`${BASE}/settings`),
  update: (d) => api.put(`${BASE}/settings`, d),
}

export const auditApi = {
  list: (p) => api.get(`${BASE}/audit-logs`, { params: p }),
}

export const authApi = {
  register: (d) => api.post(`${BASE}/auth/register`, d),
  me: () => api.get(`${BASE}/auth/me`),
}

export const adminApi = {
  list: () => api.get(`${BASE}/admins`),
  updateRole: (id, role) => api.put(`${BASE}/admins/${id}/role`, { role }),
}

export const payrollApi = {
  list: (p) => api.get(`${BASE}/payroll`, { params: p }),
  generate: (d) => api.post(`${BASE}/payroll/generate`, d),
  getPayslip: (id) => api.get(`${BASE}/payroll/${id}/payslip`),
  updateStatus: (id, status) => api.put(`${BASE}/payroll/${id}/status`, { status }),
  getSalaryStructure: (empId) => api.get(`${BASE}/payroll/salary-structure/${empId}`),
  upsertSalaryStructure: (d) => api.post(`${BASE}/payroll/salary-structure`, d),
}

export const analyticsApi = {
  attendanceTrend: (months = 12) => api.get(`${BASE}/analytics/attendance-trend`, { params: { months } }),
  hiringTrend: (months = 12) => api.get(`${BASE}/analytics/hiring-trend`, { params: { months } }),
  leaveUsage: (year) => api.get(`${BASE}/analytics/leave-usage`, { params: { year } }),
  departmentHeadcount: () => api.get(`${BASE}/analytics/department-headcount`),
}

export const notificationApi = {
  list: (unreadOnly = false) => api.get(`${BASE}/notifications`, { params: { unread_only: unreadOnly } }),
  count: () => api.get(`${BASE}/notifications/count`),
  markRead: (id) => api.put(`${BASE}/notifications/${id}/read`),
  markAllRead: () => api.put(`${BASE}/notifications/read-all`),
}

export const employeePortalApi = {
  login: (d) => portalApi.post(`${BASE}/portal/login`, d),
  me: () => portalApi.get(`${BASE}/portal/me`),
  updateMe: (d) => portalApi.put(`${BASE}/portal/me`, d),
  changePassword: (d) => portalApi.put(`${BASE}/portal/change-password`, d),
  myAttendance: (p) => portalApi.get(`${BASE}/portal/attendance`, { params: p }),
  myLeave: () => portalApi.get(`${BASE}/portal/leave`),
  submitLeave: (d) => portalApi.post(`${BASE}/portal/leave`, d),
  provision: (empId, password) => api.post(`${BASE}/portal/provision/${empId}`, { password }),
}

export const systemApi = { health: () => api.get('/health') }

export default api
