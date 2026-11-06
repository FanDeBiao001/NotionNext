import fs from 'node:fs'
import path from 'node:path'
import { createHash, randomUUID } from 'node:crypto'
import { getNotionCacheRoot } from './build_session'
import { redisClient } from './redis_cache'
import BLOG from '@/blog.config'
import FileCache from './local_file_cache'
import MemoryCache from './memory_cache'
import RedisCache from './redis_cache'
import { withFileLock } from './file_lock'

export const cacheStats = {
  hit: 0,
  miss: 0,
  set: 0,
  error: 0,
  total: 0,
  perStore: {}
}

const isBuildPhase =
  process.env.npm_lifecycle_event === 'build' ||
  process.env.npm_lifecycle_event === 'export'

const enableLocalCache = isBuildPhase || !BLOG.isProd
const hasRedis = !!BLOG.REDIS_URL
const inflightMap = new Map()
const namespace = createHash('sha256')
  .update(String(BLOG.NOTION_PAGE_ID))
  .digest('hex')
  .slice(0, 16)
const generationFile = path.join(getNotionCacheRoot(), 'generation')
let localGeneration = '0'

async function generation() {
  if (hasRedis) {
    try {
      return (await redisClient.get(`nn:cache:${namespace}:generation`)) || '0'
    } catch {
      cacheStats.error++
      return null
    }
  }
  if (!enableLocalCache) return localGeneration
  try {
    return fs.readFileSync(generationFile, 'utf8')
  } catch {
    return localGeneration
  }
}

async function scopedKey(key, version) {
  const current = version ?? (await generation())
  return current === null ? null : `nn:cache:${namespace}:${current}:${key}`
}

export async function invalidateAllCaches() {
  const next = randomUUID()
  if (hasRedis) await redisClient.set(`nn:cache:${namespace}:generation`, next)
  localGeneration = next
  if (enableLocalCache) {
    fs.mkdirSync(path.dirname(generationFile), { recursive: true })
    const temporary = `${generationFile}.${randomUUID()}.tmp`
    fs.writeFileSync(temporary, next)
    fs.renameSync(temporary, generationFile)
    FileCache.cleanCache()
  }
  MemoryCache.cleanCache()
  inflightMap.clear()
  return { stores: getCacheChain().map(store => store.name), generation: next }
}
const BUILD_LOCK_TIMEOUT_MS = 120000
const BUILD_LOCK_MAX_WAIT_MS = 600000

/** 与 dev.config 中 ENABLE_CACHE 的多种写法兼容（boolean / JSON 字符串 / 'true'|'false'） */
function cacheReadsEnabled(force) {
  if (force) return true
  const v = BLOG.ENABLE_CACHE
  if (v === true) return true
  if (v === false) return false
  if (typeof v === 'string') {
    const s = v.trim()
    if (s === '' || s === 'false' || s === '0') return false
    if (s === 'true' || s === '1') return true
    try {
      return Boolean(JSON.parse(s))
    } catch {
      return true
    }
  }
  return Boolean(v)
}

function cacheLog(action, key, extra = '') {
  const type = getCacheType()
  console.log(
    `[Cache][${type.toUpperCase()}][pid:${process.pid}] ${action} key:${key} ${extra}`
  )
}

function isUsableCacheValue(data) {
  if (data == null || data.dataError) return false
  if (Array.isArray(data)) return data.length > 0
  return true
}

export async function getOrSetDataWithCache(
  key,
  getDataFunction,
  ...getDataArgs
) {
  return getOrSetDataWithCustomCache(key, null, getDataFunction, ...getDataArgs)
}

