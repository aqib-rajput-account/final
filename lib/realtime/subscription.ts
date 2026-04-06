'use client'

import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel, REALTIME_SUBSCRIBE_STATES } from '@supabase/supabase-js'
import type { RealtimeEventEnvelope } from '@/backend/realtime/types'
import {
  createClientTraceId,
  logClientTrace,
  observeClientMetric,
  trackClientWebsocketDisconnectSpike,
} from '@/lib/infrastructure/web-observability'

interface RealtimeGatewayOptions {
  feedStreamId?: string
  lastSeenEventId?: number
  onEvent?: (event: RealtimeEventEnvelope) => void
  onError?: (error: Error) => void
}

export class RealtimeGatewayClient {
  private readonly supabase = createClient()
  private channels: RealtimeChannel[] = []
  private dedupe = new Set<string>()
  private latestVersions = new Map<string, number>()
  private lastSeenEventId: number
  private reconnectAttempts = 0
  private traceId: string
  private readonly options: RealtimeGatewayOptions

  constructor(options: RealtimeGatewayOptions = {}) {
    this.options = options
    this.lastSeenEventId = options.lastSeenEventId ?? 0
    this.traceId = createClientTraceId()
  }

  async connect(): Promise<void> {
    const startedAt = Date.now()
    const connection = await fetch('/api/realtime/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feedStreamId: this.options.feedStreamId }),
    })

    if (!connection.ok) {
      throw new Error('Unable to authenticate realtime connection')
    }

    const connectionInfo = (await connection.json()) as { channels: string[] }
    const serverTraceId = connection.headers.get('x-trace-id')
    if (serverTraceId) {
      this.traceId = serverTraceId
    }

    for (const topic of connectionInfo.channels) {
      const channel = this.supabase
        .channel(`rt:${topic}`)
        .on('broadcast', { event: 'event' }, ({ payload }: { payload: RealtimeEventEnvelope }) => {
          this.handleIncomingEvent(payload)
        })
        .subscribe((status: `${REALTIME_SUBSCRIBE_STATES}`) => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            observeClientMetric('realtime.websocket.disconnects.total', 1, { topic, status })
            trackClientWebsocketDisconnectSpike({ traceId: this.traceId, channel: topic })
            this.handleReconnect().catch((error) => {
              this.options.onError?.(error instanceof Error ? error : new Error('Reconnect failed'))
            })
          }
        })

      this.channels.push(channel)
    }

    await this.catchUp()
    observeClientMetric('realtime.connect.latency_ms', Date.now() - startedAt, {
      channelCount: connectionInfo.channels.length,
    })
  }

  async disconnect(): Promise<void> {
    await Promise.all(this.channels.map((channel) => this.supabase.removeChannel(channel)))
    this.channels = []
  }

  private async handleReconnect(): Promise<void> {
    this.reconnectAttempts += 1
    observeClientMetric('realtime.websocket.reconnects.total', 1, { attempt: this.reconnectAttempts })
    const retryDelayMs = Math.min(2000 * this.reconnectAttempts, 15000)
    await new Promise((resolve) => setTimeout(resolve, retryDelayMs))

    await this.disconnect()
    await this.connect()
    this.reconnectAttempts = 0
  }

  async catchUp(): Promise<void> {
    const params = new URLSearchParams({
      lastSeenEventId: String(this.lastSeenEventId),
      limit: '500',
    })

    if (this.options.feedStreamId) {
      params.set('feedStreamId', this.options.feedStreamId)
    }

    const response = await fetch(`/api/realtime/events?${params.toString()}`, {
      method: 'GET',
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new Error('Failed to catch up realtime events')
    }

    const result = (await response.json()) as { events: RealtimeEventEnvelope[] }
    for (const event of result.events) {
      this.handleIncomingEvent(event)
    }
  }

  private handleIncomingEvent(event: RealtimeEventEnvelope): void {
    const entityVersionKey = `${event.entityType}:${event.entityId}`
    const previousVersion = this.latestVersions.get(entityVersionKey) ?? 0

    if (this.dedupe.has(event.idempotencyKey)) return
    if (event.version < previousVersion) return

    this.dedupe.add(event.idempotencyKey)
    this.latestVersions.set(entityVersionKey, event.version)
    this.lastSeenEventId = Math.max(this.lastSeenEventId, event.eventId)
    const publishToRenderDelay = Math.max(0, Date.now() - Date.parse(event.occurredAt))
    observeClientMetric('realtime.event.publish_to_render_delay_ms', publishToRenderDelay, {
      eventType: event.eventType,
      entityType: event.entityType,
    })
    logClientTrace({
      traceId: String((event.payload as Record<string, unknown>)?.traceId ?? this.traceId),
      message: 'Realtime event rendered',
      tags: {
        eventType: event.eventType,
        entityType: event.entityType,
        entityId: event.entityId,
        publishToRenderDelayMs: publishToRenderDelay,
      },
    })

    if (this.dedupe.size > 5000) {
      const keys = [...this.dedupe]
      this.dedupe = new Set(keys.slice(keys.length - 2500))
    }

    this.options.onEvent?.(event)
  }
}
