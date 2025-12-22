'use client'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Calendar, MapPin, DollarSign, X, Loader2 } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { bookingApi } from '@/lib/api'

type BookingStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
type FilterType = 'all' | 'active' | 'completed' | 'cancelled'

interface Booking {
  _id: string
  vehicle: {
    _id: string
    make: string
    modelName: string
    year: number
    licensePlate: string
  }
  status: BookingStatus
  scheduledDate: {
    start: string
    end: string
  }
  pickupLocation: {
    address: string
  }
  dropoffLocation: {
    address: string
  }
  pricing: {
    totalAmount: number
  }
  payment: {
    status: string
  }
}

export default function CustomerBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([])
  const [filter, setFilter] = useState<FilterType>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBookings()
  }, [])

  useEffect(() => {
    filterBookings()
  }, [filter, bookings])

  const fetchBookings = async () => {
    try {
      setLoading(true)
      const response = await bookingApi.getMyBookings()
      setBookings(response.data.data || [])
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to fetch bookings')
    } finally {
      setLoading(false)
    }
  }

  const filterBookings = () => {
    let filtered = [...bookings]

    if (filter === 'active') {
      filtered = bookings.filter(b =>
        ['pending', 'confirmed', 'in_progress'].includes(b.status)
      )
    } else if (filter === 'completed') {
      filtered = bookings.filter(b => b.status === 'completed')
    } else if (filter === 'cancelled') {
      filtered = bookings.filter(b => b.status === 'cancelled')
    }

    setFilteredBookings(filtered)
  }

  const handleCancelBooking = async (id: string) => {
    const reason = prompt('Reason for cancellation (optional):')
    if (!confirm('Cancel this booking?')) return

    try {
      await bookingApi.cancel(id, reason || undefined)
      toast.success('Booking cancelled')
      fetchBookings()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to cancel booking')
    }
  }

  const getStatusColor = (status: BookingStatus) => {
    switch (status) {
      case 'confirmed': return 'bg-green-50 text-green-700'
      case 'pending': return 'bg-yellow-50 text-yellow-700'
      case 'in_progress': return 'bg-blue-50 text-blue-700'
      case 'completed': return 'bg-slate-100 text-slate-700'
      case 'cancelled': return 'bg-red-50 text-red-700'
      default: return 'bg-slate-100 text-slate-700'
    }
  }

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['customer']}>
        <DashboardLayout role="customer">
          <div className="flex items-center justify-center h-96">
            <Loader2 className="h-8 w-8 animate-spin text-slate-900" />
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute allowedRoles={['customer']}>
      <DashboardLayout role="customer">
        <div className="py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

            {/* HEADER */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-2xl font-semibold text-slate-900">My Bookings</h1>
                <p className="text-sm text-slate-600">Manage your trips and reservations</p>
              </div>
              <Link href="/dashboard/customer/vehicles">
                <Button>Book New Vehicle</Button>
              </Link>
            </div>

            {/* FILTER TABS */}
            <div className="bg-white border border-slate-200 rounded-xl p-2 mb-6 flex gap-2 overflow-x-auto">
              {(['all', 'active', 'completed', 'cancelled'] as FilterType[]).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 text-sm rounded-lg font-medium transition ${
                    filter === f
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            {/* BOOKINGS LIST */}
            <div className="space-y-4">
              {filteredBookings.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl py-12 text-center">
                  <Calendar className="h-14 w-14 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600">No bookings found</p>
                </div>
              ) : (
                filteredBookings.map(booking => (
                  <div key={booking._id} className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-sm transition">

                    <div className="flex flex-col lg:flex-row gap-6 justify-between">

                      {/* LEFT */}
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="text-lg font-semibold text-slate-900">
                              {booking.vehicle.year} {booking.vehicle.make} {booking.vehicle.modelName}
                            </h3>
                            <p className="text-xs text-slate-500">
                              #{booking._id.slice(-8)} • {booking.vehicle.licensePlate}
                            </p>
                          </div>

                          <span className={`px-3 py-1 text-xs rounded-full font-medium capitalize ${getStatusColor(booking.status)}`}>
                            {booking.status.replace('_', ' ')}
                          </span>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-slate-500 flex items-center gap-1">
                              <Calendar className="h-4 w-4" /> Pickup
                            </p>
                            <p className="font-medium">
                              {new Date(booking.scheduledDate.start).toLocaleString()}
                            </p>
                            <p className="text-xs text-slate-500 flex gap-1 mt-1">
                              <MapPin className="h-3 w-3" />
                              {booking.pickupLocation.address}
                            </p>
                          </div>

                          <div>
                            <p className="text-slate-500 flex items-center gap-1">
                              <Calendar className="h-4 w-4" /> Return
                            </p>
                            <p className="font-medium">
                              {new Date(booking.scheduledDate.end).toLocaleString()}
                            </p>
                            <p className="text-xs text-slate-500 flex gap-1 mt-1">
                              <MapPin className="h-3 w-3" />
                              {booking.dropoffLocation.address}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-slate-200 flex items-center gap-2 text-sm">
                          <DollarSign className="h-4 w-4" />
                          <span className="font-semibold">
                            ${booking.pricing.totalAmount.toFixed(2)}
                          </span>
                          <span className="text-slate-500">• Payment {booking.payment.status}</span>
                        </div>
                      </div>

                      {/* ACTIONS */}
                      <div className="flex lg:flex-col gap-2 lg:w-40">
                        <Link href={`/dashboard/customer/bookings/${booking._id}`}>
                          <Button variant="outline" size="sm" className="w-full">
                            View Details
                          </Button>
                        </Link>

                        {['pending', 'confirmed'].includes(booking.status) && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full text-red-600 border-red-300 hover:bg-red-50"
                            onClick={() => handleCancelBooking(booking._id)}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                        )}
                      </div>

                    </div>
                  </div>
                ))
              )}
            </div>

          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
