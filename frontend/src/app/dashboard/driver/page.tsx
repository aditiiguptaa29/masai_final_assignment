import DashboardLayout from '@/components/layout/DashboardLayout'
import { Car, MapPin, Clock, DollarSign, Calendar, User } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export const revalidate = 60

async function getData() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/login')
  const role = (session.user as any)?.role
  if (role !== 'driver') redirect('/unauthorized')

  const token = (session.user as any)?.backendToken
  const base = process.env.NEXT_PUBLIC_BACKEND_URL as string
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  const res = await fetch(`${base}/trips/driver/trips`, { headers, cache: 'no-store' })
  const json = await res.json()
  const trips = json?.data || []

  const confirmed = trips.filter((t: any) => t.status === 'scheduled').length
  const inProgress = trips.filter((t: any) => t.status === 'in_progress').length
  const completed = trips.filter((t: any) => t.status === 'completed').length

  const todayEarnings = trips
    .filter((t: any) => t.status === 'completed' && new Date(t.updatedAt).toDateString() === new Date().toDateString())
    .reduce((sum: number, t: any) => sum + (t.earnings?.totalAmount || 0), 0)

  const totalEarnings = trips
    .filter((t: any) => t.status === 'completed')
    .reduce((sum: number, t: any) => sum + (t.earnings?.totalAmount || 0), 0)

  return {
    stats: {
      activeTrips: confirmed + inProgress,
      completedTrips: completed,
      totalEarnings,
      todayEarnings,
    },
    assignedTrips: trips.slice(0, 3),
  }
}

export default async function DriverDashboard() {
  const { stats, assignedTrips } = await getData()

  return (
      <DashboardLayout role="driver">
        <div className="py-6">
          <div className="max-w-7xl mx-auto px-4">

            {/* HEADER */}
            <div className="mb-8">
              <h1 className="text-2xl font-semibold text-gray-900">
                Driver Console
              </h1>
              <p className="text-sm text-gray-600">
                View your assigned trips and daily workload
              </p>
            </div>

            {/* STATS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
              <StatCard
                icon={<Car className="h-6 w-6 text-blue-600" />}
                label="Active Trips"
                value={stats.activeTrips}
                bg="bg-blue-100"
              />
              <StatCard
                icon={<Clock className="h-6 w-6 text-green-600" />}
                label="Completed"
                value={stats.completedTrips}
                bg="bg-green-100"
              />
              <StatCard
                icon={<DollarSign className="h-6 w-6 text-purple-600" />}
                label="Total Earnings"
                value={`$${stats.totalEarnings.toLocaleString()}`}
                bg="bg-purple-100"
              />
              <StatCard
                icon={<DollarSign className="h-6 w-6 text-orange-600" />}
                label="Today"
                value={`$${stats.todayEarnings}`}
                bg="bg-orange-100"
              />
            </div>

            {/* ASSIGNED TRIPS */}
            <div className="bg-white border rounded-xl p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Assigned Trips
                </h3>
                <Link href="/dashboard/driver/trips">
                  <Button variant="outline" size="sm">
                    View All
                  </Button>
                </Link>
              </div>

              {assignedTrips.length === 0 ? (
                <div className="py-10 text-center">
                  <Car className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-600">No trips assigned</p>
                  <p className="text-xs text-gray-500 mt-1">
                    You’ll see trips once owners assign them
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {assignedTrips.map((trip: any) => {
                    const booking = trip.booking || {}
                    const customerName =
                      `${booking.customer?.profile?.firstName || ''} ${booking.customer?.profile?.lastName || ''}`.trim() ||
                      'Customer'

                    const vehicleName =
                      `${booking.vehicle?.year || ''} ${booking.vehicle?.make || ''} ${booking.vehicle?.modelName || ''}`.trim()

                    return (
                      <div
                        key={trip._id}
                        className="border rounded-xl p-4 hover:shadow-sm transition"
                      >
                        {/* HEADER */}
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-semibold text-gray-900">
                              {vehicleName}
                            </h4>
                            <p className="text-sm text-gray-600">
                              {booking.vehicle?.licensePlate}
                            </p>
                          </div>

                          <span
                            className={`px-3 py-1 text-xs rounded-full font-medium ${
                              (trip.status === 'scheduled')
                                ? 'bg-blue-100 text-blue-800'
                                : trip.status === 'in_progress'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                          {trip.status === 'scheduled' ? 'confirmed' : trip.status.replace('_', ' ')}
                          </span>
                        </div>

                        {/* INFO */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center gap-2 text-gray-700">
                            <User className="h-4 w-4" />
                            {customerName}
                          </div>

                          <div className="flex items-center gap-2 text-gray-700">
                            <Calendar className="h-4 w-4" />
                            {new Date(booking.scheduledDate?.start).toLocaleDateString()} →{' '}
                            {new Date(booking.scheduledDate?.end).toLocaleDateString()}
                          </div>
                        </div>

                        {/* ROUTE */}
                        <div className="mt-3 space-y-1 text-sm">
                          <div className="flex items-start gap-2 text-gray-600">
                            <MapPin className="h-4 w-4 mt-0.5 text-green-600" />
                            {booking.pickupLocation?.address || 'Pickup location'}
                          </div>
                          <div className="flex items-start gap-2 text-gray-600">
                            <MapPin className="h-4 w-4 mt-0.5 text-red-600" />
                            {booking.dropoffLocation?.address || 'Dropoff location'}
                          </div>
                        </div>

                        {/* NOTES */}
                        {booking.customerNotes && (
                          <div className="mt-3 bg-blue-50 p-2 rounded text-sm">
                            <span className="font-medium">Note: </span>
                            <span className="text-gray-600">
                              {booking.customerNotes}
                            </span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

          </div>
        </div>
      </DashboardLayout>
  )
}

/* ---------- UI Helper ---------- */

const StatCard = ({ icon, label, value, bg }: any) => (
  <div className="bg-white border rounded-xl p-4">
    <div className="flex items-center gap-4">
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${bg}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  </div>
)
