import { Request, Response, NextFunction } from 'express'
import { getRedisClient } from '../config/redis'

interface Options {
  key: string
  windowMs: number
  max: number
}

const rateLimitRedis = ({ key, windowMs, max }: Options) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const redis = getRedisClient()
      const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown'
      const now = Date.now()
      const windowStart = Math.floor(now / windowMs) * windowMs
      const rlKey = `rl:${key}:${ip}:${windowStart}`

      const count = await redis.incr(rlKey)
      if (count === 1) {
        await redis.pexpire(rlKey, windowMs)
      }

      if (count > max) {
        return res.status(429).json({
          success: false,
          message: 'Too many requests, please try again later.'
        })
      }

      next()
    } catch (err) {
      // Fail-open on Redis errors
      next()
    }
  }
}

export default rateLimitRedis
