'use client'

import { useEffect, useRef } from 'react'
import { RealtimeGatewayClient } from '@/lib/realtime/subscription'
import type { RealtimeEventEnvelope } from '@/backend/realtime/types'

export function useRealtimeGateway(options: {
  enabled?: boolean
  feedStreamId?: string
  lastSeenEventId?: number
  onEvent?: (event: RealtimeEventEnvelope) => void
  onError?: (error: Error) => void
}) {
  // Keep callbacks in refs so changing them never triggers a reconnect
  const onEventRef = useRef(options.onEvent)
  const onErrorRef = useRef(options.onError)
  useEffect(() => { onEventRef.current = options.onEvent })
  useEffect(() => { onErrorRef.current = options.onError })

  useEffect(() => {
    if (!options.enabled) return

    const client = new RealtimeGatewayClient({
      feedStreamId: options.feedStreamId,
      lastSeenEventId: options.lastSeenEventId,
      onEvent: (e) => onEventRef.current?.(e),
      onError: (e) => onErrorRef.current?.(e),
    })

    client.connect().catch((error) => {
      onErrorRef.current?.(error instanceof Error ? error : new Error('Failed to connect realtime gateway'))
    })

    return () => {
      client.disconnect().catch(() => undefined)
    }
    // Only reconnect when enabled state or stream identity changes — never on callback changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.enabled, options.feedStreamId, options.lastSeenEventId])
}
