'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface HandRaiseEvent {
  userId: string
  userName: string | null
  avatarUrl: string | null
  action: 'raise' | 'lower'
  sentAt: string
}

export interface ReactionEvent {
  id: string
  userId: string
  emoji: string
  sentAt: string
}

interface UseAudioRoomOptions {
  roomId: string
  userId: string
  userName?: string | null
  avatarUrl?: string | null
  enabled?: boolean
}

/**
 * Manages room-level signaling built on Supabase Realtime:
 * - Raised hands broadcast
 * - Listener count presence
 * - Chat messages (text alongside audio)
 */
export function useAudioRoom({
  roomId,
  userId,
  userName,
  avatarUrl,
  enabled = true,
}: UseAudioRoomOptions) {
  const supabase = createClient()
  const channelRef = useRef<RealtimeChannel | null>(null)
  const [raisedHands, setRaisedHands] = useState<HandRaiseEvent[]>([])
  const [chatMessages, setChatMessages] = useState<
    { id: string; userId: string; userName: string | null; text: string; sentAt: string }[]
  >([])
  const [reactions, setReactions] = useState<ReactionEvent[]>([])
  const [listenerCount, setListenerCount] = useState(0)

  // Track listener join in DB (non-blocking)
  useEffect(() => {
    if (!enabled || !roomId || !userId) return
    const supabaseInner = createClient()

    supabaseInner
      .from('audio_room_participants')
      .upsert({ room_id: roomId, user_id: userId, user_name: userName ?? null, avatar_url: avatarUrl ?? null, role: 'listener' })
      .then(() => {
        supabaseInner.rpc('increment_audio_room_listener', { target_room_id: roomId }).then(() => {})
      })

    return () => {
      supabaseInner
        .from('audio_room_participants')
        .update({ left_at: new Date().toISOString() })
        .eq('room_id', roomId)
        .eq('user_id', userId)
        .then(() => {
          supabaseInner.rpc('decrement_audio_room_listener', { target_room_id: roomId }).then(() => {})
        })
    }
  }, [enabled, roomId, userId, userName, avatarUrl])

  // Realtime channel for hand-raise + chat
  useEffect(() => {
    if (!enabled || !roomId || !userId) return

    const channel = supabase
      .channel(`audio-room-${roomId}`)
      .on('broadcast', { event: 'hand_raise' }, ({ payload }: { payload: HandRaiseEvent }) => {
        setRaisedHands((prev) => {
          if (payload.action === 'raise') {
            const already = prev.find((h) => h.userId === payload.userId)
            return already ? prev : [...prev, payload]
          }
          return prev.filter((h) => h.userId !== payload.userId)
        })
      })
      .on(
        'broadcast',
        { event: 'chat_message' },
        ({ payload }: { payload: { id: string; userId: string; userName: string | null; text: string; sentAt: string } }) => {
          setChatMessages((prev) => [...prev.slice(-199), payload])
        }
      )
      .on(
        'broadcast',
        { event: 'reaction' },
        ({ payload }: { payload: ReactionEvent }) => {
          setReactions((prev) => [...prev.slice(-49), payload])
        }
      )
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState() as Record<string, { userId: string }[]>
        setListenerCount(Object.values(state).flat().length)
      })
      .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ userId })
        }
      })

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
    }
  }, [enabled, roomId, supabase, userId])

  const raiseHand = useCallback(
    async (action: 'raise' | 'lower' = 'raise') => {
      if (!channelRef.current) return
      const payload: HandRaiseEvent = {
        userId,
        userName: userName ?? null,
        avatarUrl: avatarUrl ?? null,
        action,
        sentAt: new Date().toISOString(),
      }
      await channelRef.current.send({ type: 'broadcast', event: 'hand_raise', payload })
    },
    [avatarUrl, userId, userName]
  )

  const sendChatMessage = useCallback(
    async (text: string) => {
      if (!channelRef.current || !text.trim()) return
      const payload = {
        id: `${Date.now()}-${userId}`,
        userId,
        userName: userName ?? null,
        text: text.trim(),
        sentAt: new Date().toISOString(),
      }
      setChatMessages((prev) => [...prev.slice(-199), payload])
      await channelRef.current.send({ type: 'broadcast', event: 'chat_message', payload })
    },
    [userId, userName]
  )

  const sendReaction = useCallback(
    async (emoji: string) => {
      if (!channelRef.current) return
      const payload: ReactionEvent = {
        id: `${Date.now()}-${userId}-${Math.random().toString(36).substr(2, 5)}`,
        userId,
        emoji,
        sentAt: new Date().toISOString(),
      }
      setReactions((prev) => [...prev.slice(-49), payload])
      await channelRef.current.send({ type: 'broadcast', event: 'reaction', payload })
    },
    [userId]
  )

  const dismissHandRaise = useCallback((targetUserId: string) => {
    setRaisedHands((prev) => prev.filter((h) => h.userId !== targetUserId))
  }, [])

  return {
    raisedHands,
    chatMessages,
    reactions,
    listenerCount,
    raiseHand,
    sendChatMessage,
    sendReaction,
    dismissHandRaise,
  }
}
