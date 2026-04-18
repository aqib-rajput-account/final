'use client'

import { useCallback, useEffect, useRef } from 'react'
import { RealtimeGatewayClient } from '@/lib/realtime/subscription'
import type { RealtimeEventEnvelope } from '@/backend/realtime/types'

/**
 * Stable realtime gateway hook.
 * Uses refs for callbacks so the WebSocket connection is only established once
 * and never torn down or recreated due to callback identity changes.
 */
export function useRealtimeGateway(options: {
  enabled?: boolean
  feedStreamId?: string
  lastSeenEventId?: number
  onEvent?: (event: RealtimeEventEnvelope) => void
  onError?: (error: Error) => void
}) {
  const onEventRef = useRef(options.onEvent)
  const onErrorRef = useRef(options.onError)
  const clientRef = useRef<RealtimeGatewayClient | null>(null)

  useEffect(() => {
    onEventRef.current = options.onEvent
  }, [options.onEvent])

  useEffect(() => {
    onErrorRef.current = options.onError
  }, [options.onError])

  const stableOnEvent = useCallback((event: RealtimeEventEnvelope) => {
    onEventRef.current?.(event)
  }, [])

  const stableOnError = useCallback((error: Error) => {
    onErrorRef.current?.(error)
  }, [])

  useEffect(() => {
    if (!options.enabled) {
      return
    }

    const client = new RealtimeGatewayClient({
      feedStreamId: options.feedStreamId,
      lastSeenEventId: options.lastSeenEventId,
      onEvent: stableOnEvent,
      onError: stableOnError,
    })

    clientRef.current = client

    client.connect().catch((error) => {
      stableOnError(
        error instanceof Error ? error : new Error('Failed to connect realtime gateway')
      )
    })

    return () => {
      clientRef.current = null
      client.disconnect().catch(() => undefined)
    }
  }, [
    options.enabled,
    options.feedStreamId,
    options.lastSeenEventId,
    stableOnEvent,
    stableOnError,
  ])

  return clientRef.current
}
