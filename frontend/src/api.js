import axios from 'axios'
import { auth } from './firebase'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({ baseURL: API_URL, headers: { 'Content-Type': 'application/json' } })

api.interceptors.request.use(async (config) => {
  const user = auth.currentUser
  if (user) config.headers.Authorization = `Bearer ${await user.getIdToken()}`
  return config
})

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) window.location.href = '/login'
    return Promise.reject(err)
  }
)

const BASE = '/api/v1'

export const employeeApi = {
  list: (p) => api.get(`${BASE}/employees`, { params: p }),
  get: (id) => api.get(`${BASE}/employees/${id}`),
  create: (d) => api.post(`${BASE}/employees`, d),
  update: (id, d) => api.put(`${BASE}/employees/${id}`, d),
  delete: (id) => api.delete(`${BASE}/employees/${id}`),
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
    const res = await api.get(`${BASE}/attendance/export`, {
      params,
      responseType: 'blob',
    })
    return res
  },
}

export const dashboardApi = { stats: () => api.get(`${BASE}/dashboard`) }

export const leaveApi = {
  list: (p) => api.get(`${BASE}/leave-requests`, { params: p }),
  create: (d) => api.post(`${BASE}/leave-requests`, d),
  update: (id, d) => api.put(`${BASE}/leave-requests/${id}`, d),
}

export const departmentApi = {
  list: () => api.get(`${BASE}/departments`),
  create: (d) => api.post(`${BASE}/departments`, d),
  delete: (id) => api.delete(`${BASE}/departments/${id}`),
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

export default api
