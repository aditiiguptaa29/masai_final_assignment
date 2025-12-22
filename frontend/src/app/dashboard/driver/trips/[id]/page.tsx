import DashboardLayout from '@/components/layout/DashboardLayout'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const revalidate = 60

async function getTrip(id: string) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/login')
  const role = (session.user as any)?.role
  if (role !== 'driver') redirect('/unauthorized')

  const token = (session.user as any)?.backendToken
  const base = process.env.NEXT_PUBLIC_BACKEND_URL as string
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

  const res = await fetch(`${base}/trips/${id}`, { headers, cache: 'no-store' })
  const json = await res.json()
  return json?.data
}

function Stat({ label, value }: { label: string, value: string }) {
  return (
    <div className="bg-white border rounded-lg p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-semibold text-gray-900">{value}</p>
    </div>
  )
}

export default async function TripDetails({ params }: { params: { id: string } }) {
  const trip = await getTrip(params.id)
  if (!trip) redirect('/dashboard/driver/trips')
  const booking = trip.booking || {}
  const customerName = `${booking.customer?.profile?.firstName || ''} ${booking.customer?.profile?.lastName || ''}`.trim() || 'Customer'
  const vehicleName = `${booking.vehicle?.year || ''} ${booking.vehicle?.make || ''} ${booking.vehicle?.modelName || ''}`.trim()
  const licensePlate = booking.vehicle?.licensePlate || ''

  const statusLabel = trip.status === 'scheduled' ? 'confirmed' : String(trip.status).replace('_', ' ')
  const statusColor = trip.status === 'scheduled' ? 'bg-blue-100 text-blue-800' : (trip.status === 'in_progress' ? 'bg-green-100 text-green-800' : (trip.status === 'completed' ? 'bg-gray-100 text-gray-800' : 'bg-red-100 text-red-800'))

  const baseAmount = typeof trip.earnings?.baseAmount === 'number' ? trip.earnings.baseAmount : 0
  const bonuses = typeof trip.earnings?.bonuses === 'number' ? trip.earnings.bonuses : 0
  const deductions = typeof trip.earnings?.deductions === 'number' ? trip.earnings.deductions : 0
  const totalAmount = typeof trip.earnings?.totalAmount === 'number' ? trip.earnings.totalAmount : 0

  const fuelCost = typeof trip.expenses?.fuel?.amount === 'number' ? trip.expenses.fuel.amount : 0
  const tollCost = (trip.expenses?.tolls || []).reduce((sum: number, t: any) => sum + (t.amount || 0), 0)
  const parkingCost = (trip.expenses?.parking || []).reduce((sum: number, p: any) => sum + (p.amount || 0), 0)
  const otherCost = (trip.expenses?.other || []).reduce((sum: number, o: any) => sum + (o.amount || 0), 0)
  const totalExpenses = fuelCost + tollCost + parkingCost + otherCost

  return (
    <DashboardLayout role="driver">
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Trip Details</h1>
              <p className="text-sm text-gray-600">{vehicleName} • {licensePlate}</p>
            </div>
            <span className={`px-3 py-1 text-xs rounded-full font-medium ${statusColor}`}>{statusLabel}</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white border rounded-xl p-5">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Stat label="Customer" value={customerName} />
                  <Stat label="Start Time" value={trip.startTime ? new Date(trip.startTime).toLocaleString() : '—'} />
                  <Stat label="End Time" value={trip.endTime ? new Date(trip.endTime).toLocaleString() : '—'} />
                  <Stat label="Distance" value={typeof trip.distance === 'number' ? `${trip.distance} km` : '—'} />
                  <Stat label="Start Odometer" value={typeof trip.startOdometer === 'number' ? `${trip.startOdometer} km` : '—'} />
                  <Stat label="End Odometer" value={typeof trip.endOdometer === 'number' ? `${trip.endOdometer} km` : '—'} />
                </div>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500">Pickup</p>
                    <p className="text-sm text-gray-900">{booking.pickupLocation?.address || '—'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-500">Dropoff</p>
                    <p className="text-sm text-gray-900">{booking.dropoffLocation?.address || '—'}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white border rounded-xl p-5">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Expenses</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-900">Fuel</p>
                    <p className="text-sm text-gray-600">Amount: ${fuelCost.toFixed(2)}</p>
                    {trip.expenses?.fuel?.liters !== undefined && (
                      <p className="text-sm text-gray-600">Liters: {trip.expenses.fuel.liters}</p>
                    )}
                    {trip.expenses?.fuel?.pricePerLiter !== undefined && (
                      <p className="text-sm text-gray-600">Price/L: ${trip.expenses.fuel.pricePerLiter}</p>
                    )}
                  </div>
                  <div className="border rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-900">Tolls</p>
                    <p className="text-sm text-gray-600">Total: ${tollCost.toFixed(2)}</p>
                  </div>
                  <div className="border rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-900">Parking</p>
                    <p className="text-sm text-gray-600">Total: ${parkingCost.toFixed(2)}</p>
                  </div>
                  <div className="border rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-900">Other</p>
                    <p className="text-sm text-gray-600">Total: ${otherCost.toFixed(2)}</p>
                  </div>
                </div>
                <div className="mt-4 text-sm text-gray-700">Overall Expenses: <span className="font-semibold">${totalExpenses.toFixed(2)}</span></div>
              </div>

              <div className="bg-white border rounded-xl p-5">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Earnings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border rounded-lg p-4">
                    <p className="text-sm text-gray-600">Base</p>
                    <p className="text-lg font-semibold text-gray-900">${baseAmount.toFixed(2)}</p>
                  </div>
                  <div className="border rounded-lg p-4">
                    <p className="text-sm text-gray-600">Bonuses</p>
                    <p className="text-lg font-semibold text-gray-900">${bonuses.toFixed(2)}</p>
                  </div>
                  <div className="border rounded-lg p-4">
                    <p className="text-sm text-gray-600">Deductions</p>
                    <p className="text-lg font-semibold text-gray-900">-${deductions.toFixed(2)}</p>
                  </div>
                  <div className="border rounded-lg p-4">
                    <p className="text-sm text-gray-600">Total</p>
                    <p className="text-lg font-semibold text-gray-900">${totalAmount.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {trip.notes && (
                <div className="bg-white border rounded-xl p-5">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Notes</h3>
                  <p className="text-sm text-gray-700">{trip.notes}</p>
                </div>
              )}
            </div>

            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white border rounded-xl p-5">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
                <Actions tripId={trip._id} status={trip.status} startOdometer={typeof trip.startOdometer === 'number' ? trip.startOdometer : 0} />
              </div>

              <div className="bg-white border rounded-xl p-5">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Navigate</h3>
                <div className="space-y-2">
                  <Link href="/dashboard/driver/trips" className="text-sm text-blue-600 hover:underline">Back to Trips</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

'use client'
import { tripApi } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { useState } from 'react'
import toast from 'react-hot-toast'

function Actions({ tripId, status, startOdometer }: { tripId: string, status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled', startOdometer: number }) {
  const [loading, setLoading] = useState(false)

  const start = async () => {
    try {
      setLoading(true)
      const input = typeof window !== 'undefined' ? window.prompt('Enter starting odometer (km):', String(startOdometer || 0)) : String(startOdometer || 0)
      const odometer = input ? Number(input) : (startOdometer || 0)
      await tripApi.start(tripId, { odometer })
      toast.success('Trip started')
      window.location.reload()
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to start trip')
    } finally {
      setLoading(false)
    }
  }

  const complete = async () => {
    try {
      setLoading(true)
      const input = typeof window !== 'undefined' ? window.prompt('Enter ending odometer (km):', String(startOdometer || 0)) : String(startOdometer || 0)
      const odometer = input ? Number(input) : (startOdometer || 0)
      if (odometer < (startOdometer || 0)) {
        toast.error('Ending odometer must be greater than or equal to starting odometer')
        setLoading(false)
        return
      }
      await tripApi.complete(tripId, { odometer })
      toast.success('Trip completed')
      window.location.reload()
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to complete trip')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      {status === 'scheduled' && (
        <Button onClick={start} isLoading={loading}>Start Trip</Button>
      )}
      {status === 'in_progress' && (
        <Button onClick={complete} isLoading={loading} className="bg-green-600 hover:bg-green-700">Complete Trip</Button>
      )}
      {status === 'completed' && (
        <div className="text-sm text-gray-600">Trip completed</div>
      )}
      {status === 'cancelled' && (
        <div className="text-sm text-red-600">Trip cancelled</div>
      )}
    </div>
  )
}
