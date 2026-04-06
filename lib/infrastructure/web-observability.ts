'use client'

type Tags = Record<string, string | number | boolean | null | undefined>

export function createClientTraceId(): string {
  return crypto.randomUUID()
}

export function observeClientMetric(name: string, value: number, tags?: Tags) {
  console.info(
    JSON.stringify({
      level: 'info',
      kind: 'metric',
      source: 'web',
      name,
      value,
      tags,
      timestamp: new Date().toISOString(),
    })
  )
}

export function logClientTrace(input: {
  level?: 'info' | 'warn' | 'error'
  message: string
  traceId: string
  tags?: Tags
}) {
  console[input.level ?? 'info'](
    JSON.stringify({
      level: input.level ?? 'info',
      kind: 'log',
      source: 'web',
      message: input.message,
      traceId: input.traceId,
      tags: input.tags,
      timestamp: new Date().toISOString(),
    })
  )
}

let websocketDisconnectWindowStartedAt = Date.now()
let websocketDisconnectCount = 0

export function trackClientWebsocketDisconnectSpike(input: { traceId: string; channel?: string }) {
  const now = Date.now()
  if (now - websocketDisconnectWindowStartedAt > 5 * 60 * 1000) {
    websocketDisconnectWindowStartedAt = now
    websocketDisconnectCount = 0
  }

  websocketDisconnectCount += 1
  if (websocketDisconnectCount < 25) return

  logClientTrace({
    level: 'warn',
    message: 'Websocket disconnect spike detected (client)',
    traceId: input.traceId,
    tags: {
      channel: input.channel ?? 'unknown',
      disconnectsIn5m: websocketDisconnectCount,
      threshold: 25,
    },
  })
}
