import { Response } from 'express'
import { Booking } from '../models/Booking'
import { Vehicle } from '../models/Vehicle'
import { User } from '../models/User'
import { Trip } from '../models/Trip'
import { AuthRequest } from '../middleware/auth'
import { setCache, getCache, deleteCache } from '../config/redis'
import { sendBookingConfirmationEmail, sendTripCompletionEmail, sendTripCancellationEmail } from '../services/emailService'

// Create booking (Customer)
export const createBooking = async (req: AuthRequest, res: Response) => {
  try {
    const { vehicleId, pickupDate, dropoffDate, pickupLocation, dropoffLocation, paymentMethod, customerNotes } = req.body

    // Validate dates
    const startDate = new Date(pickupDate)
    const endDate = new Date(dropoffDate)

    if (startDate >= endDate) {
      return res.status(400).json({
        success: false,
        message: 'Dropoff date must be after pickup date'
      })
    }

    if (startDate < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Pickup date cannot be in the past'
      })
    }

    // Check if vehicle exists and is available
    const vehicle = await Vehicle.findById(vehicleId)
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      })
    }

    if (!vehicle.availability || vehicle.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Vehicle is not available for booking'
      })
    }

    // Validate location data
    if (!pickupLocation || !pickupLocation.coordinates || !pickupLocation.address) {
      return res.status(400).json({
        success: false,
        message: 'Valid pickup location with coordinates and address is required'
      })
    }

    if (!dropoffLocation || !dropoffLocation.coordinates || !dropoffLocation.address) {
      return res.status(400).json({
        success: false,
        message: 'Valid dropoff location with coordinates and address is required'
      })
    }

    // Validate coordinates format
    const [pickupLng, pickupLat] = pickupLocation.coordinates
    const [dropoffLng, dropoffLat] = dropoffLocation.coordinates

    if (typeof pickupLng !== 'number' || typeof pickupLat !== 'number' ||
        pickupLng < -180 || pickupLng > 180 || pickupLat < -90 || pickupLat > 90) {
      return res.status(400).json({
        success: false,
        message: 'Invalid pickup location coordinates. Longitude must be between -180 and 180, latitude between -90 and 90'
      })
    }

    if (typeof dropoffLng !== 'number' || typeof dropoffLat !== 'number' ||
        dropoffLng < -180 || dropoffLng > 180 || dropoffLat < -90 || dropoffLat > 90) {
      return res.status(400).json({
        success: false,
        message: 'Invalid dropoff location coordinates. Longitude must be between -180 and 180, latitude between -90 and 90'
      })
    }

    // Calculate pricing
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    const baseAmount = vehicle.pricing.baseRate * (vehicle.pricing.rateType === 'daily' ? days : days * 24)
    const taxes = baseAmount * 0.1
    const fees = baseAmount * 0.05

    const booking = await Booking.create({
      customer: req.user._id,
      vehicle: vehicleId,
      scheduledDate: {
        start: startDate,
        end: endDate
      },
      pickupLocation: {
        type: 'Point',
        coordinates: [pickupLng, pickupLat],
        address: pickupLocation.address.trim()
      },
      dropoffLocation: {
        type: 'Point',
        coordinates: [dropoffLng, dropoffLat],
        address: dropoffLocation.address.trim()
      },
      pricing: {
        baseAmount,
        taxes,
        fees,
        totalAmount: baseAmount + taxes + fees,
        currency: 'USD'
      },
      payment: {
        method: paymentMethod || 'credit_card',
        status: 'pending'
      },
      customerNotes: customerNotes || '',
      status: 'pending'
    })

    await booking.populate('vehicle', 'make modelName year licensePlate pricing')

    // Send booking confirmation email
    const customer = await User.findById(req.user._id)
    if (customer && customer.email) {
      sendBookingConfirmationEmail(booking, customer, vehicle).catch(err => {
        console.error('Failed to send booking confirmation email:', err)
      })
    }

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      data: booking
    })
  } catch (error: any) {
    console.error('Error creating booking:', error.message)
    console.error('Error details:', error)
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err: any) => ({
        field: err.path,
        message: err.message
      }))
      
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      })
    }
    
    // Handle cast errors (invalid ObjectId)
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid vehicle ID'
      })
    }
    
    res.status(500).json({
      success: false,
      message: 'Error creating booking',
      error: error.message
    })
  }
}

// Get all bookings
export const getAllBookings = async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.query
    const query: any = {}
    
    if (status) query.status = status

    const bookings = await Booking.find(query)
      .populate('customer', 'profile.firstName profile.lastName email profile.phone')
      .populate('vehicle', 'make modelName year licensePlate')
      .populate('driver', 'profile.firstName profile.lastName profile.phone')
      .sort({ createdAt: -1 })

    res.json({
      success: true,
      data: bookings
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching bookings',
      error: error.message
    })
  }
}

