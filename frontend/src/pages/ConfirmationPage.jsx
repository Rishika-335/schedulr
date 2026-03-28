import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { CheckCircle2, Calendar, Clock, MapPin, User, Mail, Globe, ArrowRight, Copy } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { bookingsApi } from '@/services/api'
import { Spinner } from '@/components/ui'
import { durationLabel } from '@/lib/utils'
import toast from 'react-hot-toast'

export default function ConfirmationPage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    bookingsApi.getConfirmation(token)
      .then(setBooking)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [token])

  if (loading) return (
    <div className="min-h-screen bg-[#f8faff] flex items-center justify-center">
      <Spinner size={36} />
    </div>
  )

  if (error || !booking) return (
    <div className="min-h-screen bg-[#f8faff] flex items-center justify-center text-center px-4">
      <div>
        <div className="text-5xl mb-4">😕</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Booking not found</h1>
        <p className="text-gray-500 text-sm mb-6">{error}</p>
        <button onClick={() => navigate('/')} className="btn-primary">Go home</button>
      </div>
    </div>
  )

  const et = booking.event_type
  const host = booking.host

  function copyCalLink() {
    const text = `${et.name} with ${host.name}\n${format(parseISO(booking.start_time), 'EEEE, MMMM d, yyyy')} at ${format(parseISO(booking.start_time), 'h:mm a')}`
    navigator.clipboard.writeText(text)
    toast.success('Details copied!')
  }

  return (
    <div className="min-h-screen bg-[#f8faff] flex flex-col">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-[#0069ff] flex items-center justify-center">
            <Calendar size={11} className="text-white" />
          </div>
          <span className="text-sm font-semibold text-gray-700">Schedulr</span>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          {/* Success header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={32} className="text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">You're scheduled!</h1>
            <p className="text-gray-500 text-sm mt-2">
              A confirmation email has been sent to <strong>{booking.invitee_email}</strong>
            </p>
          </div>

          {/* Booking card */}
          <div className="card p-6 mb-4">
            {/* Event name with color */}
            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gray-100">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: et.color + '22' }}
              >
                <Calendar size={18} style={{ color: et.color }} />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">{et.name}</h2>
                <p className="text-xs text-gray-500">with {host.name}</p>
              </div>
            </div>

            <div className="space-y-3.5">
              <ConfRow icon={Calendar} label="Date">
                {format(parseISO(booking.start_time), 'EEEE, MMMM d, yyyy')}
              </ConfRow>
              <ConfRow icon={Clock} label="Time">
                {format(parseISO(booking.start_time), 'h:mm a')} – {format(parseISO(booking.end_time), 'h:mm a')}
                <span className="text-gray-400 ml-1.5">({durationLabel(et.duration_minutes)})</span>
              </ConfRow>
              <ConfRow icon={Globe} label="Timezone">
                {booking.timezone}
              </ConfRow>
              {booking.location && (
                <ConfRow icon={MapPin} label="Location">
                  {booking.location}
                </ConfRow>
              )}
              <ConfRow icon={User} label="Name">
                {booking.invitee_name}
              </ConfRow>
              <ConfRow icon={Mail} label="Email">
                {booking.invitee_email}
              </ConfRow>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={copyCalLink}
              className="btn-secondary flex-1"
            >
              <Copy size={15} /> Copy details
            </button>
            <Link
              to={`/${host.username}`}
              className="btn-primary flex-1 text-center"
            >
              Book another <ArrowRight size={14} />
            </Link>
          </div>

          {/* Cancel link */}
          <p className="text-center text-xs text-gray-400 mt-5">
            Need to cancel?{' '}
            <Link
              to={`/cancel/${token}`}
              className="text-[#0069ff] hover:underline"
            >
              Cancel this meeting
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

function ConfRow({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
        <Icon size={15} className="text-gray-500" />
      </div>
      <div className="pt-1">
        <p className="text-xs text-gray-400 font-medium leading-none mb-1">{label}</p>
        <p className="text-sm text-gray-900 font-medium leading-snug">{children}</p>
      </div>
    </div>
  )
}
