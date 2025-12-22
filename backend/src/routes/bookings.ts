import express from 'express'
import { authenticate, authorize } from '../middleware/auth'
import {
  createBooking,
  getAllBookings,
  getCustomerBookings,
  getOwnerBookings,
  getDriverBookings,
  getBookingById,
  updateBooking,
  cancelBooking,
  startTrip,
  completeTrip
} from '../controllers/bookingController'

const router = express.Router()

// Customer routes
router.post('/', authenticate, authorize('customer'), createBooking)
router.get('/my-bookings', authenticate, authorize('customer'), getCustomerBookings)
router.put('/:id/cancel', authenticate, authorize('customer'), cancelBooking)

// Owner routes
router.get('/owner/bookings', authenticate, authorize('vehicle_owner'), getOwnerBookings)
router.put('/:id', authenticate, authorize('vehicle_owner'), updateBooking)

// Driver routes
router.get('/driver/bookings', authenticate, authorize('driver'), getDriverBookings)
router.put('/:id/start', authenticate, authorize('driver'), startTrip)
router.put('/:id/complete', authenticate, authorize('driver'), completeTrip)

// General routes
router.get('/', authenticate, getAllBookings)
router.get('/:id', authenticate, getBookingById)

export { router as bookingRoutes }