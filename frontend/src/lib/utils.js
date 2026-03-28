import { format, formatDistanceToNow, isPast, isFuture, parseISO } from 'date-fns'

export function formatDate(dateStr, fmt = 'EEEE, MMMM d, yyyy') {
  const d = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr
  return format(d, fmt)
}

export function formatTime(dateStr, fmt = 'h:mm a') {
  const d = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr
  return format(d, fmt)
}

export function formatDatetime(dateStr) {
  const d = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr
  return format(d, 'EEE, MMM d · h:mm a')
}

export function formatRelative(dateStr) {
  const d = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr
  return formatDistanceToNow(d, { addSuffix: true })
}

export function isUpcoming(dateStr) {
  return isFuture(typeof dateStr === 'string' ? parseISO(dateStr) : dateStr)
}

export function isPastDate(dateStr) {
  return isPast(typeof dateStr === 'string' ? parseISO(dateStr) : dateStr)
}

export function durationLabel(minutes) {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h}h ${m}m` : `${h} hour${h > 1 ? 's' : ''}`
}

export function slugify(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export function statusColor(status) {
  const map = {
    scheduled: 'badge-blue',
    completed: 'badge-green',
    cancelled: 'badge-red',
    rescheduled: 'badge-purple',
  }
  return map[status] || 'badge-gray'
}

export function statusLabel(status) {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

export function eventColor(color) {
  return color || '#0069ff'
}

export const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Vancouver',
  'America/Toronto',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Moscow',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney',
  'Pacific/Auckland',
]

export const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
export const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const DAY_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export const DURATION_OPTIONS = [15, 20, 30, 45, 60, 90, 120]

export const COLOR_PRESETS = [
  '#0069ff', '#00a2ff', '#7c3aed', '#ec4899',
  '#10b981', '#f59e0b', '#ef4444', '#06b6d4',
  '#8b5cf6', '#f97316', '#14b8a6', '#6366f1',
]
