import { createHash } from 'node:crypto'
import type { NextRequest } from 'next/server'

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

export async function resolveIdempotencyKey(
  request: Request | NextRequest,
  fallbackScope: string
): Promise<string> {
  const raw = request.headers.get('x-idempotency-key')
  if (raw && raw.trim().length > 0) {
    return raw.trim()
  }

  const digest = sha256(`${fallbackScope}:${request.method}:${request.url}`)

  return `${fallbackScope}:${digest}`
}