// Get customer's bookings
export const getCustomerBookings = async (req: AuthRequest, res: Response) => {
  try {
    const bookings = await Booking.find({ customer: req.user._id })
      .populate('vehicle', 'make modelName year licensePlate images pricing')
      .populate('driver', 'profile.firstName profile.lastName profile.phone')
      .sort({ createdAt: -1 })

    res.json({
      success: true,
      data: bookings
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching bookings',
      error: error.message
    })
  }
}

// Get owner's vehicle bookings
export const getOwnerBookings = async (req: AuthRequest, res: Response) => {
  try {
    // Find all vehicles owned by this user
    const vehicles = await Vehicle.find({ owner: req.user._id }).select('_id')
    const vehicleIds = vehicles.map(v => v._id)

    // Find bookings for these vehicles
    const bookings = await Booking.find({ vehicle: { $in: vehicleIds } })
      .populate('customer', 'profile.firstName profile.lastName email profile.phone')
      .populate('vehicle', 'make modelName year licensePlate')
      .populate('driver', 'profile.firstName profile.lastName profile.phone')
      .sort({ createdAt: -1 })

    res.json({
      success: true,
      data: bookings
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching bookings',
      error: error.message
    })
  }
}

// Get driver's assigned bookings
export const getDriverBookings = async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.query
    const query: any = { driver: req.user._id }
    
    if (status) query.status = status

    const bookings = await Booking.find(query)
      .populate('customer', 'profile.firstName profile.lastName email profile.phone')
      .populate('vehicle', 'make modelName year licensePlate owner')
      .sort({ 'scheduledDate.start': 1 })

    res.json({
      success: true,
      data: bookings
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching bookings',
      error: error.message
    })
  }
}

// Get booking by ID
export const getBookingById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params

    const booking = await Booking.findById(id)
      .populate('customer', 'profile.firstName profile.lastName email profile.phone')
      .populate('vehicle', 'make modelName year licensePlate images pricing')
      .populate('driver', 'profile.firstName profile.lastName profile.phone')
      .populate('trip')

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      })
    }

    res.json({
      success: true,
      data: booking
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching booking',
      error: error.message
    })
  }
}

// Update booking status (Owner: accept/reject, assign driver)
export const updateBooking = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { status, driver } = req.body

    const booking = await Booking.findById(id).populate('vehicle')
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      })
    }

    // Check if user is the vehicle owner
    const vehicle: any = booking.vehicle
    if (vehicle.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to update this booking'
      })
    }

    if (status) {
      booking.status = status
    }

    // Prevent confirming without an assigned eligible driver
    if ((status === 'confirmed' || booking.status === 'confirmed') && !booking.driver && !driver) {
      return res.status(400).json({
        success: false,
        message: 'Cannot confirm booking without assigning an eligible driver for this vehicle'
      })
    }

    if (driver) {
      // Validate driver eligibility: must be a driver and registered for this vehicle
      const driverUser = await User.findById(driver).select('role driverVehicleIds')
      if (!driverUser) {
        return res.status(404).json({ success: false, message: 'Driver not found' })
      }
      if (driverUser.role !== 'driver') {
        return res.status(400).json({ success: false, message: 'Selected user is not a driver' })
      }
      const isRegistered = (driverUser.driverVehicleIds || []).some((vid: any) => String(vid) === String(vehicle._id))
      if (!isRegistered) {
        return res.status(400).json({ success: false, message: 'Driver is not registered for this vehicle' })
      }

      booking.driver = driver
      console.log(`Driver ${driver} assigned to booking ${id}`)
      
      // Auto-create trip when driver is assigned and booking is confirmed
      if (booking.status === 'confirmed' || status === 'confirmed') {
        try {
          // Check if trip already exists
          const existingTrip = await Trip.findOne({ booking: id })
          if (!existingTrip) {
            // Get populated booking data for complete information
            const fullBooking = await Booking.findById(id)
              .populate('customer', 'profile.firstName profile.lastName email profile.phone')
              .populate('vehicle', 'make modelName year licensePlate pricing owner')
              .populate('driver', 'profile.firstName profile.lastName profile.phone')

            if (!fullBooking) {
              throw new Error('Booking not found for trip creation')
            }

            const customer = fullBooking.customer as any
            const vehicleData = fullBooking.vehicle as any
            const driverData = await User.findById(driver).select('profile.firstName profile.lastName profile.phone')

            // Calculate estimated earnings (70% of booking amount goes to driver)
            const driverEarnings = booking.pricing.baseAmount * 0.7
            const platformFee = booking.pricing.baseAmount * 0.1
            const netEarnings = driverEarnings - platformFee

            // Create comprehensive trip data
            const trip = await Trip.create({
              booking: id,
              bookingReference: String(id),
              driver: driver,
              status: 'scheduled',
              route: {
                startLocation: {
                  type: 'Point',
                  coordinates: booking.pickupLocation.coordinates,
                  address: booking.pickupLocation.address,
                  timestamp: booking.scheduledDate.start
                }
                // endLocation will be set when trip completes
              },
              expenses: {
                fuel: {
                  amount: 0,
                  liters: 0,
                  pricePerLiter: 90,
                  location: 'To be updated'
                },
                tolls: [],
                parking: [],
                other: []
              },
              earnings: {
                baseAmount: driverEarnings,
                bonuses: 0,
                deductions: platformFee,
                totalAmount: netEarnings
              },
              notes: `Trip scheduled - ${customer?.profile?.firstName || 'Customer'} booking ${vehicleData?.make || ''} ${vehicleData?.modelName || ''} (${vehicleData?.licensePlate || ''}) with driver ${driverData?.profile?.firstName || ''} ${driverData?.profile?.lastName || ''}. Route: ${booking.pickupLocation.address} → ${booking.dropoffLocation.address}`
            })
            booking.trip = trip._id as any
            console.log(`Comprehensive trip ${trip._id} created: ${customer?.profile?.firstName} → ${booking.pickupLocation.address} to ${booking.dropoffLocation.address}`)
          }
        } catch (tripError) {
          console.error('Error auto-creating trip:', tripError)
          // Don't fail the booking update if trip creation fails
        }
      }
    }

    await booking.save()
    await booking.populate('customer vehicle driver trip')

    res.json({
      success: true,
      message: 'Booking updated successfully',
      data: booking
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error updating booking',
      error: error.message
    })
  }
}

