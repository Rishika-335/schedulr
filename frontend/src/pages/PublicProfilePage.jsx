import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Clock, MapPin, Globe, Calendar, ArrowRight } from 'lucide-react'
import { userApi, eventTypesApi } from '@/services/api'
import { Spinner, DurationBadge } from '@/components/ui'
import { durationLabel } from '@/lib/utils'

export default function PublicProfilePage() {
  const { username } = useParams()
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [eventTypes, setEventTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const [u, ets] = await Promise.all([
          userApi.getByUsername(username),
          eventTypesApi.listPublic(username),
        ])
        setUser(u)
        setEventTypes(ets)
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [username])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8faff] flex items-center justify-center">
        <Spinner size={36} />
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-[#f8faff] flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">User not found</h1>
          <p className="text-gray-500">The scheduling page you're looking for doesn't exist.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8faff]">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-[#0069ff] flex items-center justify-center">
            <Calendar size={13} className="text-white" />
          </div>
          <span className="text-sm font-semibold text-gray-700">Schedulr</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* Profile header */}
        <div className="text-center mb-10">
          <img
            src={user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`}
            alt={user.name}
            className="w-20 h-20 rounded-full mx-auto mb-4 border-4 border-white shadow-md"
          />
          <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
          {user.welcome_message && (
            <p className="text-gray-500 mt-2 max-w-md mx-auto text-sm leading-relaxed">
              {user.welcome_message}
            </p>
          )}
          <div className="flex items-center justify-center gap-1.5 mt-3 text-xs text-gray-400">
            <Globe size={12} />
            <span>{user.timezone}</span>
          </div>
        </div>

        {/* Event types */}
        {eventTypes.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Calendar size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No events available</p>
            <p className="text-sm mt-1">Check back later for bookable events.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
              Select an event type
            </p>
            {eventTypes.map(et => (
              <button
                key={et.id}
                onClick={() => navigate(`/${username}/${et.slug}`)}
                className="w-full card px-6 py-5 text-left hover:shadow-md hover:border-gray-200 transition-all duration-200 group"
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-1.5 self-stretch rounded-full flex-shrink-0"
                    style={{ backgroundColor: et.color, minHeight: 48 }}
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 group-hover:text-[#0069ff] transition-colors">
                      {et.name}
                    </h3>
                    {et.description && (
                      <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{et.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-3 mt-2">
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock size={11} />
                        {durationLabel(et.duration_minutes)}
                      </span>
                      {et.location && (
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <MapPin size={11} />
                          {et.location}
                        </span>
                      )}
                    </div>
                  </div>
                  <ArrowRight
                    size={18}
                    className="text-gray-300 group-hover:text-[#0069ff] transition-colors flex-shrink-0"
                  />
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-10">
          Powered by{' '}
          <span className="font-semibold text-[#0069ff]">Schedulr</span>
        </p>
      </div>
    </div>
  )
}
