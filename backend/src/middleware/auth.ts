import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { User } from '../models/User'
import { getCache } from '../config/redis'

export interface AuthRequest extends Request {
  user?: any
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '')

    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' })
    }

    // Check blacklist in Redis
    const blacklisted = await getCache(`blacklist:${token}`)
    if (blacklisted) {
      return res.status(401).json({ success: false, message: 'Token has been revoked' })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any
    const user = await User.findById(decoded.id)

    if (!user || user.status !== 'active') {
      return res.status(401).json({ success: false, message: 'Token is not valid' })
    }

    req.user = user
    next()
  } catch (error) {
    res.status(401).json({ success: false, message: 'Token is not valid' })
  }
}

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' })
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'Not authorized to access this resource' 
      })
    }

    next()
  }
}