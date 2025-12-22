'use client'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { vehicleApi, bookingApi } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import toast from 'react-hot-toast'
import { MapPin, Users, DollarSign, Calendar, Star, ArrowLeft, Package } from 'lucide-react'
import Link from 'next/link'

export default function VehicleDetailPage() {
  const params = useParams()
  const router = useRouter()
  const vehicleId = params.id as string

  const [vehicle, setVehicle] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [bookingLoading, setBookingLoading] = useState(false)

  // Booking form state
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [pickupLocation, setPickupLocation] = useState('')
  const [dropoffLocation, setDropoffLocation] = useState('')
  const [pickupCoords, setPickupCoords] = useState<[number, number]>([0, 0])
  const [dropoffCoords, setDropoffCoords] = useState<[number, number]>([0, 0])
  const [paymentMethod, setPaymentMethod] = useState('card')

  useEffect(() => {
    fetchVehicle()
  }, [vehicleId])

  const fetchVehicle = async () => {
    try {
      setLoading(true)
      const response = await vehicleApi.getById(vehicleId)
      setVehicle(response.data.data)
      // Set default locations
      if (response.data.data.location?.address) {
        setPickupLocation(response.data.data.location.address)
        setDropoffLocation(response.data.data.location.address)
        // Set default coordinates from vehicle location
        if (response.data.data.location?.coordinates) {
          setPickupCoords(response.data.data.location.coordinates)
          setDropoffCoords(response.data.data.location.coordinates)
        }
      }
    } catch (error: any) {
      console.error('Error fetching vehicle:', error)
      toast.error('Failed to load vehicle details')
    } finally {
      setLoading(false)
    }
  }

  // Function to get coordinates based on location names (simplified geocoding)
  const getCoordinatesFromLocation = (location: string): [number, number] => {
    // Simple mapping of common locations to coordinates
    // In a real app, you'd use a geocoding service like Google Maps API
    const locationMap: { [key: string]: [number, number] } = {
      // Major cities
      'mumbai': [72.8777, 19.0760],
      'delhi': [77.1025, 28.7041], 
      'bangalore': [77.5946, 12.9716],
      'chennai': [80.2707, 13.0827],
      'kolkata': [88.3639, 22.5726],
      'hyderabad': [78.4867, 17.3850],
      'pune': [73.8567, 18.5204],
      'ahmedabad': [72.5714, 23.0225],
      
      // Mumbai areas
      'andheri': [72.8697, 19.1136],
      'bandra': [72.8405, 19.0596],
      'malad': [72.8489, 19.1868], 
      'borivali': [72.8567, 19.2307],
      'thane': [72.9781, 19.2183],
      'navi mumbai': [73.0297, 19.0330],
      'powai': [72.9059, 19.1176],
      'worli': [72.8181, 19.0176],
      'chembur': [72.8990, 19.0622],
      'vikhroli': [72.9194, 19.1025],
      
      // Default fallback coordinates (Mumbai)
      'default': [72.8777, 19.0760]
    }

    const locationKey = location.toLowerCase().trim()
    
    // Check for exact matches first
    for (const [key, coords] of Object.entries(locationMap)) {
      if (locationKey.includes(key)) {
        return coords
      }
    }
    
    // Return default coordinates if no match
    return locationMap['default']
  }

  const calculatePrice = () => {
    if (!vehicle || !startDate || !endDate) return 0

    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    const baseRate = vehicle.pricing?.baseRate || 0
    const rateType = vehicle.pricing?.rateType || 'daily'

    if (rateType === 'daily') {
      return baseRate * diffDays
    } else {
      return baseRate * diffDays * 24
    }
  }

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!startDate || !endDate) {
      toast.error('Please select pickup and dropoff dates')
      return
    }

    if (new Date(startDate) >= new Date(endDate)) {
      toast.error('Dropoff date must be after pickup date')
      return
    }

    if (new Date(startDate) < new Date()) {
      toast.error('Pickup date cannot be in the past')
      return
    }

    if (!pickupLocation || !dropoffLocation) {
      toast.error('Please enter pickup and dropoff locations')
      return
    }

    try {
      setBookingLoading(true)

      // Get coordinates for pickup and dropoff locations
      const pickupCoordinates = getCoordinatesFromLocation(pickupLocation)
      const dropoffCoordinates = getCoordinatesFromLocation(dropoffLocation)

      const bookingData = {
        vehicleId: vehicle._id,
        pickupDate: new Date(startDate).toISOString(),
        dropoffDate: new Date(endDate).toISOString(),
        pickupLocation: {
          address: pickupLocation,
          coordinates: pickupCoordinates
        },
        dropoffLocation: {
          address: dropoffLocation,
          coordinates: dropoffCoordinates
        },
        paymentMethod: paymentMethod === 'card' ? 'credit_card' : paymentMethod === 'upi' ? 'bank_transfer' : 'cash'
      }

      const response = await bookingApi.create(bookingData)
      toast.success('Booking request sent successfully!')
      router.push('/dashboard/customer/bookings')
    } catch (error: any) {
      console.error('Booking error:', error)
      toast.error(error.response?.data?.message || 'Failed to create booking')
    } finally {
      setBookingLoading(false)
    }
  }

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['customer']}>
        <DashboardLayout role="customer">
          <div className="flex justify-center items-center min-h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  if (!vehicle) {
    return (
      <ProtectedRoute allowedRoles={['customer']}>
        <DashboardLayout role="customer">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900">Vehicle not found</h2>
            <Link href="/dashboard/customer/vehicles">
              <Button className="mt-4">Back to Vehicles</Button>
            </Link>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  const totalPrice = calculatePrice()

  return (
    <ProtectedRoute allowedRoles={['customer']}>
      <DashboardLayout role="customer">
        <div className="py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Back Button */}
            <Link href="/dashboard/customer/vehicles" className="inline-flex items-center text-indigo-600 hover:text-indigo-800 mb-6">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Vehicles
            </Link>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Vehicle Details */}
              <div className="lg:col-span-2 space-y-6">
                {/* Vehicle Images */}
                <div className="card">
                  <div className="aspect-video bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg flex items-center justify-center mb-4">
                    {vehicle.images && vehicle.images.length > 0 ? (
                      <img
                        src={vehicle.images[0]}
                        alt={`${vehicle.make} ${vehicle.model}`}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <div className="text-8xl">🚗</div>
                    )}
                  </div>
                </div>

                {/* Vehicle Info */}
                <div className="card">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h1 className="text-3xl font-bold text-gray-900">
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </h1>
                      <p className="text-lg text-gray-600 capitalize mt-1">{vehicle.type}</p>
                    </div>
                    <div className="flex items-center bg-yellow-100 px-3 py-1 rounded-full">
                      <Star className="h-5 w-5 text-yellow-500 fill-current mr-1" />
                      <span className="font-semibold text-gray-900">{vehicle.rating?.average || 4.8}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-600">License Plate</p>
                      <p className="font-semibold text-gray-900">{vehicle.licensePlate || 'N/A'}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-600">VIN</p>
                      <p className="font-semibold text-gray-900">{vehicle.vin?.slice(0, 8) || 'N/A'}...</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-600">Passengers</p>
                      <p className="font-semibold text-gray-900">{vehicle.capacity?.passengers || 0}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-600">Luggage</p>
                      <p className="font-semibold text-gray-900">{vehicle.capacity?.luggage || 0}</p>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="font-semibold text-gray-900 mb-3">Features</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {vehicle.features?.airConditioning && (
                        <div className="flex items-center text-sm text-gray-600">
                          <span className="mr-2">❄️</span> Air Conditioning
                        </div>
                      )}
                      {vehicle.features?.gps && (
                        <div className="flex items-center text-sm text-gray-600">
                          <span className="mr-2">🗺️</span> GPS Navigation
                        </div>
                      )}
                      {vehicle.features?.bluetooth && (
                        <div className="flex items-center text-sm text-gray-600">
                          <span className="mr-2">📱</span> Bluetooth
                        </div>
                      )}
                      {vehicle.features?.usbCharging && (
                        <div className="flex items-center text-sm text-gray-600">
                          <span className="mr-2">🔌</span> USB Charging
                        </div>
                      )}
                      {vehicle.features?.backupCamera && (
                        <div className="flex items-center text-sm text-gray-600">
                          <span className="mr-2">📷</span> Backup Camera
                        </div>
                      )}
                      {vehicle.features?.childSeat && (
                        <div className="flex items-center text-sm text-gray-600">
                          <span className="mr-2">👶</span> Child Seat
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border-t pt-4 mt-4">
                    <h3 className="font-semibold text-gray-900 mb-2">Location</h3>
                    <div className="flex items-start text-gray-600">
                      <MapPin className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                      <span>{vehicle.location?.address || vehicle.location?.city || 'Location not specified'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Booking Form */}
              <div className="lg:col-span-1">
                <div className="card sticky top-6">
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl font-bold text-gray-900">
                        ${vehicle.pricing?.baseRate || 0}
                      </span>
                      <span className="text-gray-600">
                        / {vehicle.pricing?.rateType === 'daily' ? 'day' : 'hour'}
                      </span>
                    </div>
                    {!vehicle.availability && (
                      <div className="bg-red-50 text-red-700 p-2 rounded text-sm">
                        Currently unavailable
                      </div>
                    )}
                  </div>

                  <form onSubmit={handleBooking} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Calendar className="h-4 w-4 inline mr-1" />
                        Pickup Date & Time
                      </label>
                      <input
                        type="datetime-local"
                        className="form-input"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        required
                        min={new Date().toISOString().slice(0, 16)}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Calendar className="h-4 w-4 inline mr-1" />
                        Dropoff Date & Time
                      </label>
                      <input
                        type="datetime-local"
                        className="form-input"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        required
                        min={startDate || new Date().toISOString().slice(0, 16)}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <MapPin className="h-4 w-4 inline mr-1" />
                        Pickup Location
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        value={pickupLocation}
                        onChange={(e) => setPickupLocation(e.target.value)}
                        placeholder="Enter pickup address (e.g., Andheri, Mumbai)"
                        required
                      />
                      {pickupLocation && (
                        <p className="text-xs text-gray-500 mt-1">
                          📍 Coordinates: {getCoordinatesFromLocation(pickupLocation).join(', ')}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <MapPin className="h-4 w-4 inline mr-1" />
                        Dropoff Location
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        value={dropoffLocation}
                        onChange={(e) => setDropoffLocation(e.target.value)}
                        placeholder="Enter dropoff address (e.g., Bandra, Mumbai)"
                        required
                      />
                      {dropoffLocation && (
                        <p className="text-xs text-gray-500 mt-1">
                          📍 Coordinates: {getCoordinatesFromLocation(dropoffLocation).join(', ')}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Payment Method
                      </label>
                      <select
                        className="form-input"
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                      >
                        <option value="card">Credit/Debit Card</option>
                        <option value="cash">Cash</option>
                        <option value="upi">Bank Transfer/UPI</option>
                      </select>
                    </div>

                    {totalPrice > 0 && (
                      <div className="border-t pt-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Base Price</span>
                          <span className="font-medium">${totalPrice.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Tax (10%)</span>
                          <span className="font-medium">${(totalPrice * 0.1).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Service Fee (5%)</span>
                          <span className="font-medium">${(totalPrice * 0.05).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-lg font-bold pt-2 border-t">
                          <span>Total</span>
                          <span>${(totalPrice * 1.15).toFixed(2)}</span>
                        </div>
                      </div>
                    )}

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={!vehicle.availability || bookingLoading}
                    >
                      {bookingLoading ? 'Processing...' : 'Request Booking'}
                    </Button>

                    <p className="text-xs text-gray-500 text-center">
                      Your booking request will be reviewed by the vehicle owner
                    </p>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
