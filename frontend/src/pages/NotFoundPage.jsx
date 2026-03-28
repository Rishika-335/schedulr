import { Link } from 'react-router-dom'
import { Calendar } from 'lucide-react'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-[#f8faff] flex flex-col items-center justify-center px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-[#0069ff] flex items-center justify-center mx-auto mb-6 shadow-lg">
        <Calendar size={28} className="text-white" />
      </div>
      <h1 className="text-6xl font-bold text-gray-900 mb-3">404</h1>
      <p className="text-xl text-gray-600 mb-2 font-medium">Page not found</p>
      <p className="text-gray-500 text-sm mb-8 max-w-xs">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link to="/" className="btn-primary">
        Back to dashboard
      </Link>
    </div>
  )
}
