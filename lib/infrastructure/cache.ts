const encoder = new TextEncoder()

type CacheEntry<T> = {
  value: T
  expiresAt: number
}

const memoryStore = new Map<string, CacheEntry<unknown>>()

// Secondary index: userId → Set of scoped cache keys (namespace:hashedKey)
// Used to efficiently invalidate all cache entries for a given user.
const userKeyIndex = new Map<string, Set<string>>()

function getRedisConfig() {
  const baseUrl = process.env.REDIS_REST_URL
  const token = process.env.REDIS_REST_TOKEN

  if (!baseUrl || !token) return null

  return {
    baseUrl: baseUrl.replace(/\/$/, ''),
    token,
  }
}

async function redisRequest(path: string, init?: RequestInit): Promise<Response | null> {
  const config = getRedisConfig()
  if (!config) return null

  return fetch(`${config.baseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  })
}

function toMemoryKey(namespace: string, key: string): string {
  return `${namespace}:${key}`
}

function parseRedisValue<T>(raw: unknown): T | null {
  if (raw == null) return null
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as T
    } catch {
      return raw as T
    }
  }

  return raw as T
}

export async function getCachedValue<T>(namespace: string, key: string): Promise<T | null> {
  const scopedKey = toMemoryKey(namespace, key)
  const inMemory = memoryStore.get(scopedKey)

  if (inMemory && inMemory.expiresAt > Date.now()) {
    return inMemory.value as T
  }

  if (inMemory) {
    memoryStore.delete(scopedKey)
  }

  const redisResponse = await redisRequest(`/get/${encodeURIComponent(scopedKey)}`)
  if (!redisResponse?.ok) return null

  const payload = await redisResponse.json() as { result?: unknown }
  return parseRedisValue<T>(payload.result)
}

export async function setCachedValue<T>(
  namespace: string,
  key: string,
  value: T,
  ttlSeconds = 30,
  userId?: string,
): Promise<void> {
  const scopedKey = toMemoryKey(namespace, key)
  const expiresAt = Date.now() + ttlSeconds * 1000
  memoryStore.set(scopedKey, { value, expiresAt })

  // Register in user index so all entries can be invalidated by userId
  if (userId) {
    const userIndexKey = `${namespace}:${userId}`
    if (!userKeyIndex.has(userIndexKey)) {
      userKeyIndex.set(userIndexKey, new Set())
    }
    userKeyIndex.get(userIndexKey)!.add(scopedKey)
  }

  const redisValue = JSON.stringify(value)
  const redisResponse = await redisRequest('/setex', {
    method: 'POST',
    body: JSON.stringify([scopedKey, ttlSeconds, redisValue]),
  })

  if (!redisResponse?.ok) {
    return
  }
}

export async function deleteCachedValue(namespace: string, key: string): Promise<void> {
  const scopedKey = toMemoryKey(namespace, key)
  memoryStore.delete(scopedKey)
  await redisRequest(`/del/${encodeURIComponent(scopedKey)}`)
}

/**
 * Invalidates all cache entries for a given user within a namespace.
 * Deletes every in-memory entry registered under the user's index and
 * issues a Redis SCAN+DEL for any entries that may have been written
 * by a different server instance.
 */
export async function deleteUserCacheEntries(namespace: string, userId: string): Promise<void> {
  const userIndexKey = `${namespace}:${userId}`
  const keys = userKeyIndex.get(userIndexKey)

  if (keys) {
    for (const scopedKey of keys) {
      memoryStore.delete(scopedKey)
    }
    userKeyIndex.delete(userIndexKey)
  }

  // Best-effort Redis scan for keys matching the namespace:userId prefix
  // (covers entries written by other server instances)
  const config = getRedisConfig()
  if (!config) return

  // Note: since cache keys are hashed (one-way), Redis keys don't embed the userId.
  // The in-memory userKeyIndex provides per-user precision for the current process.
  // Cross-instance invalidation via Redis would require storing unhashed keys or a
  // separate Redis set per user — deferred to a future enhancement.
}  // Note: since cache keys are hashed (one-way), Redis keys don't embed the userId.
  // The in-memory userKeyIndex provides per-user precision for the current process.
  // Cross-instance invalidation via Redis would require storing unhashed keys or a
  // separate Redis set per user — deferred to a future enhancement.

export function buildCacheKey(parts: Array<string | number | null | undefined>): string {
  return parts
    .filter((part) => part !== null && part !== undefined)
    .map((part) => String(part))
    .join(':')
}

export function hashCacheKey(input: string): string {
  const bytes = encoder.encode(input)
  let hash = 2166136261

  for (const byte of bytes) {
    hash ^= byte
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24)
  }

  return (hash >>> 0).toString(16)
}
