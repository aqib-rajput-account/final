import crypto from 'crypto'

const STREAM_API_KEY = process.env.NEXT_PUBLIC_STREAM_API_KEY || process.env.STREAM_API_KEY || ''
const STREAM_SECRET = process.env.STREAM_SECRET_KEY || ''

function base64UrlEncode(str: string) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

/** Creates a Stream Video user token signed with HMAC-SHA256 */
export function createStreamUserToken(userId: string, expiresAt?: number): string {
  const header = { alg: 'HS256', typ: 'JWT' }
  const iat = Math.floor(Date.now() / 1000)
  const payload: Record<string, unknown> = {
    user_id: userId,
    iat,
  }
  if (expiresAt) payload.exp = expiresAt

  const encodedHeader = base64UrlEncode(JSON.stringify(header))
  const encodedPayload = base64UrlEncode(JSON.stringify(payload))
  const signature = crypto
    .createHmac('sha256', STREAM_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')

  return `${encodedHeader}.${encodedPayload}.${signature}`
}

export function getStreamVideoConfig() {
  if (!STREAM_API_KEY || !STREAM_SECRET) {
    throw new Error(
      'Stream Video is not configured. Missing NEXT_PUBLIC_STREAM_API_KEY or STREAM_SECRET_KEY.'
    )
  }
  return { apiKey: STREAM_API_KEY, apiSecret: STREAM_SECRET }
}

/** Create a Stream Video call (audio_room type) */
export async function createStreamAudioRoom(callId: string, createdByUserId: string) {
  const { apiKey, apiSecret } = getStreamVideoConfig()
  const token = createStreamUserToken('server')

  const url = `https://video.stream-io-api.com/api/v2/call/audio_room/${callId}?api_key=${apiKey}`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'Stream-Auth-Type': 'jwt',
    },
    body: JSON.stringify({
      data: {
        created_by_id: createdByUserId,
        settings_override: {
          audio: { access_request_enabled: true, noise_cancellation: { mode: 'available' } },
          recording: { mode: 'available', quality: 'audio-only' },
        },
      },
    }),
    cache: 'no-store',
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err?.message || 'Failed to create Stream audio room')
  }

  return response.json()
}
