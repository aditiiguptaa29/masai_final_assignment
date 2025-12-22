'use client'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Button } from '@/components/ui/Button'
import { useState, useEffect } from 'react'
import {
  MapPin,
  Navigation,
  CheckCircle,
  Clock,
  Package,
  User,
  Phone,
  Calendar
} from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { tripApi } from '@/lib/api'

const statusColors: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-green-100 text-green-800',
  completed: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800'
}

export default function DriverTripsPage() {
  const [trips, setTrips] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    fetchTrips()
  }, [])

  const fetchTrips = async () => {
    try {
      setLoading(true)
      const response = await tripApi.getDriverTrips()
      setTrips(response.data.data || [])
    } catch {
      toast.error('Failed to load trips')
    } finally {
      setLoading(false)
    }
  }

  const handleStartTrip = async (id: string) => {
    try {
      const input = typeof window !== 'undefined' ? window.prompt('Enter starting odometer (km):', '0') : '0'
      const odometer = input ? Number(input) : 0
      await tripApi.start(id, { odometer })
      toast.success('Trip started')
      fetchTrips()
    } catch {
      toast.error('Failed to start trip')
    }
  }

  const handleCompleteTrip = async (id: string) => {
    try {
      const input = typeof window !== 'undefined' ? window.prompt('Enter ending odometer (km):', '0') : '0'
      const odometer = input ? Number(input) : 0
      await tripApi.complete(id, { odometer })
      toast.success('Trip completed')
      fetchTrips()
    } catch {
      toast.error('Failed to complete trip')
    }
  }

  const filteredTrips = trips.filter(
    (t) => statusFilter === 'all' || t.status === statusFilter
  )

  const activeTrips = trips.filter(
    (t) => t.status === 'scheduled' || t.status === 'in_progress'
  )

  const todayEarnings = trips
    .filter(
      (t) =>
        t.status === 'completed' &&
        new Date(t.updatedAt).toDateString() ===
          new Date().toDateString()
    )
    .reduce((sum, t) => sum + (t.earnings?.totalAmount || 0), 0)

  return (
    <ProtectedRoute allowedRoles={['driver']}>
      <DashboardLayout role="driver">
        <div className="py-6">
          <div className="max-w-7xl mx-auto px-4">

            {/* HEADER */}
            <div className="mb-6">
              <h1 className="text-2xl font-semibold text-gray-900">
                My Trips
              </h1>
              <p className="text-sm text-gray-600">
                Manage your assigned rides
              </p>
            </div>

            {/* STATS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
              <StatCard
                label="Active Trips"
                value={activeTrips.length}
                icon={<Navigation className="h-6 w-6 text-blue-600" />}
                bg="bg-blue-100"
              />
              <StatCard
                label="Today's Earnings"
                value={`$${todayEarnings.toFixed(2)}`}
                icon={<Package className="h-6 w-6 text-green-600" />}
                bg="bg-green-100"
              />
              <StatCard
                label="Total Trips"
                value={trips.length}
                icon={<Clock className="h-6 w-6 text-purple-600" />}
                bg="bg-purple-100"
              />
            </div>

            {/* FILTER */}
            <div className="bg-white border rounded-xl p-4 mb-6 flex flex-wrap gap-2">
              {['all', 'scheduled', 'in_progress', 'completed'].map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={statusFilter === s ? 'primary' : 'outline'}
                  onClick={() => setStatusFilter(s)}
                >
                  {s.replace('_', ' ').toUpperCase()}
                </Button>
              ))}
            </div>

            {/* TRIPS LIST */}
            {loading ? (
              <Loader />
            ) : filteredTrips.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="space-y-5">
                {filteredTrips.map((trip) => {
                  const booking = trip.booking || {}
                  const customer =
                    `${booking.customer?.profile?.firstName || ''} ${booking.customer?.profile?.lastName || ''}`.trim() ||
                    'Customer'

                  const vehicle =
                    `${booking.vehicle?.year || ''} ${booking.vehicle?.make || ''} ${booking.vehicle?.modelName || ''}`.trim()

                  return (
                    <div
                      key={trip._id}
                      className="bg-white border rounded-xl p-5 hover:shadow-md transition"
                    >
                      {/* HEADER */}
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {vehicle}
                          </h3>
                          <p className="text-xs text-gray-500">
                            #{trip._id.slice(-6).toUpperCase()} • {booking.vehicle?.licensePlate}
                          </p>
                        </div>
                        <span
                          className={`px-3 py-1 text-xs rounded-full font-medium ${statusColors[trip.status]}`}
                        >
                          {trip.status.replace('_', ' ')}
                        </span>
                      </div>

                      {/* CUSTOMER */}
                      <div className="flex flex-wrap gap-4 text-sm mb-3">
                        <div className="flex items-center gap-2 text-gray-700">
                          <User className="h-4 w-4" />
                          {customer}
                        </div>
                        {booking.customer?.profile?.phone && (
                          <a
                            href={`tel:${booking.customer.profile.phone}`}
                            className="flex items-center gap-2 text-primary-600 hover:underline"
                          >
                            <Phone className="h-4 w-4" />
                            {booking.customer.profile.phone}
                          </a>
                        )}
                      </div>

                      {/* DATE */}
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                        <Calendar className="h-4 w-4" />
                        {new Date(booking.scheduledDate?.start).toLocaleDateString()} →{' '}
                        {new Date(booking.scheduledDate?.end).toLocaleDateString()}
                      </div>

                      {/* ROUTE */}
                      <div className="space-y-3 mb-4">
                        <RouteItem
                          label="Pickup"
                          color="text-green-600"
                          address={booking.pickupLocation?.address}
                        />
                        <RouteItem
                          label="Dropoff"
                          color="text-red-600"
                          address={booking.dropoffLocation?.address}
                        />
                      </div>

                      {/* NOTES */}
                      {booking.customerNotes && (
                        <div className="bg-blue-50 p-3 rounded text-sm mb-4">
                          <strong>Note:</strong> {booking.customerNotes}
                        </div>
                      )}

                      {/* FOOTER */}
                      <div className="flex justify-between items-center pt-4 border-t">
                        <div className="text-green-600 font-semibold">
                          ${ (trip.earnings?.totalAmount !== undefined ? Number(trip.earnings.totalAmount).toFixed(2) : '0.00') }
                        </div>

                        <div className="flex gap-2">
                          {trip.status === 'scheduled' && (
                            <Button onClick={() => handleStartTrip(trip._id)}>
                              <Navigation className="h-4 w-4 mr-2" />
                              Start Trip
                            </Button>
                          )}
                          {trip.status === 'in_progress' && (
                            <Button
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => handleCompleteTrip(trip._id)}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Complete
                            </Button>
                          )}
                          <Link href={`/dashboard/driver/trips/${trip._id}`}>
                            <Button variant="outline">Details</Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}

/* ---------- UI HELPERS ---------- */

const StatCard = ({ label, value, icon, bg }: any) => (
  <div className="bg-white border rounded-xl p-4 flex items-center gap-4">
    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${bg}`}>
      {icon}
    </div>
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  </div>
)

const RouteItem = ({ label, address, color }: any) => (
  <div className="flex items-start gap-3 text-sm">
    <MapPin className={`h-5 w-5 mt-0.5 ${color}`} />
    <div>
      <p className="text-xs uppercase text-gray-500">{label}</p>
      <p className="text-gray-900">{address || 'Not specified'}</p>
    </div>
  </div>
)

const Loader = () => (
  <div className="bg-white border rounded-xl py-12 text-center">
    <div className="animate-spin h-10 w-10 border-b-2 border-primary-600 mx-auto mb-3"></div>
    <p className="text-sm text-gray-600">Loading trips…</p>
  </div>
)

const EmptyState = () => (
  <div className="bg-white border rounded-xl py-12 text-center">
    <Navigation className="h-14 w-14 text-gray-300 mx-auto mb-3" />
    <p className="text-gray-600">No trips found</p>
  </div>
)
