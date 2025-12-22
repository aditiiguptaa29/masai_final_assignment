import { Response } from 'express'
import jwt, { SignOptions } from 'jsonwebtoken'
import { User } from '../models/User'
import { AuthRequest } from '../middleware/auth'
import { getCache, setCache, deleteCache } from '../config/redis'
import { createAccessToken, createRefreshToken, revokeAccessToken, storeRefreshToken, rotateRefreshToken, revokeRefreshToken } from '../utils/token'

const generateToken = (id: string) => createAccessToken(id)

export const register = async (req: AuthRequest, res: Response) => {
  try {
    const { email, password, role, profile } = req.body

    // Check if user already exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      })
    }

    // Create new user
    const user = await User.create({
      email,
      password,
      role,
      profile
    })

    const accessToken = generateToken(user._id.toString())
    const refreshToken = createRefreshToken(user._id.toString())
    await storeRefreshToken(user._id.toString(), refreshToken)

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: user.getPublicProfile(),
        accessToken,
        refreshToken
      }
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error registering user',
      error: error.message
    })
  }
}

export const login = async (req: AuthRequest, res: Response) => {
  try {
    const { email, password } = req.body

    // Find user and include password
    const user = await User.findOne({ email }).select('+password')
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      })
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password)
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      })
    }

    // Update last login
    user.lastLogin = new Date()
    await user.save()

    const accessToken = generateToken(user._id.toString())
    const refreshToken = createRefreshToken(user._id.toString())
    await storeRefreshToken(user._id.toString(), refreshToken)

    // Cache user data
    await setCache(`user:${user._id}`, user.getPublicProfile(), 3600)

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: user.getPublicProfile(),
        accessToken,
        refreshToken
      }
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error logging in',
      error: error.message
    })
  }
}

export const logout = async (req: AuthRequest, res: Response) => {
  try {
    // Clear user cache and revoke tokens
    await deleteCache(`user:${req.user._id}`)
    const token = req.header('Authorization')?.replace('Bearer ', '')
    if (token) {
      await revokeAccessToken(token)
    }
    await revokeRefreshToken(req.user._id.toString())

    res.json({
      success: true,
      message: 'Logged out successfully'
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error logging out',
      error: error.message
    })
  }
}

export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    // Try to get from cache first
    let userData = await getCache(`user:${req.user._id}`)
    
    if (!userData) {
      const user = await User.findById(req.user._id)
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        })
      }
      userData = user.getPublicProfile()
      await setCache(`user:${req.user._id}`, userData, 3600)
    }

    res.json({
      success: true,
      data: userData
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error fetching profile',
      error: error.message
    })
  }
}

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const { profile } = req.body

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { profile },
      { new: true, runValidators: true }
    )

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    // Update cache
    await setCache(`user:${user._id}`, user.getPublicProfile(), 3600)

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: user.getPublicProfile()
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error updating profile',
      error: error.message
    })
  }
}

export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body

    const user = await User.findById(req.user._id).select('+password')
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword)
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      })
    }

    // Update password
    user.password = newPassword
    await user.save()

    res.json({
      success: true,
      message: 'Password changed successfully'
    })
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error changing password',
      error: error.message
    })
  }
}

export const refreshToken = async (req: AuthRequest, res: Response) => {
  try {
    const { token } = req.body

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token required'
      })
    }
    // Verify refresh token
    let decoded: any
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET as string)
    } catch {
      return res.status(401).json({ success: false, message: 'Invalid token' })
    }

    const user = await User.findById(decoded.id)
    if (!user || user.status !== 'active') {
      return res.status(401).json({ success: false, message: 'Invalid token' })
    }

    const stored = await getCache(`refresh:${user._id.toString()}`)
    if (stored !== token) {
      return res.status(401).json({ success: false, message: 'Invalid token' })
    }

    // Rotate refresh token and issue new access token
    const accessToken = generateToken(user._id.toString())
    const newRefresh = await rotateRefreshToken(user._id.toString())

    res.json({
      success: true,
      data: {
        accessToken,
        refreshToken: newRefresh,
        user: user.getPublicProfile()
      }
    })
  } catch (error: any) {
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    })
  }
}