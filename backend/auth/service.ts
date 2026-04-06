import { randomUUID } from 'node:crypto'
import { issueAccessToken, issueRefreshTokenJWT, sessionExpiry, verifyToken } from './jwt'
import {
  createRefreshSession,
  getSessionVersion,
  invalidateAllSessionsForUser,
  rotateRefreshToken,
  validateRefreshToken,
} from './session-store'
import type { AuthSession, DeviceMetadata } from './types'

export function createSession(userId: string, device: Omit<DeviceMetadata, 'lastSeenAt'>): AuthSession {
  const sessionId = randomUUID()
  const sessionVersion = getSessionVersion(userId)
  const refresh = createRefreshSession({
    userId,
    sessionId,
    device,
    refreshTtlSeconds: sessionExpiry.refreshTtlSeconds,
  })

  const claims = {
    sub: userId,
    sid: sessionId,
    deviceId: device.deviceId,
    sessionVersion,
  }

  return {
    userId,
    sessionId,
    refreshToken: refresh.refreshToken,
    accessToken: issueAccessToken(claims),
    expiresAt: new Date(Date.now() + sessionExpiry.accessTtlSeconds * 1000).toISOString(),
    refreshExpiresAt: new Date(Date.now() + sessionExpiry.refreshTtlSeconds * 1000).toISOString(),
    device: refresh.session.device,
  }
}

export function refreshSession(refreshToken: string) {
  const rotated = rotateRefreshToken(refreshToken, sessionExpiry.refreshTtlSeconds)
  if (!rotated) return null

  const sessionVersion = getSessionVersion(rotated.session.userId)
  const claims = {
    sub: rotated.session.userId,
    sid: rotated.session.sessionId,
    deviceId: rotated.session.device.deviceId,
    sessionVersion,
  }

  return {
    refreshToken: rotated.refreshToken,
    refreshTokenJwt: issueRefreshTokenJWT(claims),
    accessToken: issueAccessToken(claims),
    expiresAt: new Date(Date.now() + sessionExpiry.accessTtlSeconds * 1000).toISOString(),
    refreshExpiresAt: new Date(rotated.session.refreshExpiresAt).toISOString(),
    device: rotated.session.device,
  }
}

export function invalidateAllUserSessions(userId: string) {
  return invalidateAllSessionsForUser(userId)
}

export function validateAuthBearer(token: string): { userId: string; sessionId: string; deviceId: string } | null {
  const claims = verifyToken(token)
  if (!claims || claims.typ !== 'access') return null
  const expectedVersion = getSessionVersion(claims.sub)
  if (claims.sessionVersion !== expectedVersion) return null

  return {
    userId: claims.sub,
    sessionId: claims.sid,
    deviceId: claims.deviceId,
  }
}

export function validateRefreshSession(refreshToken: string) {
  return validateRefreshToken(refreshToken)
}
