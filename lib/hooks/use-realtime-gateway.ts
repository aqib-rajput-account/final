'use client'

import { useEffect, useMemo } from 'react'
import { RealtimeGatewayClient } from '@/lib/realtime/subscription'
import type { RealtimeEventEnvelope } from '@/backend/realtime/types'

export function useRealtimeGateway(options: {
  enabled?: boolean
  feedStreamId?: string
  lastSeenEventId?: number
  onEvent?: (event: RealtimeEventEnvelope) => void
  onError?: (error: Error) => void
}) {
  const client = useMemo(
    () =>
      new RealtimeGatewayClient({
        feedStreamId: options.feedStreamId,
        lastSeenEventId: options.lastSeenEventId,
        onEvent: options.onEvent,
        onError: options.onError,
      }),
    [options.feedStreamId, options.lastSeenEventId, options.onEvent, options.onError]
  )

  useEffect(() => {
    if (!options.enabled) return

    client.connect().catch((error) => {
      options.onError?.(error instanceof Error ? error : new Error('Failed to connect realtime gateway'))
    })

    return () => {
      client.disconnect().catch(() => undefined)
    }
  }, [client, options.enabled, options.onError])

  return client
}
