import { randomUUID } from 'node:crypto'
import type { DeviceMetadata } from './types'

interface StoredSession {
  userId: string
  sessionId: string
  device: DeviceMetadata
  refreshExpiresAt: number
  revokedAt?: number
}

const refreshTokenStore = new Map<string, StoredSession>()
const userSessionVersion = new Map<string, number>()

export function getSessionVersion(userId: string): number {
  return userSessionVersion.get(userId) ?? 1
}

export function invalidateAllSessionsForUser(userId: string): number {
  const next = getSessionVersion(userId) + 1
  userSessionVersion.set(userId, next)

  for (const [token, session] of refreshTokenStore.entries()) {
    if (session.userId === userId) {
      refreshTokenStore.delete(token)
    }
  }

  return next
}

export function createRefreshSession(input: {
  userId: string
  sessionId: string
  device: Omit<DeviceMetadata, 'lastSeenAt'>
  refreshTtlSeconds: number
}) {
  const now = Date.now()
  const refreshToken = randomUUID()
  const session: StoredSession = {
    userId: input.userId,
    sessionId: input.sessionId,
    refreshExpiresAt: now + input.refreshTtlSeconds * 1000,
    device: {
      ...input.device,
      lastSeenAt: new Date(now).toISOString(),
    },
  }

  refreshTokenStore.set(refreshToken, session)
  return { refreshToken, session }
}

export function validateRefreshToken(refreshToken: string) {
  const now = Date.now()
  const session = refreshTokenStore.get(refreshToken)
  if (!session) return null
  if (session.revokedAt || session.refreshExpiresAt <= now) {
    refreshTokenStore.delete(refreshToken)
    return null
  }

  session.device.lastSeenAt = new Date(now).toISOString()
  return session
}

export function rotateRefreshToken(refreshToken: string, refreshTtlSeconds: number) {
  const existing = validateRefreshToken(refreshToken)
  if (!existing) return null

  refreshTokenStore.delete(refreshToken)
  return createRefreshSession({
    userId: existing.userId,
    sessionId: existing.sessionId,
    device: {
      deviceId: existing.device.deviceId,
      appVersion: existing.device.appVersion,
      ipAddress: existing.device.ipAddress,
      platform: existing.device.platform,
      userAgent: existing.device.userAgent,
    },
    refreshTtlSeconds,
  })
}