// Cancel booking (Customer)
export const cancelBooking = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { cancelReason } = req.body

    const booking = await Booking.findById(id)
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      })
    }

    // Check if user is the customer
    if (booking.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to cancel this booking'
      })
    }

    // Can only cancel pending or confirmed bookings
    if (!['pending', 'confirmed'].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel booking in current status'
      })
    }

    // Store cancellation details
    booking.status = 'cancelled'
    booking.cancelledBy = req.user._id
    booking.cancelledAt = new Date()
    booking.cancelReason = cancelReason || 'Customer cancelled'
    
    await booking.save()
    await booking.populate('vehicle', 'make modelName year licensePlate')

    console.log(`Booking ${id} cancelled by customer ${req.user._id} at ${booking.cancelledAt}`)

    // Send cancellation email
    const customer = await User.findById(req.user._id)
    if (customer && customer.email) {
      sendTripCancellationEmail(booking, customer, booking.vehicle, cancelReason).catch(err => {
        console.error('Failed to send cancellation email:', err)
      })
    }

    res.json({
      success: true,
      message: 'Booking cancelled successfully',
      data: booking
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error cancelling booking',
      error: error.message
    })
  }
}

// Start trip (Driver)
export const startTrip = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params

    const booking = await Booking.findById(id)
      .populate('vehicle')
      .populate('customer', 'profile.firstName profile.lastName email profile.phone')
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      })
    }

    // Check if user is the assigned driver
    if (!booking.driver || booking.driver.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized - you are not assigned to this booking'
      })
    }

    // Can only start confirmed bookings
    if (booking.status !== 'confirmed') {
      return res.status(400).json({
        success: false,
        message: `Cannot start trip - booking status is ${booking.status}`
      })
    }

    booking.status = 'in_progress'
    await booking.save()

    console.log(`Trip started for booking ${id} by driver ${req.user._id}`)

    res.json({
      success: true,
      message: 'Trip started successfully',
      data: booking
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error starting trip',
      error: error.message
    })
  }
}

// Complete trip (Driver)
export const completeTrip = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params

    const booking = await Booking.findById(id)
      .populate('vehicle')
      .populate('customer', 'profile.firstName profile.lastName email profile.phone')
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      })
    }

    // Check if user is the assigned driver
    if (!booking.driver || booking.driver.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized - you are not assigned to this booking'
      })
    }

    // Can only complete active bookings
    if (booking.status !== 'in_progress') {
      return res.status(400).json({
        success: false,
        message: `Cannot complete trip - booking status is ${booking.status}`
      })
    }

    booking.status = 'completed'
    await booking.save()

    console.log(`Trip completed for booking ${id} by driver ${req.user._id}`)

    // Send trip completion email
    const customer = booking.customer as any
    const vehicle = booking.vehicle as any
    if (customer && customer.email) {
      sendTripCompletionEmail(booking, customer, vehicle).catch(err => {
        console.error('Failed to send trip completion email:', err)
      })
    }

    res.json({
      success: true,
      message: 'Trip completed successfully',
      data: booking
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error completing trip',
      error: error.message
    })
  }
}
