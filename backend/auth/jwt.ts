import { createHmac } from 'node:crypto'
import type { SessionClaims } from './types'

const ACCESS_TTL_SECONDS = 60 * 15
const REFRESH_TTL_SECONDS = 60 * 60 * 24 * 30

function base64Url(input: string | Buffer) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

function getSecret() {
  return process.env.AUTH_JWT_SECRET ?? process.env.CLERK_SECRET_KEY ?? 'dev-insecure-secret'
}

function signParts(header: object, payload: object) {
  const encodedHeader = base64Url(JSON.stringify(header))
  const encodedPayload = base64Url(JSON.stringify(payload))
  const unsigned = `${encodedHeader}.${encodedPayload}`
  const signature = createHmac('sha256', getSecret()).update(unsigned).digest('base64url')
  return `${unsigned}.${signature}`
}

export function issueAccessToken(claims: Omit<SessionClaims, 'typ' | 'iat' | 'exp'>) {
  const now = Math.floor(Date.now() / 1000)
  return signParts({ alg: 'HS256', typ: 'JWT' }, { ...claims, typ: 'access', iat: now, exp: now + ACCESS_TTL_SECONDS })
}

export function issueRefreshTokenJWT(claims: Omit<SessionClaims, 'typ' | 'iat' | 'exp'>) {
  const now = Math.floor(Date.now() / 1000)
  return signParts({ alg: 'HS256', typ: 'JWT' }, { ...claims, typ: 'refresh', iat: now, exp: now + REFRESH_TTL_SECONDS })
}

export function verifyToken(token: string): SessionClaims | null {
  const [h, p, s] = token.split('.')
  if (!h || !p || !s) return null

  const unsigned = `${h}.${p}`
  const expected = createHmac('sha256', getSecret()).update(unsigned).digest('base64url')
  if (expected !== s) return null

  const payload = JSON.parse(Buffer.from(p, 'base64url').toString('utf8')) as SessionClaims
  if (payload.exp <= Math.floor(Date.now() / 1000)) return null

  return payload
}

export const sessionExpiry = {
  accessTtlSeconds: ACCESS_TTL_SECONDS,
  refreshTtlSeconds: REFRESH_TTL_SECONDS,
}
