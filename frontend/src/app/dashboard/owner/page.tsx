import DashboardLayout from '@/components/layout/DashboardLayout'
import { Car, DollarSign, Calendar, TrendingUp, Plus } from 'lucide-react'
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
  if (role !== 'vehicle_owner') redirect('/unauthorized')

  const token = (session.user as any)?.backendToken
  const base = process.env.NEXT_PUBLIC_BACKEND_URL as string

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  const [vehiclesRes, bookingsRes] = await Promise.all([
    fetch(`${base}/vehicles/owner/my-vehicles`, { headers, next: { revalidate } }),
    fetch(`${base}/bookings/owner/bookings`, { headers, next: { revalidate } }),
  ])

  const vehiclesJson = await vehiclesRes.json()
  const bookingsJson = await bookingsRes.json()

  const vehicles = vehiclesJson?.data || []
  const bookings = bookingsJson?.data || []

  const activeBookings = bookings.filter((b: any) =>
    ['pending', 'confirmed', 'in_progress'].includes(b.status)
  ).length

  const completedBookings = bookings.filter((b: any) => b.status === 'completed')
  const cancelledBookings = bookings.filter((b: any) => b.status === 'cancelled').length

  const totalRevenue = completedBookings.reduce(
    (sum: number, b: any) => sum + (b.pricing?.totalAmount || 0),
    0
  )

  const now = new Date()
  const monthlyRevenue = completedBookings
    .filter((b: any) => {
      const d = new Date(b.updatedAt)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    .reduce((sum: number, b: any) => sum + (b.pricing?.totalAmount || 0), 0)

  // Simple trip history: latest 5 bookings
  const tripHistory = bookings
    .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5)

  return {
    stats: {
      totalVehicles: vehicles.length,
      activeBookings,
      totalRevenue,
      monthlyRevenue,
      cancelledBookings,
    },
    tripHistory,
  }
}

export default async function OwnerDashboard() {
  const { stats, tripHistory } = await getData()

  return (
      <DashboardLayout role="vehicle_owner">
        <div className="py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

            {/* HEADER */}
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-2xl font-semibold text-slate-900">
                  Owner Dashboard
                </h1>
                <p className="text-sm text-slate-600">
                  Overview of your fleet and earnings
                </p>
              </div>
              <Link href="/dashboard/owner/vehicles/new">
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add Vehicle
                </Button>
              </Link>
            </div>

            {/* STATS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
              <StatCard
                label="Total Vehicles"
                value={stats.totalVehicles}
                icon={<Car className="h-5 w-5" />}
              />
              <StatCard
                label="Active Bookings"
                value={stats.activeBookings}
                icon={<Calendar className="h-5 w-5" />}
              />
              <StatCard
                label="Total Revenue"
                value={`$${stats.totalRevenue.toLocaleString()}`}
                icon={<DollarSign className="h-5 w-5" />}
              />
              <StatCard
                label="This Month"
                value={`$${stats.monthlyRevenue.toLocaleString()}`}
                icon={<TrendingUp className="h-5 w-5" />}
              />
              <StatCard
                label="Total Cancellations"
                value={stats.cancelledBookings}
                icon={<Calendar className="h-5 w-5" />}
              />
            </div>

            {/* LOWER SECTION */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* RECENT BOOKINGS */}
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-slate-900">Recent Bookings</h3>
                  <Link
                    href="/dashboard/owner/bookings"
                    className="text-sm text-slate-600 hover:text-slate-900"
                  >
                    View all
                  </Link>
                </div>
                <div className="space-y-3">
                  {tripHistory.map((b: any) => (
                    <div key={b._id} className="flex justify-between items-center py-3 border-b border-slate-100 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {`${b.vehicle?.year || ''} ${b.vehicle?.make || ''} ${b.vehicle?.modelName || ''}`.trim()}
                        </p>
                        <p className="text-xs text-slate-500">
                          {b.customer?.profile?.firstName || 'Customer'} • {b.status.replace('_',' ')}
                        </p>
                      </div>
                      <span className="px-3 py-1 text-xs rounded-full bg-slate-100 text-slate-700 font-medium">
                        #{String(b._id).slice(-6).toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* TOP VEHICLES */}
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-slate-900">
                    Top Performing Vehicles
                  </h3>
                  <Link
                    href="/dashboard/owner/analytics"
                    className="text-sm text-slate-600 hover:text-slate-900"
                  >
                    View analytics
                  </Link>
                </div>

                <div className="space-y-3">
                  {[
                    { name: '2023 Tesla Model 3', bookings: 45, revenue: 12500 },
                    { name: '2022 BMW X5', bookings: 38, revenue: 10200 },
                    { name: '2021 Mercedes C-Class', bookings: 32, revenue: 8900 },
                  ].map((v, i) => (
                    <div
                      key={i}
                      className="py-3 border-b border-slate-100 last:border-0"
                    >
                      <div className="flex justify-between">
                        <p className="text-sm font-medium text-slate-900">
                          {v.name}
                        </p>
                        <p className="text-sm font-semibold text-slate-900">
                          ${v.revenue.toLocaleString()}
                        </p>
                      </div>
                      <p className="text-xs text-slate-500">
                        {v.bookings} bookings
                      </p>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      </DashboardLayout>
  )
}

/* STAT CARD */
const StatCard = ({ label, value, icon }: any) => (
  <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-center gap-4">
    <div className="w-11 h-11 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
      {icon}
    </div>
    <div>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  </div>
)
