import { useState, useEffect } from 'react'
import { Calendar, Clock, User, MapPin, X, ChevronRight, CheckCircle2, XCircle, RotateCcw } from 'lucide-react'
import { meetingsApi } from '@/services/api'
import { ConfirmDialog, EmptyState, PageHeader, Spinner } from '@/components/ui'
import { formatDate, formatTime, formatRelative, isUpcoming, statusColor, statusLabel, durationLabel } from '@/lib/utils'
import { parseISO } from 'date-fns'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const TABS = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'past',     label: 'Past' },
  { key: 'all',      label: 'All' },
]

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState([])
  const [tab, setTab] = useState('upcoming')
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({})
  const [cancelId, setCancelId] = useState(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const [selectedMeeting, setSelectedMeeting] = useState(null)

  useEffect(() => {
    fetchMeetings()
    fetchStats()
  }, [tab])

  async function fetchMeetings() {
    setLoading(true)
    try {
      const data = await meetingsApi.list({ period: tab })
      setMeetings(data)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function fetchStats() {
    try {
      const s = await meetingsApi.stats()
      setStats(s)
    } catch {}
  }

  async function handleCancel() {
    setCancelling(true)
    try {
      await meetingsApi.cancel(cancelId, { cancel_reason: cancelReason || null })
      setMeetings(m => m.map(mt => mt.id === cancelId ? { ...mt, status: 'cancelled', cancel_reason: cancelReason } : mt))
      toast.success('Meeting cancelled')
      setCancelId(null)
      setCancelReason('')
      setSelectedMeeting(null)
      fetchStats()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setCancelling(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Meetings"
        subtitle="Manage your scheduled meetings"
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Upcoming', value: stats.upcoming ?? '–', color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Completed', value: stats.completed ?? '–', color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Cancelled', value: stats.cancelled ?? '–', color: 'text-red-500', bg: 'bg-red-50' },
          { label: 'Total', value: stats.total ?? '–', color: 'text-gray-700', bg: 'bg-gray-100' },
        ].map(s => (
          <div key={s.label} className="card p-4 text-center">
            <div className={clsx('text-2xl font-bold mb-1', s.color)}>{s.value}</div>
            <div className="text-xs text-gray-500 font-medium">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={clsx(
              'px-5 py-2 rounded-lg text-sm font-medium transition-all',
              tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size={32} /></div>
      ) : meetings.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title={tab === 'upcoming' ? 'No upcoming meetings' : 'No meetings found'}
          description={tab === 'upcoming' ? 'Share your booking link to start getting scheduled.' : 'Meetings will appear here once booked.'}
        />
      ) : (
        <div className="space-y-3">
          {meetings.map(m => (
            <MeetingRow
              key={m.id}
              meeting={m}
              onCancel={() => setCancelId(m.id)}
              onClick={() => setSelectedMeeting(m)}
            />
          ))}
        </div>
      )}

      {/* Cancel confirm */}
      <ConfirmDialog
        isOpen={!!cancelId}
        onClose={() => { setCancelId(null); setCancelReason('') }}
        onConfirm={handleCancel}
        title="Cancel Meeting"
        message={
          <div className="space-y-3">
            <p>Are you sure you want to cancel this meeting? The invitee will be notified by email.</p>
            <div>
              <label className="label">Reason (optional)</label>
              <input
                className="input"
                placeholder="e.g. Schedule conflict..."
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
              />
            </div>
          </div>
        }
        confirmLabel="Cancel meeting"
        danger
        loading={cancelling}
      />

      {/* Meeting detail modal */}
      {selectedMeeting && (
        <MeetingDetailModal
          meeting={selectedMeeting}
          onClose={() => setSelectedMeeting(null)}
          onCancel={() => { setSelectedMeeting(null); setCancelId(selectedMeeting.id) }}
        />
      )}
    </>
  )
}

function MeetingRow({ meeting: m, onCancel, onClick }) {
  const upcoming = isUpcoming(m.start_time)
  const et = m.event_type

  return (
    <div
      className="card px-5 py-4 flex items-center gap-4 hover:shadow-md transition-all cursor-pointer"
      onClick={onClick}
    >
      {/* Color dot */}
      <div
        className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center"
        style={{ backgroundColor: et.color + '22' }}
      >
        <Calendar size={18} style={{ color: et.color }} />
      </div>

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-gray-900 text-sm">{et.name}</span>
          <span className={statusColor(m.status)}>{statusLabel(m.status)}</span>
        </div>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <User size={11} /> {m.invitee_name}
          </span>
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <Clock size={11} /> {formatDate(m.start_time, 'MMM d, yyyy')} · {formatTime(m.start_time)}
          </span>
          {m.location && (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <MapPin size={11} /> {m.location}
            </span>
          )}
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {upcoming && m.status === 'scheduled' && (
          <button
            onClick={e => { e.stopPropagation(); onCancel() }}
            className="btn-ghost text-xs text-red-500 hover:bg-red-50 px-3 py-1.5"
          >
            <X size={13} /> Cancel
          </button>
        )}
        <ChevronRight size={16} className="text-gray-400" />
      </div>
    </div>
  )
}

function MeetingDetailModal({ meeting: m, onClose, onCancel }) {
  const upcoming = isUpcoming(m.start_time)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl animate-scale-in">
        {/* Header */}
        <div
          className="px-6 py-5 rounded-t-2xl"
          style={{ backgroundColor: m.event_type.color + '15', borderBottom: `3px solid ${m.event_type.color}` }}
        >
          <div className="flex items-start justify-between">
            <div>
              <span className={clsx(statusColor(m.status), 'mb-2 inline-block')}>{statusLabel(m.status)}</span>
              <h2 className="text-lg font-bold text-gray-900">{m.event_type.name}</h2>
              <p className="text-sm text-gray-600 mt-0.5">{durationLabel(m.event_type.duration_minutes)}</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/50">
              <X size={18} className="text-gray-600" />
            </button>
          </div>
        </div>

        {/* Details */}
        <div className="px-6 py-5 space-y-4">
          <DetailRow icon={User} label="Invitee" value={`${m.invitee_name} · ${m.invitee_email}`} />
          <DetailRow icon={Calendar} label="Date" value={formatDate(m.start_time, 'EEEE, MMMM d, yyyy')} />
          <DetailRow icon={Clock} label="Time" value={`${formatTime(m.start_time)} – ${formatTime(m.end_time)} (${m.timezone})`} />
          {m.location && <DetailRow icon={MapPin} label="Location" value={m.location} />}
          {m.invitee_notes && (
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs font-medium text-gray-500 mb-1">Notes from invitee</p>
              <p className="text-sm text-gray-700">{m.invitee_notes}</p>
            </div>
          )}
          {m.cancel_reason && (
            <div className="bg-red-50 rounded-xl p-3">
              <p className="text-xs font-medium text-red-500 mb-1">Cancellation reason</p>
              <p className="text-sm text-red-700">{m.cancel_reason}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        {upcoming && m.status === 'scheduled' && (
          <div className="px-6 pb-5 flex gap-3">
            <button className="btn-danger flex-1" onClick={onCancel}>
              <X size={14} /> Cancel meeting
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
        <Icon size={15} className="text-gray-600" />
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-sm text-gray-900 font-medium mt-0.5">{value}</p>
      </div>
    </div>
  )
}
