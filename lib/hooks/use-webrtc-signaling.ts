'use client'

import { useEffect, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

type SignalType = 'offer' | 'answer' | 'ice-candidate' | 'hangup'

export interface WebRTCSignalPayload {
  from: string
  to: string
  conversationId?: string
  type: SignalType
  data?: Record<string, unknown>
  sentAt: string
}

interface UseWebRTCSignalingOptions {
  roomId: string
  userId: string
  onSignal: (payload: WebRTCSignalPayload) => void
  enabled?: boolean
}

/**
 * Uses Supabase Realtime broadcast channels as signaling transport.
 * Media streams are still peer-to-peer (WebRTC).
 */
export function useWebRTCSignaling({
  roomId,
  userId,
  onSignal,
  enabled = true,
}: UseWebRTCSignalingOptions) {
  const supabase = createClient()
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!enabled || !roomId || !userId) return

    const channel = supabase
      .channel(`webrtc-${roomId}`)
      .on('broadcast', { event: 'signal' }, ({ payload }: { payload: WebRTCSignalPayload }) => {
        if (!payload || payload.to !== userId) return
        onSignal(payload)
      })
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [enabled, onSignal, roomId, supabase, userId])

  const api = useMemo(
    () => ({
      async sendSignal(
        targetUserId: string,
        type: SignalType,
        data?: Record<string, unknown>,
        conversationId?: string
      ) {
        if (!channelRef.current) return
        const payload: WebRTCSignalPayload = {
          from: userId,
          to: targetUserId,
          type,
          data,
          conversationId,
          sentAt: new Date().toISOString(),
        }

        await channelRef.current.send({
          type: 'broadcast',
          event: 'signal',
          payload,
        })
      },
    }),
    [userId]
  )

  return api
}
