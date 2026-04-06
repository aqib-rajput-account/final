import { randomUUID } from 'crypto'

type MetricType = 'counter' | 'histogram' | 'gauge'

type MetricTags = Record<string, string | number | boolean | null | undefined>

interface MetricRecord {
  name: string
  type: MetricType
  value: number
  tags?: MetricTags
  timestamp: string
}

const metricsBuffer: MetricRecord[] = []

function pushMetric(record: MetricRecord) {
  metricsBuffer.push(record)
  if (metricsBuffer.length > 2000) {
    metricsBuffer.splice(0, metricsBuffer.length - 2000)
  }

  console.info(
    JSON.stringify({
      level: 'info',
      kind: 'metric',
      ...record,
    })
  )
}

export function observeCounter(name: string, value = 1, tags?: MetricTags) {
  pushMetric({
    name,
    type: 'counter',
    value,
    tags,
    timestamp: new Date().toISOString(),
  })
}

export function observeHistogram(name: string, value: number, tags?: MetricTags) {
  pushMetric({
    name,
    type: 'histogram',
    value,
    tags,
    timestamp: new Date().toISOString(),
  })
}

export function observeGauge(name: string, value: number, tags?: MetricTags) {
  pushMetric({
    name,
    type: 'gauge',
    value,
    tags,
    timestamp: new Date().toISOString(),
  })
}

export function getMetricsSnapshot(limit = 250): MetricRecord[] {
  return metricsBuffer.slice(-Math.max(1, limit))
}

export function createTraceId(): string {
  return randomUUID()
}

export function getTraceIdFromRequest(request: Request): string {
  const incoming = request.headers.get('x-trace-id')
  return incoming?.trim() || createTraceId()
}

export function logWithTrace(input: {
  level?: 'info' | 'warn' | 'error'
  message: string
  traceId: string
  tags?: MetricTags
  error?: unknown
}) {
  const base = {
    level: input.level ?? 'info',
    kind: 'log',
    message: input.message,
    traceId: input.traceId,
    tags: input.tags,
    timestamp: new Date().toISOString(),
  }

  if (input.error instanceof Error) {
    console[input.level ?? 'info'](
      JSON.stringify({
        ...base,
        error: {
          name: input.error.name,
          message: input.error.message,
          stack: input.error.stack,
        },
      })
    )
    return
  }

  if (input.error) {
    console[input.level ?? 'info'](JSON.stringify({ ...base, error: String(input.error) }))
    return
  }

  console[input.level ?? 'info'](JSON.stringify(base))
}

export function withServerTiming(startedAt = Date.now()) {
  return {
    durationMs: Date.now() - startedAt,
    startedAt,
  }
}
