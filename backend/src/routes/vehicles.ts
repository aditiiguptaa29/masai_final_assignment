import express from 'express'
import { authenticate, authorize } from '../middleware/auth'
import {
  getAllVehicles,
  getVehicleById,
  getOwnerVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  restoreVehicle
} from '../controllers/vehicleController'

const router = express.Router()

// Get owner's vehicles (must be before /:id)
router.get('/owner/my-vehicles', authenticate, authorize('vehicle_owner'), getOwnerVehicles)

// Get all vehicles (public)
router.get('/', getAllVehicles)

// Get vehicle by ID (public)
router.get('/:id', getVehicleById)

// Create vehicle (vehicle owners and admins)
router.post('/', authenticate, authorize('vehicle_owner', 'admin'), createVehicle)

// Update vehicle (vehicle owners and admins)
router.put('/:id', authenticate, authorize('vehicle_owner', 'admin'), updateVehicle)

// Delete vehicle (soft delete) (vehicle owners and admins)
router.delete('/:id', authenticate, authorize('vehicle_owner', 'admin'), deleteVehicle)

// Restore vehicle (admins only for now)
router.put('/:id/restore', authenticate, authorize('admin'), restoreVehicle)

export { router as vehicleRoutes }