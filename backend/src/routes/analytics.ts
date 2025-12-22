import express from 'express'
import { authenticate, authorize } from '../middleware/auth'
import { getTripsSummary } from '../controllers/tripController'

const router = express.Router()

// Get dashboard analytics
// Dashboard analytics: reuse trips summary (counts + revenue)
router.get('/dashboard', authenticate, getTripsSummary)

// Get revenue analytics
// Revenue analytics: for now return trips summary; can be expanded per-owner
router.get('/revenue', authenticate, authorize('vehicle_owner', 'admin'), getTripsSummary)

// Get vehicle performance
// Vehicle performance: placeholder consistent JSON
router.get('/vehicles/:id/performance', authenticate, (req, res) => {
  res.json({ success: true, message: 'Vehicle performance endpoint', data: { id: req.params.id } })
})

// Get trip analytics
router.get('/trips', authenticate, getTripsSummary)

export { router as analyticsRoutes }