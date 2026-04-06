const encoder = new TextEncoder()

type CacheEntry<T> = {
  value: T
  expiresAt: number
}

const memoryStore = new Map<string, CacheEntry<unknown>>()

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
): Promise<void> {
  const scopedKey = toMemoryKey(namespace, key)
  const expiresAt = Date.now() + ttlSeconds * 1000
  memoryStore.set(scopedKey, { value, expiresAt })

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
