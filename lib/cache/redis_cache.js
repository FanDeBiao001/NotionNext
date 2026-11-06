import BLOG from '@/blog.config'
import { siteConfig } from '@/lib/config'
import Redis from 'ioredis'

export const redisClient = BLOG.REDIS_URL ? new Redis(BLOG.REDIS_URL) : {}

const cacheTime = Math.trunc(
  siteConfig('NEXT_REVALIDATE_SECOND', BLOG.NEXT_REVALIDATE_SECOND) * 1.5
)

export async function getCache(key) {
  try {
    const data = await redisClient.get(key)
    return data ? JSON.parse(data) : null
  } catch (e) {
    throw new Error('Redis cache read failed')
  }
}

export async function setCache(key, data, customCacheTime) {
  try {
    await redisClient.set(
      key,
      JSON.stringify(data),
      'EX',
      customCacheTime || cacheTime
    )
  } catch (e) {
    throw new Error('Redis cache write failed')
  }
}

export async function delCache(key) {
  try {
    await redisClient.del(key)
  } catch (e) {
    throw new Error('Redis cache delete failed')
  }
}

export default { getCache, setCache, delCache }
