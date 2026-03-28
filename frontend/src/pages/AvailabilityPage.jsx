import { useState, useEffect } from 'react'
import { Clock, Save, Globe, Plus, Trash2, Info } from 'lucide-react'
import { availabilityApi } from '@/services/api'
import { PageHeader, Spinner } from '@/components/ui'
import { TIMEZONES, DAY_FULL } from '@/lib/utils'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const DAYS_ORDER = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday']

const DEFAULT_SLOTS = DAYS_ORDER.map(day => ({
  day_of_week: day,
  start_time: '09:00',
  end_time: '17:00',
  is_available: ['monday','tuesday','wednesday','thursday','friday'].includes(day),
}))

function dayLabel(day) {
  return DAY_FULL[['sunday','monday','tuesday','wednesday','thursday','friday','saturday'].indexOf(day)]
}

export default function AvailabilityPage() {
  const [schedule, setSchedule] = useState(null)
  const [slots, setSlots] = useState(DEFAULT_SLOTS)
  const [timezone, setTimezone] = useState('America/New_York')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchSchedule() }, [])

  async function fetchSchedule() {
    try {
      const schedules = await availabilityApi.listSchedules()
      if (schedules.length > 0) {
        const s = schedules[0]
        setSchedule(s)
        setTimezone(s.timezone)

        // Merge with defaults
        const merged = DAYS_ORDER.map(day => {
          const existing = s.weekly_slots.find(ws => ws.day_of_week === day)
          if (existing) return existing
          return {
            day_of_week: day,
            start_time: '09:00',
            end_time: '17:00',
            is_available: false,
          }
        })
        setSlots(merged)
      }
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  function toggleDay(day) {
    setSlots(s => s.map(slot =>
      slot.day_of_week === day ? { ...slot, is_available: !slot.is_available } : slot
    ))
  }

  function updateSlot(day, field, value) {
    setSlots(s => s.map(slot =>
      slot.day_of_week === day ? { ...slot, [field]: value } : slot
    ))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const data = {
        name: 'Working Hours',
        timezone,
        is_default: true,
        weekly_slots: slots,
      }
      if (schedule) {
        const updated = await availabilityApi.updateSchedule(schedule.id, data)
        setSchedule(updated)
      } else {
        const created = await availabilityApi.createSchedule(data)
        setSchedule(created)
      }
      toast.success('Availability saved!')
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="flex justify-center h-64 items-center"><Spinner size={32} /></div>
  }

  const availableDays = slots.filter(s => s.is_available).length

  return (
    <>
      <PageHeader
        title="Availability"
        subtitle="Set when you're available for bookings"
        action={
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <Spinner size={16} className="text-white" /> : <Save size={15} />}
            Save changes
          </button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main schedule */}
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-semibold text-gray-900">Weekly hours</h2>
              <p className="text-xs text-gray-500 mt-0.5">{availableDays} days available</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200">
              <Globe size={14} className="text-gray-500" />
              <select
                value={timezone}
                onChange={e => setTimezone(e.target.value)}
                className="text-sm text-gray-700 bg-transparent focus:outline-none"
              >
                {TIMEZONES.map(tz => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-3">
            {slots.map(slot => (
              <DayRow
                key={slot.day_of_week}
                slot={slot}
                onToggle={() => toggleDay(slot.day_of_week)}
                onUpdate={(field, val) => updateSlot(slot.day_of_week, field, val)}
              />
            ))}
          </div>
        </div>

        {/* Tips sidebar */}
        <div className="space-y-4">
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Info size={15} className="text-[#0069ff]" />
              <h3 className="text-sm font-semibold text-gray-900">How it works</h3>
            </div>
            <ul className="space-y-2.5 text-xs text-gray-600">
              <li className="flex gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0069ff] mt-1.5 flex-shrink-0" />
                Toggle days on/off to mark them as available
              </li>
              <li className="flex gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0069ff] mt-1.5 flex-shrink-0" />
                Set specific start and end times for each day
              </li>
              <li className="flex gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0069ff] mt-1.5 flex-shrink-0" />
                Your timezone is applied to all availability windows
              </li>
              <li className="flex gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0069ff] mt-1.5 flex-shrink-0" />
                Buffer times set on event types are respected automatically
              </li>
            </ul>
          </div>

          <div className="card p-5 bg-blue-50 border-blue-100">
            <h3 className="text-sm font-semibold text-blue-900 mb-1">Current timezone</h3>
            <p className="text-sm text-blue-700 font-medium">{timezone}</p>
            <p className="text-xs text-blue-600 mt-1">All booking times are displayed in the invitee's local timezone automatically.</p>
          </div>
        </div>
      </div>
    </>
  )
}

function DayRow({ slot, onToggle, onUpdate }) {
  const times = []
  for (let h = 0; h < 24; h++) {
    for (let m of [0, 30]) {
      const hh = String(h).padStart(2, '0')
      const mm = String(m).padStart(2, '0')
      times.push(`${hh}:${mm}`)
    }
  }

  function fmt(t) {
    const [hStr, mStr] = t.split(':')
    const h = parseInt(hStr)
    const m = mStr
    const period = h >= 12 ? 'PM' : 'AM'
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
    return `${h12}:${m} ${period}`
  }

  return (
    <div className={clsx(
      'flex items-center gap-4 px-4 py-3 rounded-xl border transition-all',
      slot.is_available ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50'
    )}>
      {/* Toggle */}
      <button
        onClick={onToggle}
        className={clsx(
          'w-10 h-6 rounded-full relative transition-all duration-200 flex-shrink-0',
          slot.is_available ? 'bg-[#0069ff]' : 'bg-gray-200'
        )}
      >
        <span className={clsx(
          'absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-200',
          slot.is_available ? 'left-5' : 'left-1'
        )} />
      </button>

      {/* Day name */}
      <span className={clsx(
        'w-20 text-sm font-medium flex-shrink-0',
        slot.is_available ? 'text-gray-900' : 'text-gray-400'
      )}>
        {dayLabel(slot.day_of_week)}
      </span>

      {/* Time selects */}
      {slot.is_available ? (
        <div className="flex items-center gap-2 flex-1">
          <select
            value={slot.start_time}
            onChange={e => onUpdate('start_time', e.target.value)}
            className="flex-1 px-2.5 py-1.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0069ff] bg-white"
          >
            {times.map(t => <option key={t} value={t}>{fmt(t)}</option>)}
          </select>
          <span className="text-gray-400 text-sm">–</span>
          <select
            value={slot.end_time}
            onChange={e => onUpdate('end_time', e.target.value)}
            className="flex-1 px-2.5 py-1.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0069ff] bg-white"
          >
            {times.map(t => <option key={t} value={t}>{fmt(t)}</option>)}
          </select>
        </div>
      ) : (
        <span className="text-sm text-gray-400 flex-1">Unavailable</span>
      )}
    </div>
  )
}