export async function getOrSetDataWithCustomCache(
  key,
  customCacheTime,
  getDataFunction,
  ...getDataArgs
) {
  const startedGeneration = await generation()
  // An unavailable shared generation must never expose stale local entries.
  // Serve fresh source data while Redis recovers.
  if (startedGeneration === null) return getDataFunction(...getDataArgs)
  const requestKey = `${startedGeneration}:${key}`
  const dataFromCache = await getDataFromCache(key)
  if (dataFromCache) {
    return dataFromCache
  }

  if (inflightMap.has(requestKey)) {
    return inflightMap.get(requestKey)
  }

  cacheLog('MISS', key, 'cache miss, fetch from source')

  if (isBuildPhase) {
    const promise = withFileLock(
      key,
      async () => {
        const doubleCheck = await getDataFromCache(key)
        if (doubleCheck) {
          cacheLog('DOUBLE-CHECK-HIT', key, 'lock holder found cached value')
          return doubleCheck
        }

        const data = await getDataFunction(...getDataArgs)
        if (
          data &&
          !data.dataError &&
          startedGeneration === (await generation())
        ) {
          await setDataToCache(key, data, customCacheTime, startedGeneration)
          cacheLog('SET', key, 'cache stored by lock holder')
        }

        return data || null
      },
      () => getDataFromCache(key),
      {
        timeout: BUILD_LOCK_TIMEOUT_MS,
        staleLockMs: BUILD_LOCK_TIMEOUT_MS,
        timeoutStrategy: 'wait',
        maxWaitMs: BUILD_LOCK_MAX_WAIT_MS
      }
    ).catch(err => {
      cacheLog('ERROR', key, err.message)
      throw err
    })

    inflightMap.set(requestKey, promise)
    promise.then(
      () => inflightMap.delete(requestKey),
      () => inflightMap.delete(requestKey)
    )
    return promise
  }

  const promise = getDataFunction(...getDataArgs)
    .then(async data => {
      if (
        data &&
        !data.dataError &&
        startedGeneration === (await generation())
      ) {
        await setDataToCache(key, data, customCacheTime, startedGeneration)
        cacheLog('SET', key, 'cache stored')
      }

      inflightMap.delete(requestKey)
      return data || null
    })
    .catch(err => {
      inflightMap.delete(requestKey)
      cacheLog('ERROR', key, err.message)
      throw err
    })

  inflightMap.set(requestKey, promise)
  return promise
}

export async function setDataToCache(key, data, customCacheTime, version) {
  if (!data || data.dataError) return

  key = await scopedKey(key, version)
  if (!key) return
  const chain = getCacheChain()

  for (const { name, api } of chain) {
    try {
      await api.setCache(key, data, customCacheTime)

      cacheStats.set++
      cacheStats.perStore[name] = cacheStats.perStore[name] || {
        hit: 0,
        set: 0
      }
      cacheStats.perStore[name].set++

      return
    } catch (e) {
      console.warn(`[Cache] ${name} set failed key:${key}`, e.message)
      cacheStats.error++
    }
  }

  console.warn(`[Cache] ALL set failed key:${key}`)
}

export async function getDataFromCache(key, force) {
  if (!cacheReadsEnabled(force)) return null

  cacheStats.total++
  key = await scopedKey(key)
  if (!key) return null
  const chain = getCacheChain()

  for (const { name, api } of chain) {
    try {
      const data = await api.getCache(key)

      if (isUsableCacheValue(data)) {
        cacheStats.hit++
        cacheStats.perStore[name] = cacheStats.perStore[name] || {
          hit: 0,
          set: 0
        }
        cacheStats.perStore[name].hit++
        return data
      }
    } catch (e) {
      cacheStats.error++
      console.warn(`[Cache] ${name} get failed key:${key}`, e.message)
    }
  }

  cacheStats.miss++
  return null
}

export async function delCacheData(key) {
  key = await scopedKey(key)
  if (!key) return null
  const chain = getCacheChain()

  for (const { name, api } of chain) {
    try {
      await api.delCache(key)
    } catch (e) {
      console.warn(`[Cache] ${name} del failed key:${key}`, e.message)
    }
  }
}

function getCacheType() {
  if (hasRedis) return 'redis'
  if (isBuildPhase) return 'file'
  return 'memory'
}

export function getApi() {
  const type = getCacheType()

  switch (type) {
    case 'redis':
      return RedisCache
    case 'file':
      return FileCache
    default:
      return MemoryCache
  }
}

function getCacheChain() {
  const chain = []

  if (hasRedis) {
    chain.push({ name: 'redis', api: RedisCache })
  }

  if (enableLocalCache) {
    chain.push({ name: 'file', api: FileCache })
  }

  chain.push({ name: 'memory', api: MemoryCache })

  return chain
}

function printCacheSummary() {
  const hitRate = cacheStats.total
    ? ((cacheStats.hit / cacheStats.total) * 100).toFixed(1)
    : 0

  console.log('\n[Cache Summary]')
  console.log(
    'Strategy:',
    getCacheChain()
      .map(c => c.name)
      .join(' -> ')
  )
  console.log(
    `Stats: HIT ${hitRate}% | MISS ${cacheStats.miss} | ERROR ${cacheStats.error} | total ${cacheStats.total}`
  )
  console.log('[Per Store]')

  Object.entries(cacheStats.perStore).forEach(([name, stat]) => {
    console.log(`  ${name}: hit=${stat.hit || 0}, set=${stat.set || 0}`)
  })

  console.log('----------------------------------\n')
}

if (typeof process !== 'undefined') {
  process.on('exit', printCacheSummary)
}
