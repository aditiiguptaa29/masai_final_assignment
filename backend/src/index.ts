import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import rateLimit from 'express-rate-limit'
import { getRedisClient } from './config/redis'
import dotenv from 'dotenv'
import { connectDB } from './config/database'
import { connectRedis } from './config/redis'
import { errorHandler } from './middleware/errorHandler'
import { authRoutes } from './routes/auth'
import { userRoutes } from './routes/users'
import { vehicleRoutes } from './routes/vehicles'
import { bookingRoutes } from './routes/bookings'
import { tripRoutes } from './routes/trips'
import { analyticsRoutes } from './routes/analytics'
import adminRoutes from './routes/admin'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// Security middleware
app.use(helmet())
app.use(compression())

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
})
app.use(limiter)

// Redis-backed rate limiter for auth routes
const authLimiterRedis = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const redis = getRedisClient()
    const windowMs = 2 * 60 * 1000
    const max = 5
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown'
    const now = Date.now()
    const windowStart = Math.floor(now / windowMs) * windowMs
    const rlKey = `rl:auth:${ip}:${windowStart}`

    const count = await redis.incr(rlKey)
    if (count === 1) {
      await redis.pexpire(rlKey, windowMs)
    }

    if (count > max) {
      return res.status(429).json({ success: false, message: 'Too many requests, please try again later.' })
    }
    next()
  } catch {
    next()
  }
}

// CORS configuration
const allowedOrigins = [process.env.FRONTEND_URL, process.env.ADMIN_URL].filter(Boolean) as string[]
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true)
    if (allowedOrigins.length && allowedOrigins.includes(origin)) {
      return callback(null, true)
    }
    // In development, allow localhost origins to simplify multi-app setup (frontend/admin)
    if (process.env.NODE_ENV === 'development' && origin.includes('localhost')) {
      return callback(null, true)
    }
    return callback(new Error('Not allowed by CORS'))
  },
  credentials: true
}))

// Body parsing middleware
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// API routes
app.use('/api/auth', authLimiterRedis, authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/vehicles', vehicleRoutes)
app.use('/api/bookings', bookingRoutes)
app.use('/api/trips', tripRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/admin', adminRoutes)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() })
})

// Error handling
app.use(errorHandler)

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' })
})

async function startServer() {
  try {
    await connectDB()
    await connectRedis()
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`)
      console.log(`🌍 Environment: ${process.env.NODE_ENV}`)
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

startServer()