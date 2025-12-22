import { Response } from 'express'
import { Trip } from '../models/Trip'
import { Booking } from '../models/Booking'
import { AuthRequest } from '../middleware/auth'

// Get driver's trips
export const getDriverTrips = async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.query

    const query: any = { driver: req.user._id }
    if (status) query.status = status

    const trips = await Trip.find(query)
      .populate({
        path: 'booking',
        populate: [
          { path: 'customer', select: 'profile.firstName profile.lastName profile.phone email' },
          { path: 'vehicle', select: 'make modelName year licensePlate images' }
        ]
      })
      .sort({ startTime: -1 })

    res.json({
      success: true,
      data: trips
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching trips',
      error: error.message
    })
  }
}

// Get all trips (Admin)
export const getAllTrips = async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.query as { status?: string }
    const filter: any = {}
    if (status) filter.status = status

    const trips = await Trip.find(filter)
      .populate({
        path: 'booking',
        populate: [
          { 
            path: 'customer', 
            select: 'profile.firstName profile.lastName email profile.phone',
            model: 'User'
          },
          { 
            path: 'vehicle', 
            select: 'make modelName year licensePlate pricing owner',
            model: 'Vehicle'
          }
        ]
      })
      .populate('driver', 'profile.firstName profile.lastName profile.phone email')
      .sort({ createdAt: -1 })

    // Transform the data to include comprehensive information
    const enrichedTrips = trips.map(trip => {
      const booking = trip.booking as any
      const customer = booking?.customer
      const vehicle = booking?.vehicle
      const driver = trip.driver as any

      return {
        ...trip.toObject(),
        tripInfo: {
          id: trip._id,
          status: trip.status,
          distance: trip.distance,
          startTime: trip.startTime,
          endTime: trip.endTime,
          
          // Customer Details
          customer: {
            name: customer ? `${customer.profile?.firstName || ''} ${customer.profile?.lastName || ''}`.trim() : 'Unknown',
            email: customer?.email || 'N/A',
            phone: customer?.profile?.phone || 'N/A'
          },
          
          // Driver Details  
          driver: {
            name: driver ? `${driver.profile?.firstName || ''} ${driver.profile?.lastName || ''}`.trim() : 'Unknown',
            phone: driver?.profile?.phone || 'N/A',
            email: driver?.email || 'N/A'
          },
          
          // Vehicle Details
          vehicle: {
            info: vehicle ? `${vehicle.make || ''} ${vehicle.modelName || ''} (${vehicle.licensePlate || ''})`.trim() : 'Unknown',
            year: vehicle?.year || 'N/A'
          },
          
          // Route Details
          route: {
            from: booking?.pickupLocation?.address || 'N/A',
            to: booking?.dropoffLocation?.address || 'N/A',
            fromCoords: booking?.pickupLocation?.coordinates || [],
            toCoords: booking?.dropoffLocation?.coordinates || []
          },
          
          // Financial Details
          financial: {
            bookingAmount: booking?.pricing?.totalAmount || 0,
            driverEarnings: trip.earnings?.totalAmount || 0,
            baseAmount: trip.earnings?.baseAmount || 0,
            bonuses: trip.earnings?.bonuses || 0,
            deductions: trip.earnings?.deductions || 0,
            fuelCost: trip.expenses?.fuel?.amount || 0,
            tollCost: trip.expenses?.tolls?.reduce((sum: number, toll: any) => sum + (toll.amount || 0), 0) || 0
          },
          
          // Timing
          scheduled: {
            start: booking?.scheduledDate?.start || null,
            end: booking?.scheduledDate?.end || null
          }
        }
      }
    })

    // Compute global completed revenue (ignoring current filter)
    const completedTripsAll = await Trip.find({ status: 'completed' })
      .populate({ path: 'booking', select: 'pricing.totalAmount', model: 'Booking' })

    const completedRevenueTotal = completedTripsAll.reduce((sum, t: any) => {
      const bookingTotal = t?.booking?.pricing?.totalAmount
      const earningsTotal = t?.earnings?.totalAmount
      const amount = typeof bookingTotal === 'number' ? bookingTotal : (typeof earningsTotal === 'number' ? earningsTotal : 0)
      return sum + amount
    }, 0)

    res.json({
      success: true,
      data: enrichedTrips,
      summary: {
        total: trips.length,
        nonCancelled: trips.filter(t => t.status !== 'cancelled').length,
        scheduled: trips.filter(t => t.status === 'scheduled').length,
        inProgress: trips.filter(t => t.status === 'in_progress').length,
        completed: trips.filter(t => t.status === 'completed').length,
        cancelled: trips.filter(t => t.status === 'cancelled').length,
        completedRevenueTotal
      }
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching trips',
      error: error.message
    })
  }
}

