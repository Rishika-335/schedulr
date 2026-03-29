import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'




const api = axios.create({
  baseURL: `${API_BASE}/api/v1`,
  headers: { 
    'Content-Type': 'application/json',
    'X-API-Key': import.meta.env.VITE_API_KEY || 'schedulr-admin-secret-2024'
  },
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const data = err.response?.data
    let msg = 'Something went wrong'
    if (typeof data?.detail === 'string') {
      msg = data.detail
    } else if (Array.isArray(data?.detail)) {
      msg = data.detail.map(e => e.msg).join(', ')
    } else if (err.message) {
      msg = err.message
    }
    return Promise.reject(new Error(msg))
  }
)

// ── Users ─────────────────────────────────────────────────────────────────────
export const userApi = {
  getMe: () => api.get('/users/me').then(r => r.data),
  updateMe: (data) => api.patch('/users/me', data).then(r => r.data),
  getByUsername: (username) => api.get(`/users/${username}`).then(r => r.data),
}

// ── Event Types ───────────────────────────────────────────────────────────────
export const eventTypesApi = {
  list: () => api.get('/event-types/').then(r => r.data),
  listPublic: (username) => api.get(`/event-types/public/${username}`).then(r => r.data),
  get: (id) => api.get(`/event-types/${id}`).then(r => r.data),
  getBySlug: (username, slug) => api.get(`/event-types/by-slug/${username}/${slug}`).then(r => r.data),
  create: (data) => api.post('/event-types/', data).then(r => r.data),
  update: (id, data) => api.patch(`/event-types/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/event-types/${id}`),
}

// ── Availability ──────────────────────────────────────────────────────────────
export const availabilityApi = {
  listSchedules: () => api.get('/availability/schedules').then(r => r.data),
  getSchedule: (id) => api.get(`/availability/schedules/${id}`).then(r => r.data),
  createSchedule: (data) => api.post('/availability/schedules', data).then(r => r.data),
  updateSchedule: (id, data) => api.patch(`/availability/schedules/${id}`, data).then(r => r.data),
  deleteSchedule: (id) => api.delete(`/availability/schedules/${id}`),
  addOverride: (scheduleId, data) => api.post(`/availability/schedules/${scheduleId}/overrides`, data).then(r => r.data),
  getSlots: (username, slug, date, timezone = 'UTC') =>
    api.get(`/availability/slots/${username}/${slug}`, { params: { date, timezone } }).then(r => r.data),
  getAvailableDays: (username) =>
    api.get(`/availability/available-days/${username}`).then(r => r.data),
}

// ── Bookings ──────────────────────────────────────────────────────────────────
export const bookingsApi = {
  create: (username, slug, data) => api.post(`/bookings/${username}/${slug}`, data).then(r => r.data),
  getConfirmation: (token) => api.get(`/bookings/confirmation/${token}`).then(r => r.data),
  cancelByToken: (token, reason) =>
    api.post(`/bookings/cancel/${token}`, null, { params: { cancel_reason: reason } }).then(r => r.data),
  reschedule: (token, data) => api.post(`/bookings/reschedule/${token}`, data).then(r => r.data),
}

// ── Meetings ──────────────────────────────────────────────────────────────────
export const meetingsApi = {
  list: (params) => api.get('/meetings/', { params }).then(r => r.data),
  get: (id) => api.get(`/meetings/${id}`).then(r => r.data),
  cancel: (id, data) => api.post(`/meetings/${id}/cancel`, data).then(r => r.data),
  stats: () => api.get('/meetings/stats/summary').then(r => r.data),
}

export default api
