import { Response } from 'express'
import { Vehicle } from '../models/Vehicle'
import { AuthRequest } from '../middleware/auth'
import { setCache, getCache, deleteCache } from '../config/redis'
import { Booking } from '../models/Booking'
import { Trip } from '../models/Trip'

// Get all vehicles with filters
export const getAllVehicles = async (req: AuthRequest, res: Response) => {
  try {
    const { type, minPrice, maxPrice, location, status, availability } = req.query

    const query: any = { isDeleted: false }

    if (type) query.type = type
    if (status) query.status = status
    if (availability !== undefined) {
      query.availability = availability === 'true'
    }
    if (minPrice || maxPrice) {
      query['pricing.baseRate'] = {}
      if (minPrice) query['pricing.baseRate'].$gte = Number(minPrice)
      if (maxPrice) query['pricing.baseRate'].$lte = Number(maxPrice)
    }

    const vehicles = await Vehicle.find(query)
      .populate('owner', 'profile.firstName profile.lastName email')
      .sort({ createdAt: -1 })

    res.json({
      success: true,
      data: vehicles
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching vehicles',
      error: error.message
    })
  }
}

// Get vehicle by ID
export const getVehicleById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params

    // Try cache first
    let vehicle = await getCache(`vehicle:${id}`)

    if (!vehicle) {
      vehicle = await Vehicle.findOne({ _id: id, isDeleted: false })
        .populate('owner', 'profile.firstName profile.lastName email profile.phone')

      if (!vehicle) {
        return res.status(404).json({
          success: false,
          message: 'Vehicle not found'
        })
      }

      await setCache(`vehicle:${id}`, vehicle, 1800)
    }

    res.json({
      success: true,
      data: vehicle
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching vehicle',
      error: error.message
    })
  }
}

// Get owner's vehicles
export const getOwnerVehicles = async (req: AuthRequest, res: Response) => {
  try {
    const vehicles = await Vehicle.find({
      owner: req.user._id,
      isDeleted: false
    }).sort({ createdAt: -1 })

    res.json({
      success: true,
      data: vehicles
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching vehicles',
      error: error.message
    })
  }
}

// Create vehicle
export const createVehicle = async (req: AuthRequest, res: Response) => {
  try {
    const vehicleData = {
      ...req.body,
      // Allow admin to specify owner; fallback to current user for owners
      owner: req.body.owner || req.user._id
    }

    console.log('Creating vehicle with data:', JSON.stringify(vehicleData, null, 2))

    const vehicle = await Vehicle.create(vehicleData)

    res.status(201).json({
      success: true,
      message: 'Vehicle created successfully',
      data: vehicle
    })
  } catch (error: any) {
    console.error('Error creating vehicle:', error.message)
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
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0]
      return res.status(400).json({
        success: false,
        message: `${field} already exists`
      })
    }
    
    res.status(500).json({
      success: false,
      message: 'Error creating vehicle',
      error: error.message
    })
  }
}

// Restore vehicle (undo soft delete)
export const restoreVehicle = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params

    const vehicle = await Vehicle.findOne({ _id: id })

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      })
    }

    if (!vehicle.isDeleted) {
      return res.json({ success: true, message: 'Vehicle already active' })
    }

    vehicle.isDeleted = false
    await vehicle.save()

    res.json({
      success: true,
      message: 'Vehicle restored successfully',
      data: vehicle
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error restoring vehicle',
      error: error.message
    })
  }
}

// Update vehicle
export const updateVehicle = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params

    // Admins can update any vehicle; owners can update their own
    const match: any = { _id: id, isDeleted: false }
    if (req.user.role !== 'admin') {
      match.owner = req.user._id
    }

    const vehicle = await Vehicle.findOne(match)

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found or unauthorized'
      })
    }

    Object.assign(vehicle, req.body)
    // Deep merge known nested structures to support partial updates
    if (req.body.capacity) {
      vehicle.capacity = {
        passengers: req.body.capacity.passengers ?? vehicle.capacity.passengers,
        cargo: req.body.capacity.cargo ?? vehicle.capacity.cargo
      }
    }
    if (req.body.pricing) {
      vehicle.pricing = {
        baseRate: req.body.pricing.baseRate ?? vehicle.pricing.baseRate,
        currency: req.body.pricing.currency ?? vehicle.pricing.currency,
        rateType: req.body.pricing.rateType ?? vehicle.pricing.rateType
      }
    }
    if (req.body.location) {
      vehicle.location = {
        type: vehicle.location.type,
        coordinates: vehicle.location.coordinates,
        address: req.body.location.address ?? vehicle.location.address,
        city: req.body.location.city ?? vehicle.location.city,
        state: req.body.location.state ?? vehicle.location.state
      }
    }
    await vehicle.save()

    // Clear cache
    await deleteCache(`vehicle:${id}`)

    res.json({
      success: true,
      message: 'Vehicle updated successfully',
      data: vehicle
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error updating vehicle',
      error: error.message
    })
  }
}

// Delete vehicle (soft delete)
export const deleteVehicle = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params

    // Admins can delete any vehicle; owners can delete their own
    const match: any = { _id: id, isDeleted: false }
    if (req.user.role !== 'admin') {
      match.owner = req.user._id
    }

    const vehicle = await Vehicle.findOne(match)

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found or unauthorized'
      })
    }

    vehicle.isDeleted = true
    await vehicle.save()

    // Clear cache
    await deleteCache(`vehicle:${id}`)

    // Cascade: cancel future bookings and active trips for this vehicle
    try {
      const affectedBookings = await Booking.updateMany(
        { vehicle: vehicle._id, status: { $in: ['pending', 'confirmed', 'in_progress'] } },
        { $set: { status: 'cancelled', cancelledAt: new Date(), cancelReason: 'Vehicle deleted by owner' } }
      )

      // Cancel trips linked to these bookings (not completed)
      const bookingsIds = await Booking.find({ vehicle: vehicle._id }, { _id: 1 }).lean()
      const bookingIdList = bookingsIds.map(b => b._id)
      await Trip.updateMany(
        { booking: { $in: bookingIdList }, status: { $in: ['scheduled', 'in_progress'] } },
        { $set: { status: 'cancelled', endTime: new Date() } }
      )
      console.log(`Cascade applied: ${affectedBookings.modifiedCount} bookings cancelled for vehicle ${vehicle._id}`)
    } catch (cascadeErr) {
      console.error('Vehicle delete cascade error:', cascadeErr)
    }

    res.json({
      success: true,
      message: 'Vehicle deleted successfully (cascade applied)'
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error deleting vehicle',
      error: error.message
    })
  }
}
