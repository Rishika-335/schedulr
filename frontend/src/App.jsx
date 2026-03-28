import { Routes, Route, Navigate } from 'react-router-dom'
import DashboardLayout from '@/components/layout/DashboardLayout'
import EventTypesPage from '@/pages/EventTypesPage'
import AvailabilityPage from '@/pages/AvailabilityPage'
import MeetingsPage from '@/pages/MeetingsPage'
import PublicProfilePage from '@/pages/PublicProfilePage'
import BookingPage from '@/pages/BookingPage'
import ConfirmationPage from '@/pages/ConfirmationPage'
import CancelPage from '@/pages/CancelPage'
import NotFoundPage from '@/pages/NotFoundPage'

export default function App() {
  return (
    <Routes>
      {/* Dashboard (admin) routes */}
      <Route path="/dashboard" element={<DashboardLayout />}>
        <Route index element={<Navigate to="/dashboard/event-types" replace />} />
        <Route path="event-types" element={<EventTypesPage />} />
        <Route path="availability" element={<AvailabilityPage />} />
        <Route path="meetings" element={<MeetingsPage />} />
      </Route>

      {/* Public booking routes */}
      <Route path="/:username" element={<PublicProfilePage />} />
      <Route path="/:username/:slug" element={<BookingPage />} />
      <Route path="/booking/confirmed/:token" element={<ConfirmationPage />} />
      <Route path="/cancel/:token" element={<CancelPage />} />

      {/* Root → dashboard */}
      <Route path="/" element={<Navigate to="/dashboard/event-types" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
