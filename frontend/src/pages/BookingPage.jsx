import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Globe,
  Calendar,
  User,
  Mail,
  FileText,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  isPast,
  parseISO,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import {
  eventTypesApi,
  availabilityApi,
  bookingsApi,
  userApi,
} from "@/services/api";
import { Spinner } from "@/components/ui";
import { durationLabel, TIMEZONES } from "@/lib/utils";
import toast from "react-hot-toast";
import clsx from "clsx";

export default function BookingPage() {
  const { username, slug } = useParams();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [eventType, setEventType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [availableDays, setAvailableDays] = useState([]);
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  );

  const [step, setStep] = useState("calendar"); // 'calendar' | 'form'
  const [form, setForm] = useState({ name: "", email: "", notes: "" });
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [u, et, daysData] = await Promise.all([
          userApi.getByUsername(username),
          eventTypesApi.getBySlug(username, slug),
          availabilityApi.getAvailableDays(username),
        ]);
        setUser(u);
        setEventType(et);
        setAvailableDays(daysData.available_days || []);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [username, slug]);

  const fetchSlots = useCallback(
    async (date) => {
      if (!date) return;
      setSlotsLoading(true);
      setSlots([]);
      setSelectedSlot(null);
      try {
        const dateStr = format(date, "yyyy-MM-dd");
        const data = await availabilityApi.getSlots(
          username,
          slug,
          dateStr,
          timezone,
        );
        setSlots(data.slots || []);
      } catch (e) {
        toast.error("Could not load time slots");
      } finally {
        setSlotsLoading(false);
      }
    },
    [username, slug, timezone],
  );

  function handleDateSelect(day) {
    if (!isDayAvailable(day)) return;
    setSelectedDate(day);
    fetchSlots(day);
    setSelectedSlot(null);
    setStep("calendar");
  }

  function isDayAvailable(day) {
    if (isPast(day) && !isToday(day)) return false;
    const dateStr = format(day, "yyyy-MM-dd");
    return availableDays.includes(dateStr);
  }

  async function handleBook() {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!form.email.trim() || !emailRegex.test(form.email)) {
      toast.error("Please enter a valid email address");
      return;
    }
    setBooking(true);
    try {
      const meeting = await bookingsApi.create(username, slug, {
        invitee_name: form.name,
        invitee_email: form.email,
        invitee_notes: form.notes || null,
        start_time: selectedSlot.start_time,
        timezone,
      });
      navigate(`/booking/confirmed/${meeting.booking_token}`);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBooking(false);
    }
  }

  if (loading)
    return (
      <div className="min-h-screen bg-[#f8faff] flex items-center justify-center">
        <Spinner size={36} />
      </div>
    );

  if (error || !eventType)
    return (
      <div className="min-h-screen bg-[#f8faff] flex items-center justify-center text-center px-4">
        <div>
          <div className="text-6xl mb-4">😕</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            Event not found
          </h1>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    );

  // Build calendar grid
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calDays = eachDayOfInterval({ start: calStart, end: calEnd });

  const showForm = step === "form" && selectedSlot;

  return (
    <div className="min-h-screen bg-[#f8faff]">
      {/* Top nav */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(`/${username}`)}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft size={15} /> Back
          </button>
          <span className="text-gray-300">|</span>
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded bg-[#0069ff] flex items-center justify-center">
              <Calendar size={11} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-gray-700">
              Schedulr
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-[320px_1fr] gap-6">
          {/* Left: Event info */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 h-fit">
            <div className="flex items-center gap-2 mb-1">
              <img
                src={
                  user?.avatar_url ||
                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name}`
                }
                alt={user?.name}
                className="w-8 h-8 rounded-full"
              />
              <span className="text-sm text-gray-600 font-medium">
                {user?.name}
              </span>
            </div>

            <div
              className="w-1 h-8 rounded-full mt-4 mb-2"
              style={{ backgroundColor: eventType.color }}
            />
            <h1 className="text-xl font-bold text-gray-900">
              {eventType.name}
            </h1>
            {eventType.description && (
              <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                {eventType.description}
              </p>
            )}

            <div className="mt-4 space-y-2.5">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock size={15} className="text-gray-400" />
                {durationLabel(eventType.duration_minutes)}
              </div>
              {eventType.location && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin size={15} className="text-gray-400" />
                  {eventType.location}
                </div>
              )}
              {selectedDate && selectedSlot && (
                <div className="flex items-start gap-2 text-sm text-gray-600">
                  <Calendar size={15} className="text-gray-400 mt-0.5" />
                  <div>
                    <div className="font-medium">
                      {format(selectedDate, "EEEE, MMMM d")}
                    </div>
                    <div className="text-gray-500">
                      {format(parseISO(selectedSlot.start_time), "h:mm a")} –{" "}
                      {format(parseISO(selectedSlot.end_time), "h:mm a")}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Timezone */}
            <div className="mt-5 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-1.5 mb-2">
                <Globe size={13} className="text-gray-400" />
                <span className="text-xs font-medium text-gray-500">
                  Timezone
                </span>
              </div>
              <select
                value={timezone}
                onChange={(e) => {
                  setTimezone(e.target.value);
                  if (selectedDate) fetchSlots(selectedDate);
                }}
                className="w-full text-xs px-2.5 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0069ff]"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Right: Calendar / Slots / Form */}
          <div className="bg-white rounded-2xl border border-gray-100">
            {!showForm ? (
              <div className="flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
                {/* Calendar */}
                <div className="flex-1 p-6">
                  {/* Month nav */}
                  <div className="flex items-center justify-between mb-5">
                    <button
                      onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
                      className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <ChevronLeft size={18} className="text-gray-600" />
                    </button>
                    <span className="font-semibold text-gray-900">
                      {format(currentMonth, "MMMM yyyy")}
                    </span>
                    <button
                      onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
                      className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <ChevronRight size={18} className="text-gray-600" />
                    </button>
                  </div>

                  {/* Day headers */}
                  <div className="grid grid-cols-7 mb-2">
                    {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                      <div
                        key={d}
                        className="text-center text-xs font-medium text-gray-400 py-1"
                      >
                        {d}
                      </div>
                    ))}
                  </div>

                  {/* Days */}
                  <div className="grid grid-cols-7 gap-y-1">
                    {calDays.map((day) => {
                      const inMonth = isSameMonth(day, currentMonth);
                      const available = isDayAvailable(day);
                      const selected =
                        selectedDate && isSameDay(day, selectedDate);
                      const today = isToday(day);

                      return (
                        <div
                          key={day.toISOString()}
                          className="flex justify-center"
                        >
                          <button
                            disabled={!available || !inMonth}
                            onClick={() => handleDateSelect(day)}
                            className={clsx(
                              "w-9 h-9 rounded-full text-sm flex items-center justify-center transition-all duration-150",
                              !inMonth && "invisible",
                              selected &&
                                "bg-[#0069ff] text-white font-semibold shadow-md",
                              !selected &&
                                available &&
                                "font-semibold text-gray-900 hover:bg-blue-50 hover:text-[#0069ff] cursor-pointer",
                              !selected &&
                                !available &&
                                "text-gray-300 cursor-not-allowed",
                              today &&
                                !selected &&
                                "ring-2 ring-[#0069ff] ring-offset-1",
                            )}
                          >
                            {format(day, "d")}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Time slots */}
                {selectedDate && (
                  <div className="w-full sm:w-52 p-5 flex flex-col">
                    <h3 className="text-sm font-semibold text-gray-900 mb-1">
                      {format(selectedDate, "EEE, MMM d")}
                    </h3>
                    <p className="text-xs text-gray-400 mb-4">{timezone}</p>

                    {slotsLoading ? (
                      <div className="flex justify-center py-8">
                        <Spinner size={24} />
                      </div>
                    ) : slots.length === 0 ? (
                      <div className="text-center py-8">
                        <Clock
                          size={24}
                          className="mx-auto text-gray-300 mb-2"
                        />
                        <p className="text-sm text-gray-500">
                          No slots available
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Try another day
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-y-auto flex-1 space-y-2 pr-1 max-h-64 sm:max-h-none scrollbar-hide">
                        {slots.map((slot, i) => {
                          const isSelected =
                            selectedSlot?.start_time === slot.start_time;
                          return (
                            <button
                              key={i}
                              onClick={() => {
                                if (isSelected) {
                                  setStep("form");
                                } else {
                                  setSelectedSlot(slot);
                                }
                              }}
                              className={clsx(
                                "w-full py-2.5 rounded-lg border-2 text-sm font-semibold transition-all duration-150",
                                isSelected
                                  ? "border-[#0069ff] bg-[#0069ff] text-white"
                                  : "border-[#0069ff] text-[#0069ff] hover:bg-[#0069ff] hover:text-white",
                              )}
                            >
                              {format(parseISO(slot.start_time), "h:mm a")}
                              {isSelected && (
                                <span className="block text-xs font-normal opacity-80 mt-0.5">
                                  Tap to confirm →
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* Booking form */
              <div className="p-6 max-w-md">
                <button
                  onClick={() => setStep("calendar")}
                  className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors"
                >
                  <ChevronLeft size={15} /> Back
                </button>

                <h2 className="text-lg font-bold text-gray-900 mb-1">
                  Enter your details
                </h2>
                <p className="text-sm text-gray-500 mb-6">
                  {format(selectedDate, "EEEE, MMMM d")} at{" "}
                  {format(parseISO(selectedSlot.start_time), "h:mm a")} ·{" "}
                  {durationLabel(eventType.duration_minutes)}
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="label">Your name *</label>
                    <div className="relative">
                      <User
                        size={15}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                      <input
                        className="input pl-9"
                        placeholder="Jane Smith"
                        value={form.name}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, name: e.target.value }))
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label">Email address *</label>
                    <div className="relative">
                      <Mail
                        size={15}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                      <input
                        type="email"
                        className="input pl-9"
                        placeholder="jane@example.com"
                        value={form.email}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, email: e.target.value }))
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label">
                      Additional notes{" "}
                      <span className="text-gray-400 font-normal">
                        (optional)
                      </span>
                    </label>
                    <div className="relative">
                      <FileText
                        size={15}
                        className="absolute left-3 top-3 text-gray-400"
                      />
                      <textarea
                        className="input pl-9 resize-none"
                        rows={3}
                        placeholder="Anything you'd like to share before the meeting..."
                        value={form.notes}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, notes: e.target.value }))
                        }
                      />
                    </div>
                  </div>

                  <p className="text-xs text-gray-400">
                    By scheduling, you confirm that you agree to receive a
                    confirmation email at the address provided.
                  </p>

                  <button
                    className="btn-primary w-full py-3 text-base"
                    onClick={handleBook}
                    disabled={booking}
                  >
                    {booking ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Confirming...
                      </>
                    ) : (
                      "Confirm booking"
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
