export interface DeviceMetadata {
  deviceId: string
  userAgent?: string
  ipAddress?: string
  platform?: string
  appVersion?: string
  lastSeenAt: string
}

export interface SessionClaims {
  sub: string
  sid: string
  typ: 'access' | 'refresh'
  deviceId: string
  iat: number
  exp: number
  sessionVersion: number
}

export interface AuthSession {
  userId: string
  sessionId: string
  refreshToken: string
  accessToken: string
  expiresAt: string
  refreshExpiresAt: string
  device: DeviceMetadata
}