// Summary: counts and total revenue
export const getTripsSummary = async (req: AuthRequest, res: Response) => {
  try {
    // Counts by status and total
    const [
      totalTrips,
      scheduledTrips,
      inProgressTrips,
      completedTrips,
      cancelledTrips
    ] = await Promise.all([
      Trip.countDocuments({}),
      Trip.countDocuments({ status: 'scheduled' }),
      Trip.countDocuments({ status: 'in_progress' }),
      Trip.countDocuments({ status: 'completed' }),
      Trip.countDocuments({ status: 'cancelled' })
    ])

    // Total revenue from completed trips. Prefer Booking.pricing.totalAmount; fallback to Trip.earnings.totalAmount
    const revenueAgg = await Trip.aggregate([
      { $match: { status: 'completed' } },
      {
        $lookup: {
          from: 'bookings',
          localField: 'booking',
          foreignField: '_id',
          as: 'booking'
        }
      },
      {
        $project: {
          bookingTotal: {
            $ifNull: [ { $arrayElemAt: [ '$booking.pricing.totalAmount', 0 ] }, 0 ]
          },
          earningsTotal: { $ifNull: [ '$earnings.totalAmount', 0 ] }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: {
            $sum: {
              $cond: [ { $gt: [ '$bookingTotal', 0 ] }, '$bookingTotal', '$earningsTotal' ]
            }
          }
        }
      }
    ])

    const totalRevenue = revenueAgg.length ? revenueAgg[0].totalRevenue : 0

    return res.json({
      success: true,
      summary: {
        totalTrips,
        scheduledTrips,
        inProgressTrips,
        completedTrips,
        cancelledTrips,
        totalRevenue
      }
    })
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Error generating trips summary',
      error: error.message
    })
  }
}

// Get trip by ID
export const getTripById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params

    const trip = await Trip.findById(id)
      .populate({
        path: 'booking',
        populate: [
          { path: 'customer', select: 'profile.firstName profile.lastName profile.phone email' },
          { path: 'vehicle', select: 'make modelName year licensePlate images' }
        ]
      })
      .populate('driver', 'profile.firstName profile.lastName profile.phone')

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found'
      })
    }

    res.json({
      success: true,
      data: trip
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching trip',
      error: error.message
    })
  }
}

// Create trip (System - when owner assigns driver)
export const createTrip = async (req: AuthRequest, res: Response) => {
  try {
    const { bookingId, driverId } = req.body

    // Validate booking exists and is confirmed
    const booking = await Booking.findById(bookingId).populate('vehicle')
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
        message: 'Unauthorized to create trip for this booking'
      })
    }

    // Validate driver eligibility: must be driver and registered to this vehicle
    const driverUser = await (await import('../models/User')).User.findById(driverId).select('role driverVehicleIds')
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

    // Check if trip already exists for this booking
    const existingTrip = await Trip.findOne({ booking: bookingId })
    if (existingTrip) {
      return res.status(400).json({
        success: false,
        message: 'Trip already exists for this booking'
      })
    }

    const trip = await Trip.create({
      booking: bookingId,
      bookingReference: String(bookingId),
      driver: driverId,
      status: 'scheduled'
    })

    // Update booking with trip reference
    booking.trip = trip._id as any
    booking.status = 'confirmed'
    await booking.save()

    await trip.populate('booking driver')

    res.status(201).json({
      success: true,
      message: 'Trip created successfully',
      data: trip
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error creating trip',
      error: error.message
    })
  }
}

