import { Response } from 'express'
import { User } from '../models/User'
import { AuthRequest } from '../middleware/auth'
import { Vehicle } from '../models/Vehicle'

// Get all drivers (for vehicle owners to assign)
export const getDrivers = async (req: AuthRequest, res: Response) => {
  try {
    const { vehicleId } = req.query as { vehicleId?: string }

    const baseQuery: any = {
      role: 'driver',
      isDeleted: false,
      status: 'active'
    }

    // If vehicleId provided, filter to drivers registered for that vehicle
    const query = vehicleId ? { ...baseQuery, driverVehicleIds: vehicleId } : baseQuery

    const drivers = await User.find(query)
      .select('profile.firstName profile.lastName email profile.phone profile.licenseNumber driverVehicleIds')
      .sort({ 'profile.firstName': 1 })

    res.json({
      success: true,
      data: drivers
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching drivers',
      error: error.message
    })
  }
}

// Get all users (admin only)
export const getAllUsers = async (req: AuthRequest, res: Response) => {
  try {
    const { role, status } = req.query
    const query: any = { isDeleted: false }

    if (role) query.role = role
    if (status) query['profile.status'] = status

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })

    res.json({
      success: true,
      data: users
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: error.message
    })
  }
}

// Get user by ID
export const getUserById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params

    const user = await User.findOne({ _id: id, isDeleted: false })
      .select('-password')

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    res.json({
      success: true,
      data: user
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user',
      error: error.message
    })
  }
}

// Update user
export const updateUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params

    // Only allow users to update their own profile or admins to update any
    if (req.user._id.toString() !== id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this user'
      })
    }

    // Build allowed $set payload
    const allowedUpdates = req.user.role === 'admin' ? ['profile', 'status', 'email'] : ['profile']
    const updates = Object.keys(req.body)
    const isValidOperation = updates.every(update => allowedUpdates.includes(update))

    if (!isValidOperation) {
      return res.status(400).json({ success: false, message: 'Invalid updates' })
    }

    const $set: any = {}
    if (req.body.email && req.user.role === 'admin') $set.email = req.body.email
    if (req.body.status && req.user.role === 'admin') $set.status = req.body.status
    if (req.body.profile) {
      const p = req.body.profile
      for (const key of ['firstName','lastName','phone','avatar']) {
        if (p[key] !== undefined) {
          $set[`profile.${key}`] = p[key]
        }
      }
      if (p.address) {
        const a = p.address
        for (const k of ['street','city','state','zipCode','country']) {
          if ((a as any)[k] !== undefined) {
            $set[`profile.address.${k}`] = (a as any)[k]
          }
        }
      }
    }

    const updated = await User.findByIdAndUpdate(id, { $set }, { new: true, runValidators: true })

    if (!updated) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    const userResponse = updated.getPublicProfile()

    res.json({ success: true, message: 'User updated successfully', data: userResponse })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error updating user',
      error: error.message
    })
  }
}

// Delete user (soft delete)
export const deleteUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const hard = String((req.query as any).hard || '').toLowerCase() === 'true'

    if (hard) {
      const del = await User.deleteOne({ _id: id })
      if (del.deletedCount === 0) {
        return res.status(404).json({ success: false, message: 'User not found' })
      }
      return res.json({ success: true, message: 'User permanently deleted' })
    }

    const result = await User.updateOne({ _id: id, isDeleted: { $ne: true } }, { $set: { isDeleted: true } })

    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    res.json({ success: true, message: 'User deleted successfully' })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error deleting user',
      error: error.message
    })
  }
}

// Restore user (undo soft delete)
export const restoreUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params

    const result = await User.updateOne({ _id: id }, { $set: { isDeleted: false } })

    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    const updated = await User.findById(id).select('-password')
    res.json({ success: true, message: 'User restored successfully', data: updated })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error restoring user',
      error: error.message
    })
  }
}

// Create user (admin only)
export const createUser = async (req: AuthRequest, res: Response) => {
  try {
    const { email, password, role, profile, status } = req.body

    if (!email || !password || !profile?.firstName || !profile?.lastName) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: email, password, profile.firstName, profile.lastName'
      })
    }

    // Provide sane defaults for required nested fields not present in admin form
    const normalizedProfile = {
      firstName: profile.firstName,
      lastName: profile.lastName,
      phone: profile.phone || `0000000000`,
      avatar: profile.avatar,
      address: {
        street: profile.address?.street || 'N/A',
        city: profile.address?.city || 'N/A',
        state: profile.address?.state || 'N/A',
        zipCode: profile.address?.zipCode || '00000',
        country: profile.address?.country || 'US'
      }
    }

    const newUser = new User({
      email,
      password,
      role: role || 'customer',
      profile: normalizedProfile,
      status: status || 'active'
    })

    await newUser.save()

    const userResponse = newUser.getPublicProfile()

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: userResponse
    })
  } catch (error: any) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || 'field'
      return res.status(400).json({
        success: false,
        message: `${field} already exists`
      })
    }

    res.status(500).json({
      success: false,
      message: 'Error creating user',
      error: error.message
    })
  }
}

// Register driver to vehicle (self-registration)
export const registerDriverToVehicle = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user.role !== 'driver') {
      return res.status(403).json({ success: false, message: 'Only drivers can register to vehicles' })
    }

    const { vehicleId } = req.body
    if (!vehicleId) {
      return res.status(400).json({ success: false, message: 'vehicleId is required' })
    }

    const vehicle = await Vehicle.findOne({ _id: vehicleId, isDeleted: false, status: 'active' })
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found or inactive' })
    }

    const user = await User.findById(req.user._id)
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }

    const exists = (user.driverVehicleIds || []).some((id: any) => String(id) === String(vehicleId))
    if (exists) {
      return res.json({ success: true, message: 'Already registered to this vehicle' })
    }

    user.driverVehicleIds = [...(user.driverVehicleIds || []), vehicle._id]
    await user.save()

    res.json({ success: true, message: 'Registered as driver for vehicle', data: user.getPublicProfile() })
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Error registering driver', error: error.message })
  }
}
