import express from 'express'
import { authenticate, authorize } from '../middleware/auth'
import {
  getDriverTrips,
  getAllTrips,
  getTripById,
  createTrip,
  startTrip,
  completeTrip,
  updateTrip,
  cancelTripAdmin,
  getTripsSummary
} from '../controllers/tripController'

const router = express.Router()

// Driver routes
router.get('/driver/trips', authenticate, authorize('driver'), getDriverTrips)
router.put('/:id/start', authenticate, authorize('driver'), startTrip)
router.put('/:id/complete', authenticate, authorize('driver'), completeTrip)
router.put('/:id', authenticate, authorize('driver'), updateTrip)

// Owner routes
router.post('/', authenticate, authorize('vehicle_owner'), createTrip)

// General routes
router.get('/', authenticate, getAllTrips)
router.get('/summary', authenticate, getTripsSummary)
router.get('/:id', authenticate, getTripById)
router.put('/:id/cancel', authenticate, authorize('admin'), cancelTripAdmin)

export { router as tripRoutes }