import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { XCircle, Calendar, Clock, User, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { bookingsApi } from '@/services/api'
import { Spinner } from '@/components/ui'
import { durationLabel } from '@/lib/utils'
import toast from 'react-hot-toast'

export default function CancelPage() {
  const { token } = useParams()
  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [cancelling, setCancelling] = useState(false)
  const [cancelled, setCancelled] = useState(false)
  const [reason, setReason] = useState('')

  useEffect(() => {
    bookingsApi.getConfirmation(token)
      .then(b => {
        setBooking(b)
        if (b.status === 'cancelled') setCancelled(true)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [token])

  async function handleCancel() {
    setCancelling(true)
    try {
      await bookingsApi.cancelByToken(token, reason || null)
      setCancelled(true)
      toast.success('Meeting cancelled')
    } catch (e) {
      toast.error(e.message)
    } finally {
      setCancelling(false)
    }
  }

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
        <p className="text-gray-500 text-sm">{error}</p>
      </div>
    </div>
  )

  const et = booking.event_type
  const host = booking.host

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

          {cancelled ? (
            /* ── Already/Just cancelled ── */
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={32} className="text-red-500" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Meeting cancelled</h1>
              <p className="text-gray-500 text-sm mb-8">
                Your meeting has been cancelled. Both you and {host.name} have been notified.
              </p>
              <Link
                to={`/${host.username}`}
                className="btn-primary inline-flex"
              >
                Book a new time
              </Link>
            </div>
          ) : (
            /* ── Confirm cancellation ── */
            <>
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle size={32} className="text-amber-500" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Cancel this meeting?</h1>
                <p className="text-gray-500 text-sm mt-2">
                  This will cancel the meeting and notify all parties.
                </p>
              </div>

              {/* Meeting summary */}
              <div className="card p-5 mb-5">
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-100">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: et.color + '22' }}
                  >
                    <Calendar size={16} style={{ color: et.color }} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{et.name}</p>
                    <p className="text-xs text-gray-500">with {host.name}</p>
                  </div>
                </div>
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar size={14} className="text-gray-400" />
                    {format(parseISO(booking.start_time), 'EEEE, MMMM d, yyyy')}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock size={14} className="text-gray-400" />
                    {format(parseISO(booking.start_time), 'h:mm a')} · {durationLabel(et.duration_minutes)}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <User size={14} className="text-gray-400" />
                    {booking.invitee_name}
                  </div>
                </div>
              </div>

              {/* Optional reason */}
              <div className="mb-5">
                <label className="label">Reason for cancelling <span className="text-gray-400 font-normal">(optional)</span></label>
                <textarea
                  className="input resize-none"
                  rows={3}
                  placeholder="Let them know why you're cancelling..."
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <Link
                  to={`/booking/confirmed/${token}`}
                  className="btn-secondary flex-1 text-center"
                >
                  Keep meeting
                </Link>
                <button
                  className="btn-danger flex-1"
                  onClick={handleCancel}
                  disabled={cancelling}
                >
                  {cancelling ? (
                    <Spinner size={16} className="text-white" />
                  ) : (
                    <XCircle size={15} />
                  )}
                  Cancel meeting
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
