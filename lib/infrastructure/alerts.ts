import { logWithTrace, observeCounter } from './observability'

export const ALERT_THRESHOLDS = {
  timelineLagMs: 15_000,
  queueBacklog: 5_000,
  websocketDisconnectsPer5m: 25,
} as const

export function evaluateTimelineLagAlert(input: { lagMs: number; traceId: string; feedStreamId?: string }) {
  if (input.lagMs < ALERT_THRESHOLDS.timelineLagMs) return

  observeCounter('alerts.timeline_lag.triggered', 1, {
    feedStreamId: input.feedStreamId ?? 'unknown',
  })

  logWithTrace({
    level: 'warn',
    message: 'Timeline lag threshold exceeded',
    traceId: input.traceId,
    tags: {
      lagMs: input.lagMs,
      thresholdMs: ALERT_THRESHOLDS.timelineLagMs,
      feedStreamId: input.feedStreamId ?? 'unknown',
    },
  })
}

export function evaluateQueueBacklogAlert(input: { queue: string; depth: number; traceId: string }) {
  if (input.depth < ALERT_THRESHOLDS.queueBacklog) return

  observeCounter('alerts.queue_backlog.triggered', 1, {
    queue: input.queue,
  })

  logWithTrace({
    level: 'warn',
    message: 'Queue backlog threshold exceeded',
    traceId: input.traceId,
    tags: {
      queue: input.queue,
      depth: input.depth,
      threshold: ALERT_THRESHOLDS.queueBacklog,
    },
  })
}

let websocketDisconnectWindowStartedAt = Date.now()
let websocketDisconnectCount = 0

export function trackWebsocketDisconnectSpike(input: { traceId: string; channel?: string }) {
  const now = Date.now()
  if (now - websocketDisconnectWindowStartedAt > 5 * 60 * 1000) {
    websocketDisconnectWindowStartedAt = now
    websocketDisconnectCount = 0
  }

  websocketDisconnectCount += 1

  if (websocketDisconnectCount < ALERT_THRESHOLDS.websocketDisconnectsPer5m) return

  observeCounter('alerts.websocket_disconnect_spike.triggered', 1, {
    channel: input.channel ?? 'unknown',
  })

  logWithTrace({
    level: 'warn',
    message: 'Websocket disconnect spike detected',
    traceId: input.traceId,
    tags: {
      disconnectsIn5m: websocketDisconnectCount,
      threshold: ALERT_THRESHOLDS.websocketDisconnectsPer5m,
      channel: input.channel ?? 'unknown',
    },
  })
}
