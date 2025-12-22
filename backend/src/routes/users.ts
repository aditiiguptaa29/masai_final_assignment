import express from 'express'
import { authenticate, authorize } from '../middleware/auth'
import {
  getAllUsers,
  getUserById,
  getDrivers,
  updateUser,
  deleteUser,
  restoreUser,
  createUser,
  registerDriverToVehicle
} from '../controllers/userController'

const router = express.Router()

// Get all drivers (vehicle owners and admins)
router.get('/drivers', authenticate, authorize('vehicle_owner', 'admin'), getDrivers)

// Get all users (admin only)
router.get('/', authenticate, authorize('admin'), getAllUsers)

// Create user (admin only)
router.post('/', authenticate, authorize('admin'), createUser)

// Get user by ID
router.get('/:id', authenticate, getUserById)

// Update user
router.put('/:id', authenticate, updateUser)

// Delete user (soft delete)
router.delete('/:id', authenticate, authorize('admin'), deleteUser)

// Restore user (admin only)
router.put('/:id/restore', authenticate, authorize('admin'), restoreUser)

export { router as userRoutes }

// Driver self-registration to vehicle
router.post('/driver/register', authenticate, authorize('driver'), registerDriverToVehicle)