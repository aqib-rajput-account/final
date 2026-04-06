import { getCachedValue, setCachedValue } from '@/lib/infrastructure/cache'

type RateLimitState = {
  count: number
  resetAt: number
}

export async function enforceRateLimit(input: {
  namespace: string
  identifier: string
  windowSeconds: number
  maxRequests: number
}) {
  const now = Date.now()
  const key = `${input.identifier}:${Math.floor(now / (input.windowSeconds * 1000))}`

  const existing =
    (await getCachedValue<RateLimitState>(`ratelimit:${input.namespace}`, key)) ??
    ({
      count: 0,
      resetAt: now + input.windowSeconds * 1000,
    } satisfies RateLimitState)

  const nextCount = existing.count + 1
  const allowed = nextCount <= input.maxRequests

  await setCachedValue(
    `ratelimit:${input.namespace}`,
    key,
    {
      count: nextCount,
      resetAt: existing.resetAt,
    },
    Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
  )

  return {
    allowed,
    limit: input.maxRequests,
    remaining: Math.max(0, input.maxRequests - nextCount),
    resetAt: existing.resetAt,
    retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
  }
}