// Start trip (Driver)
export const startTrip = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { odometer, currentLocation } = req.body

    const trip = await Trip.findById(id).populate('booking')
    
    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found'
      })
    }

    // Check if user is the assigned driver
    if (trip.driver.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to start this trip'
      })
    }

    if (trip.status !== 'scheduled') {
      return res.status(400).json({
        success: false,
        message: 'Trip cannot be started in current status'
      })
    }

    const booking = trip.booking as any
    const startTime = new Date()

    // Update trip with start information
    trip.status = 'in_progress'
    trip.startTime = startTime
    trip.startOdometer = odometer

    // Set route start location
    if (currentLocation && currentLocation.coordinates) {
      trip.route = {
        startLocation: {
          type: 'Point',
          coordinates: currentLocation.coordinates,
          address: currentLocation.address || booking.pickupLocation.address,
          timestamp: startTime
        }
      }
    } else {
      // Use booking pickup location as fallback
      trip.route = {
        startLocation: {
          type: 'Point',
          coordinates: booking.pickupLocation.coordinates,
          address: booking.pickupLocation.address,
          timestamp: startTime
        }
      }
    }

    await trip.save()
    
    // Update booking status
    await Booking.findByIdAndUpdate(trip.booking, { status: 'in_progress' })

    await trip.populate({
      path: 'booking',
      populate: [
        { path: 'customer', select: 'profile.firstName profile.lastName profile.phone' },
        { path: 'vehicle', select: 'make modelName year licensePlate images' }
      ]
    })

    res.json({
      success: true,
      message: 'Trip started successfully',
      data: trip
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
    const { odometer, currentLocation, expenses, rating, notes } = req.body

    const trip = await Trip.findById(id).populate('booking')
    
    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found'
      })
    }

    // Check if user is the assigned driver
    if (trip.driver.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to complete this trip'
      })
    }

    if (trip.status !== 'in_progress') {
      return res.status(400).json({
        success: false,
        message: `Trip cannot be completed when status is ${trip.status}. Start the trip first.`,
      })
    }

    const booking = trip.booking as any
    const endTime = new Date()

    // Validate ending odometer
    const startOdo = typeof trip.startOdometer === 'number' ? trip.startOdometer : 0
    const endOdo = typeof odometer === 'number' ? odometer : startOdo
    if (endOdo < startOdo) {
      return res.status(400).json({
        success: false,
        message: 'Ending odometer must be greater than or equal to starting odometer'
      })
    }

    // Update trip with completion information
    trip.status = 'completed'
    trip.endTime = endTime
    trip.endOdometer = endOdo
    // Ensure non-negative distance for schema validation
    trip.distance = Math.max(0, endOdo - startOdo)

    // Set route end location
    if (currentLocation && currentLocation.coordinates) {
      if (!trip.route) {
        trip.route = {}
      }
      trip.route.endLocation = {
        type: 'Point',
        coordinates: currentLocation.coordinates,
        address: currentLocation.address || booking.dropoffLocation.address,
        timestamp: endTime
      }
    } else {
      // Use booking dropoff location as fallback
      if (!trip.route) {
        trip.route = {}
      }
      trip.route.endLocation = {
        type: 'Point',
        coordinates: booking.dropoffLocation.coordinates,
        address: booking.dropoffLocation.address,
        timestamp: endTime
      }
    }

    // Add expenses if provided, or use defaults
    if (expenses) {
      trip.expenses = {
        fuel: expenses.fuel || undefined,
        tolls: expenses.tolls || [],
        parking: expenses.parking || [],
        other: expenses.other || []
      }
    } else {
      // Add realistic default expenses based on trip distance
      const estimatedDistance = trip.distance || 50 // Default 50km if no distance
      const fuelCost = Math.round(estimatedDistance * 0.08 * 90) // ₹90/L, 12.5 km/L efficiency
      
      trip.expenses = {
        fuel: {
          amount: fuelCost,
          liters: Math.round(estimatedDistance * 0.08 * 10) / 10, // 1 decimal place
          pricePerLiter: 90,
          location: 'Highway Petrol Pump'
        },
        tolls: estimatedDistance > 30 ? [{
          amount: Math.round(estimatedDistance * 0.5), // ₹0.5 per km toll
          location: 'Highway Toll Plaza'
        }] : [],
        parking: [{
          amount: 20,
          location: 'Destination Parking',
          duration: 30 // 30 minutes
        }],
        other: []
      }
    }

    // Add driver rating if provided
    if (rating) {
      if (!trip.rating) trip.rating = {}
      trip.rating.byDriver = rating.byDriver
      trip.rating.driverComment = rating.driverComment
    }

    // Add notes if provided, or generate default
    if (notes) {
      trip.notes = notes
    } else {
      trip.notes = `Trip completed successfully. Distance: ${trip.distance || 'N/A'}km, Duration: ${
        trip.startTime && trip.endTime 
          ? Math.round((trip.endTime.getTime() - trip.startTime.getTime()) / (1000 * 60)) + ' minutes'
          : 'N/A'
      }`
    }

    // Calculate comprehensive earnings (clamped to avoid negative totals)
    const baseAmountSource =
      typeof booking?.pricing?.baseAmount === 'number'
        ? booking.pricing.baseAmount
        : (typeof booking?.pricing?.totalAmount === 'number' ? booking.pricing.totalAmount : 0)
    const baseEarnings = Math.max(0, baseAmountSource * 0.7) // 70% to driver
    const distanceBonus = (trip.distance || 0) > 50 ? 50 : 0 // ₹50 bonus for long trips
    const ratingBonus = (trip.rating?.byCustomer || 0) >= 4.5 ? 25 : 0 // ₹25 for high rating
    const totalExpenses = (trip.expenses?.fuel?.amount || 0) + 
                         (trip.expenses?.tolls?.reduce((sum, toll) => sum + (toll.amount || 0), 0) || 0) +
                         (trip.expenses?.parking?.reduce((sum, parking) => sum + (parking.amount || 0), 0) || 0)
    const rawTotal = baseEarnings + distanceBonus + ratingBonus - totalExpenses
    trip.earnings = {
      baseAmount: baseEarnings,
      bonuses: Math.max(0, distanceBonus + ratingBonus),
      deductions: Math.max(0, totalExpenses),
      totalAmount: Math.max(0, rawTotal)
    }

    await trip.save()
    
    // Update booking status
    await Booking.findByIdAndUpdate(trip.booking, { 
      status: 'completed',
      'payment.status': 'completed'
    })

    await trip.populate({
      path: 'booking',
      populate: [
        { path: 'customer', select: 'profile.firstName profile.lastName profile.phone' },
        { path: 'vehicle', select: 'make modelName year licensePlate images' }
      ]
    })

    res.json({
      success: true,
      message: 'Trip completed successfully',
      data: trip
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error completing trip',
      error: error.message
    })
  }
}

// Update trip (for emergency updates)
export const updateTrip = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const updates = req.body

    const trip = await Trip.findById(id)
    
    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found'
      })
    }

    // Check if user is the assigned driver
    if (trip.driver.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to update this trip'
      })
    }

    Object.assign(trip, updates)
    await trip.save()

    res.json({
      success: true,
      message: 'Trip updated successfully',
      data: trip
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error updating trip',
      error: error.message
    })
  }
}

// Cancel trip (Admin)
export const cancelTripAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const trip = await Trip.findById(id).populate('booking')

    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' })
    }

    const setUpdate: any = { status: 'cancelled', endTime: new Date() }
    if (trip.earnings && typeof trip.earnings.totalAmount === 'number' && trip.earnings.totalAmount < 0) {
      setUpdate['earnings.totalAmount'] = 0
    }

    const updated = await Trip.findByIdAndUpdate(id, { $set: setUpdate }, { new: true, runValidators: true })

    if (updated?.booking) {
      await Booking.findByIdAndUpdate((updated.booking as any)._id, { status: 'cancelled' })
    }

    res.json({ success: true, message: 'Trip cancelled', data: updated })
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Error cancelling trip', error: error.message })
  }
}
