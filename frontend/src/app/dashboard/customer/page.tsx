import DashboardLayout from '@/components/layout/DashboardLayout'
import { Calendar, Car, Search } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'

export const revalidate = 60

async function getData() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/login')
  const role = (session.user as any)?.role
  if (role !== 'customer') redirect('/unauthorized')

  const token = (session.user as any)?.backendToken
  const base = process.env.NEXT_PUBLIC_BACKEND_URL as string
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  const res = await fetch(`${base}/bookings/my-bookings`, { headers, next: { revalidate } })
  const json = await res.json()
  const bookings = json?.data || []

  const active = bookings.filter((b: any) => ['pending','confirmed','in_progress'].includes(b.status))
  const completed = bookings.filter((b: any) => b.status === 'completed')
  const upcoming = bookings.filter((b: any) => b.status === 'confirmed' && new Date(b.scheduledDate.start) > new Date())
  const current = bookings.find((b: any) => b.status === 'in_progress' || b.status === 'confirmed')

  return {
    stats: {
      activeBookings: active.length,
      completedTrips: completed.length,
      upcomingBookings: upcoming.length,
    },
    currentBooking: current || null,
  }
}

export default async function CustomerDashboard() {
  const { stats, currentBooking } = await getData()

  return (
      <DashboardLayout role="customer">
        <div className="max-w-7xl mx-auto px-6 py-8">

          {/* HEADER */}
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-slate-900">
              Customer Dashboard
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Manage bookings and track your trips
            </p>
          </div>

          {/* QUICK ACTIONS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <Link href="/dashboard/customer/vehicles">
              <div className="border border-slate-200 rounded-lg p-5 bg-white hover:border-slate-300 transition cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500">Browse</p>
                    <p className="text-lg font-medium text-slate-900 mt-1">
                      Find Vehicles
                    </p>
                  </div>
                  <Search className="h-6 w-6 text-slate-600" />
                </div>
              </div>
            </Link>

            <StatCard
              label="Active bookings"
              value={stats.activeBookings}
              icon={Car}
            />

            <StatCard
              label="Upcoming trips"
              value={stats.upcomingBookings}
              icon={Calendar}
            />
          </div>

          {/* CURRENT BOOKING */}
          {currentBooking && (
            <div className="border border-slate-200 rounded-lg bg-white p-6 mb-10">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-slate-900">
                  Current booking
                </h3>

                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium capitalize
                    ${
                      currentBooking.status === 'in_progress'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-blue-100 text-blue-800'
                    }
                  `}
                >
                  {currentBooking.status.replace('_', ' ')}
                </span>
              </div>

              <div className="border border-slate-200 rounded-md p-4">
                <div className="flex justify-between mb-4">
                  <div>
                    <h4 className="font-medium text-slate-900">
                      {currentBooking.vehicle?.year}{' '}
                      {currentBooking.vehicle?.make}{' '}
                      {currentBooking.vehicle?.modelName}
                    </h4>
                    <p className="text-xs text-slate-500">
                      Booking #{currentBooking._id.slice(-8).toUpperCase()}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-900">
                      ${currentBooking.pricing?.totalAmount.toFixed(2)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {Math.ceil(
                        (new Date(currentBooking.scheduledDate.end).getTime() -
                          new Date(currentBooking.scheduledDate.start).getTime()) /
                          (1000 * 60 * 60 * 24)
                      )}{' '}
                      days
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <DateBlock
                    label="Pickup"
                    date={currentBooking.scheduledDate.start}
                    address={currentBooking.pickupLocation?.address}
                  />
                  <DateBlock
                    label="Return"
                    date={currentBooking.scheduledDate.end}
                    address={currentBooking.dropoffLocation?.address}
                  />
                </div>

                <div className="flex gap-3">
                  <Link
                    href={`/dashboard/customer/bookings/${currentBooking._id}`}
                    className="flex-1"
                  >
                    <Button size="sm" className="w-full">
                      View details
                    </Button>
                  </Link>
                  <Link
                    href="/dashboard/customer/bookings"
                    className="flex-1"
                  >
                    <Button size="sm" variant="outline" className="w-full">
                      All bookings
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* LOWER GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* HELP */}
            <div className="border border-slate-200 rounded-lg bg-white p-6">
              <h3 className="text-lg font-medium text-slate-900 mb-4">
                Quick links
              </h3>

              <HelpLink
                href="/dashboard/customer/vehicles"
                title="Browse available vehicles"
                desc="Search and book vehicles"
              />
              <HelpLink
                href="/dashboard/customer/bookings"
                title="View all bookings"
                desc="Manage reservations"
              />
              <HelpLink
                href="/dashboard/customer/settings"
                title="Account settings"
                desc="Update your profile"
              />
            </div>

            {/* STATS */}
            <div className="border border-slate-200 rounded-lg bg-white p-6">
              <h3 className="text-lg font-medium text-slate-900 mb-4">
                Activity summary
              </h3>

              <StatRow label="Total bookings" value={stats.activeBookings + stats.completedTrips} />
              <StatRow label="Completed trips" value={stats.completedTrips} />
              <StatRow label="Active bookings" value={stats.activeBookings} />
              <StatRow label="Upcoming trips" value={stats.upcomingBookings} />
            </div>
          </div>
        </div>
      </DashboardLayout>
  )
}

/* Reusable blocks */

const StatCard = ({
  label,
  value,
  icon: Icon,
}: any) => (
  <div className="border border-slate-200 rounded-lg bg-white p-5">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-xl font-semibold text-slate-900 mt-1">
          {value}
        </p>
      </div>
      <Icon className="h-6 w-6 text-slate-600" />
    </div>
  </div>
)

const StatRow = ({ label, value }: any) => (
  <div className="flex justify-between items-center py-2">
    <span className="text-sm text-slate-600">{label}</span>
    <span className="text-lg font-medium text-slate-900">{value}</span>
  </div>
)

const HelpLink = ({ href, title, desc }: any) => (
  <Link href={href}>
    <div className="border border-slate-200 rounded-md p-3 mb-3 hover:bg-slate-50 transition">
      <p className="text-sm font-medium text-slate-900">{title}</p>
      <p className="text-xs text-slate-500">{desc}</p>
    </div>
  </Link>
)

const DateBlock = ({ label, date, address }: any) => (
  <div>
    <p className="text-xs text-slate-500 mb-1">{label}</p>
    <p className="text-sm font-medium text-slate-900">
      {new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })}
    </p>
    <p className="text-xs text-slate-500">
      {address || 'Not specified'}
    </p>
  </div>
)
