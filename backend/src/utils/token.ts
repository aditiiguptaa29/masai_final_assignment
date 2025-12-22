import jwt, { Secret } from 'jsonwebtoken'
import crypto from 'crypto'
import { setCache, deleteCache } from '../config/redis'

const ACCESS_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'
const REFRESH_EXPIRES_SECONDS = parseInt(process.env.REFRESH_EXPIRES_SECONDS || String(30 * 24 * 60 * 60), 10)

function parseDurationToSeconds(value: string): number {
  const trimmed = String(value).trim()
  const num = parseInt(trimmed, 10)
  if (!isNaN(num) && /^\d+$/.test(trimmed)) return num
  const match = trimmed.match(/^(\d+)\s*([smhd])$/i)
  if (!match) return 7 * 24 * 60 * 60 // default 7d
  const amount = parseInt(match[1], 10)
  const unit = match[2].toLowerCase()
  switch (unit) {
    case 's': return amount
    case 'm': return amount * 60
    case 'h': return amount * 60 * 60
    case 'd': return amount * 24 * 60 * 60
    default: return 7 * 24 * 60 * 60
  }
}

const ACCESS_EXPIRES_SECONDS = parseDurationToSeconds(ACCESS_EXPIRES_IN)

export const createAccessToken = (id: string) => {
  const jti = crypto.randomUUID()
  const secret: Secret = process.env.JWT_SECRET as Secret
  return jwt.sign({ id, jti }, secret, { expiresIn: ACCESS_EXPIRES_SECONDS })
}

export const createRefreshToken = (id: string) => {
  const jti = crypto.randomUUID()
  const secret: Secret = process.env.JWT_SECRET as Secret
  return jwt.sign({ id, jti, type: 'refresh' }, secret, { expiresIn: REFRESH_EXPIRES_SECONDS })
}

export const revokeAccessToken = async (token: string) => {
  try {
    const decoded: any = jwt.decode(token)
    const exp = decoded?.exp ? decoded.exp * 1000 : Date.now() + 10 * 60 * 1000
    const ttlSeconds = Math.max(1, Math.floor((exp - Date.now()) / 1000))
    await setCache(`blacklist:${token}`, { revoked: true }, ttlSeconds)
  } catch {}
}

export const storeRefreshToken = async (userId: string, token: string) => {
  await setCache(`refresh:${userId}`, token, REFRESH_EXPIRES_SECONDS)
}

export const rotateRefreshToken = async (userId: string) => {
  const refresh = createRefreshToken(userId)
  await storeRefreshToken(userId, refresh)
  return refresh
}

export const revokeRefreshToken = async (userId: string) => {
  await deleteCache(`refresh:${userId}`)
}
