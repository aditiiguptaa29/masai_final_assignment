'use client'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Button } from '@/components/ui/Button'
import { useState, useEffect } from 'react'
import {
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  User,
  Calendar,
  DollarSign
} from 'lucide-react'
import toast from 'react-hot-toast'
import { bookingApi, userApi } from '@/lib/api'

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  active: 'bg-green-100 text-green-800',
  completed: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800'
}

const paymentStatusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  refunded: 'bg-blue-100 text-blue-800',
  failed: 'bg-red-100 text-red-800'
}

export default function OwnerBookingsPage() {
  const [bookings, setBookings] = useState<any[]>([])
  const [drivers, setDrivers] = useState<any[]>([])
  const [eligibleDriversMap, setEligibleDriversMap] = useState<Record<string, any[]>>({})
  const [selectedDrivers, setSelectedDrivers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [driversLoading, setDriversLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchBookings()
    fetchDrivers()
  }, [])

  const fetchBookings = async () => {
    try {
      setLoading(true)
      const res = await bookingApi.getOwnerBookings()
      setBookings(res.data.data || [])
      // Prefetch eligible drivers per vehicle to reduce client-side filtering
      const uniqueVehicleIds: string[] = Array.from(new Set(((res.data.data || []) as any[])
        .map((b: any) => String(b.vehicle?._id))
        .filter(Boolean)))
      const results: Array<[string, any[]]> = await Promise.all(uniqueVehicleIds.map(async (vid: string) => {
        try {
          const r = await userApi.getDrivers(vid)
          return [vid, (r.data.data || []) as any[]]
        } catch {
          return [vid, []]
        }
      }))
      const map: Record<string, any[]> = {}
      results.forEach(([vid, list]) => { map[String(vid)] = list })
      setEligibleDriversMap(map)
    } catch {
      toast.error('Failed to load bookings')
    } finally {
      setLoading(false)
    }
  }

  const fetchDrivers = async () => {
    try {
      setDriversLoading(true)
      const res = await userApi.getDrivers()
      setDrivers(res.data.data || [])
    } catch {
      toast.error('Failed to load drivers')
    } finally {
      setDriversLoading(false)
    }
  }

  const filteredBookings = bookings.filter(b => {
    const matchesStatus = statusFilter === 'all' || b.status === statusFilter
    const customerName =
      (b.customer?.profile?.firstName || '') +
      ' ' +
      (b.customer?.profile?.lastName || '')
    const vehicleName =
      (b.vehicle?.year || '') +
      ' ' +
      (b.vehicle?.make || '') +
      ' ' +
      (b.vehicle?.modelName || '')
    const matchesSearch =
      b._id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.vehicle?.licensePlate?.toLowerCase().includes(searchTerm.toLowerCase())

    return matchesStatus && matchesSearch
  })

  const handleAccept = async (id: string, vehicleId: string) => {
    try {
      const eligible = eligibleDriversMap[String(vehicleId)] || []
      if (eligible.length === 0) {
        toast.error('No eligible drivers for this vehicle. Register a driver before accepting.')
        return
      }
      const driverId = selectedDrivers[id]
      if (!driverId) {
        toast.error('Select a driver to accept this booking')
        return
      }
      await bookingApi.update(id, { status: 'confirmed', driver: driverId })
      toast.success('Booking accepted with driver assigned')
      fetchBookings()
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to accept booking')
    }
  }

  const handleReject = async (id: string) => {
    if (!confirm('Reject this booking?')) return
    await bookingApi.update(id, { status: 'cancelled' })
    toast.success('Booking rejected')
    fetchBookings()
  }

  const handleAssignDriver = async (id: string, driverId: string, vehicleId: string) => {
    try {
      await bookingApi.update(id, { driver: driverId })
      toast.success('Driver assigned')
      fetchBookings()
    } catch (e: any) {
      const message = e?.response?.data?.message || 'Failed to assign driver'
      toast.error(message)
    }
  }

  return (
    <ProtectedRoute allowedRoles={['vehicle_owner']}>
      <DashboardLayout role="vehicle_owner">
        <div className="py-6">
          <div className="max-w-7xl mx-auto px-4">

            {/* HEADER */}
            <div className="mb-6">
              <h1 className="text-2xl font-semibold text-gray-900">
                Bookings Management
              </h1>
              <p className="text-sm text-gray-600">
                Review, approve and manage vehicle bookings
              </p>
            </div>

            {/* FILTERS */}
            <div className="bg-white border rounded-xl p-4 mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  className="form-input pl-10"
                  placeholder="Search by booking, customer or vehicle"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <select
                  className="form-input pl-10"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {/* LIST */}
            <div className="space-y-4">
              {loading ? (
                <div className="bg-white rounded-xl p-12 text-center">
                  <Clock className="h-12 w-12 mx-auto animate-spin text-gray-400" />
                </div>
              ) : filteredBookings.length === 0 ? (
                <div className="bg-white rounded-xl p-12 text-center">
                  <Clock className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-600">No bookings found</p>
                </div>
              ) : (
                filteredBookings.map((b) => {
                  const customer =
                    (b.customer?.profile?.firstName || '') +
                    ' ' +
                    (b.customer?.profile?.lastName || '')
                  const vehicle =
                    (b.vehicle?.year || '') +
                    ' ' +
                    (b.vehicle?.make || '') +
                    ' ' +
                    (b.vehicle?.modelName || '')

                  return (
                    <div key={b._id} className="bg-white border rounded-xl p-5">
                      <div className="flex flex-col lg:flex-row gap-6">

                        {/* LEFT */}
                        <div className="flex-1 space-y-3">
                          <div className="flex justify-between">
                            <div>
                              <h3 className="font-semibold text-gray-900">
                                Booking #{b._id.slice(-6).toUpperCase()}
                              </h3>
                              <p className="text-sm text-gray-600">{vehicle}</p>
                            </div>
                            <div className="flex gap-2">
                              <span className={`px-2 py-1 text-xs rounded-full ${statusColors[b.status]}`}>
                                {b.status}
                              </span>
                              <span className={`px-2 py-1 text-xs rounded-full ${paymentStatusColors[b.payment?.status || 'pending']}`}>
                                {b.payment?.status || 'pending'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 text-sm">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className="font-medium">{customer}</span>
                          </div>

                          <div className="flex items-center gap-3 text-sm text-gray-600">
                            <Calendar className="h-4 w-4" />
                            {new Date(b.scheduledDate.start).toLocaleDateString()} →{' '}
                            {new Date(b.scheduledDate.end).toLocaleDateString()}
                          </div>

                          <div className="space-y-1 text-sm">
                            <div className="flex items-start gap-2">
                              <MapPin className="h-4 w-4 text-green-600" />
                              <span>{b.pickupLocation?.address}</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <MapPin className="h-4 w-4 text-red-600" />
                              <span>{b.dropoffLocation?.address}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 font-bold text-lg">
                            <DollarSign className="h-5 w-5 text-gray-400" />
                            ${b.pricing?.totalAmount?.toFixed(2)}
                          </div>
                        </div>

                        {/* ACTIONS */}
                        <div className="w-full lg:w-48 space-y-2">
                          {b.status === 'pending' && (
                            (() => {
                              const eligible = eligibleDriversMap[String(b.vehicle?._id)] || []
                              return (
                                <>
                                  <div className="text-xs mb-2">
                                    {eligible.length > 0 ? (
                                      <span className="text-green-700">Drivers available: {eligible.length}</span>
                                    ) : (
                                      <span className="text-red-600">No drivers registered for this vehicle</span>
                                    )}
                                  </div>
                                  <select
                                    className="form-input text-sm mb-2"
                                    onChange={(e) => setSelectedDrivers(prev => ({ ...prev, [b._id]: e.target.value }))}
                                    value={selectedDrivers[b._id] || ''}
                                  >
                                    <option value="">Select driver</option>
                                    {eligible.map((d) => (
                                      <option key={d._id} value={d._id}>
                                        {(d.profile?.firstName || '') + ' ' + (d.profile?.lastName || '')}
                                      </option>
                                    ))}
                                  </select>
                                  <Button
                                    className="w-full"
                                    onClick={() => handleAccept(b._id, b.vehicle?._id)}
                                    disabled={eligible.length === 0 || !selectedDrivers[b._id]}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Accept
                                  </Button>
                                  <Button
                                    variant="outline"
                                    className="w-full text-red-600"
                                    onClick={() => handleReject(b._id)}
                                  >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Reject
                                  </Button>
                                </>
                              )
                            })()
                          )}

                          {b.status === 'confirmed' && !b.driver && (
                            (() => {
                              const eligible = eligibleDriversMap[String(b.vehicle?._id)] || []
                              return eligible.length > 0 ? (
                                <select
                                  className="form-input text-sm"
                                  onChange={(e) => handleAssignDriver(b._id, e.target.value, b.vehicle?._id)}
                                  defaultValue=""
                                >
                                  <option value="" disabled>
                                    Assign driver
                                  </option>
                                  {eligible.map((d) => (
                                    <option key={d._id} value={d._id}>
                                      {(d.profile?.firstName || '') + ' ' + (d.profile?.lastName || '')}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <div className="text-xs text-red-600">
                                  No eligible drivers registered for this vehicle.
                                </div>
                              )
                            })()
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
