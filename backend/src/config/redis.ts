import { createClient } from 'redis'

let redisClient: any

export const connectRedis = async (): Promise<void> => {
  try {
    redisClient = createClient({
      url: process.env.REDIS_URL as string
    })

    redisClient.on('error', (err: Error) => {
      console.error('❌ Redis Client Error:', err)
    })

    redisClient.on('connect', () => {
      console.log('🔗 Redis connecting...')
    })

    redisClient.on('ready', () => {
      console.log('✅ Redis Connected and Ready')
    })

    redisClient.on('end', () => {
      console.log('🔌 Redis connection closed')
    })

    await redisClient.connect()
  } catch (error) {
    console.error('❌ Error connecting to Redis:', error)
    throw error
  }
}

export const getRedisClient = () => {
  if (!redisClient) {
    throw new Error('Redis client not initialized')
  }
  return redisClient
}

// Cache helper functions
export const setCache = async (key: string, value: any, expireTime = 3600): Promise<void> => {
  try {
    await redisClient.setEx(key, expireTime, JSON.stringify(value))
  } catch (error) {
    console.error('Cache set error:', error)
  }
}

export const getCache = async (key: string): Promise<any> => {
  try {
    const value = await redisClient.get(key)
    return value ? JSON.parse(value) : null
  } catch (error) {
    console.error('Cache get error:', error)
    return null
  }
}

export const deleteCache = async (key: string): Promise<void> => {
  try {
    await redisClient.del(key)
  } catch (error) {
    console.error('Cache delete error:', error)
  }
}