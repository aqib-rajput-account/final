'use client'

import { useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'

type PostgresChangeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*'

interface UseRealtimeSubscriptionOptions<T extends Record<string, any>> {
  table: string
  schema?: string
  event?: PostgresChangeEvent
  filter?: string
  onInsert?: (payload: T) => void
  onUpdate?: (payload: { old: T; new: T }) => void
  onDelete?: (payload: T) => void
  onChange?: (payload: RealtimePostgresChangesPayload<T>) => void
  enabled?: boolean
}

export function useRealtimeSubscription<T extends Record<string, any> = any>({
  table,
  schema = 'public',
  event = '*',
  filter,
  onInsert,
  onUpdate,
  onDelete,
  onChange,
  enabled = true,
}: UseRealtimeSubscriptionOptions<T>) {
  const channelRef = useRef<RealtimeChannel | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (!enabled) return

    const channelConfig: any = {
      event,
      schema,
      table,
    }

    if (filter) {
      channelConfig.filter = filter
    }

    const channel = supabase
      .channel(`${table}-changes-${Date.now()}`)
      .on(
        'postgres_changes',
        channelConfig,
        (payload: RealtimePostgresChangesPayload<T>) => {
          if (onChange) {
            onChange(payload)
          }

          switch (payload.eventType) {
            case 'INSERT':
              if (onInsert) onInsert(payload.new as T)
              break
            case 'UPDATE':
              if (onUpdate) onUpdate({ old: payload.old as T, new: payload.new as T })
              break
            case 'DELETE':
              if (onDelete) onDelete(payload.old as T)
              break
          }
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [table, schema, event, filter, enabled, onInsert, onUpdate, onDelete, onChange, supabase])

  return channelRef.current
}

// Hook for real-time presence (who's online)
interface PresenceState {
  [key: string]: {
    user_id: string
    online_at: string
    user_info?: any
  }[]
}

interface UsePresenceOptions {
  channelName: string
  userId: string
  userInfo?: Record<string, any>
  onSync?: (state: PresenceState) => void
  onJoin?: (key: string, newPresences: any[]) => void
  onLeave?: (key: string, leftPresences: any[]) => void
  enabled?: boolean
}

export function usePresence({
  channelName,
  userId,
  userInfo = {},
  onSync,
  onJoin,
  onLeave,
  enabled = true,
}: UsePresenceOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (!enabled || !userId) return

    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: userId,
        },
      },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState() as PresenceState
        if (onSync) onSync(state)
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }: { key: string; newPresences: any[] }) => {
        if (onJoin) onJoin(key, newPresences)
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }: { key: string; leftPresences: any[] }) => {
        if (onLeave) onLeave(key, leftPresences)
      })
      .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: userId,
            online_at: new Date().toISOString(),
            ...userInfo,
          })
        }
      })

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [channelName, userId, enabled, onSync, onJoin, onLeave, supabase, userInfo])

  return channelRef.current
}

// Hook for real-time broadcast messages (ephemeral, no persistence)
interface UseBroadcastOptions {
  channelName: string
  eventName: string
  onMessage?: (payload: any) => void
  enabled?: boolean
}

export function useBroadcast({
  channelName,
  eventName,
  onMessage,
  enabled = true,
}: UseBroadcastOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null)
  const supabase = createClient()

  const send = useCallback(
    async (payload: any) => {
      if (channelRef.current) {
        await channelRef.current.send({
          type: 'broadcast',
          event: eventName,
          payload,
        })
      }
    },
    [eventName]
  )

  useEffect(() => {
    if (!enabled) return

    const channel = supabase
      .channel(channelName)
      .on('broadcast', { event: eventName }, ({ payload }: { payload: any }) => {
        if (onMessage) onMessage(payload)
      })
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [channelName, eventName, enabled, onMessage, supabase])

  return { send, channel: channelRef.current }
}

// Combined hook for feed with real-time updates
export function useRealtimeFeed(userId: string | undefined) {
  const onPostInsert = useRef<((post: any) => void) | null>(null)
  const onPostUpdate = useRef<((post: any) => void) | null>(null)
  const onPostDelete = useRef<((postId: string) => void) | null>(null)

  useRealtimeSubscription({
    table: 'posts',
    event: '*',
    enabled: !!userId,
    onInsert: (post) => {
      if (onPostInsert.current) onPostInsert.current(post)
    },
    onUpdate: ({ new: post }) => {
      if (onPostUpdate.current) onPostUpdate.current(post)
    },
    onDelete: (post) => {
      if (onPostDelete.current) onPostDelete.current(post.id)
    },
  })

  return {
    setOnPostInsert: (fn: (post: any) => void) => {
      onPostInsert.current = fn
    },
    setOnPostUpdate: (fn: (post: any) => void) => {
      onPostUpdate.current = fn
    },
    setOnPostDelete: (fn: (postId: string) => void) => {
      onPostDelete.current = fn
    },
  }
}

// Hook for real-time messages in a conversation
export function useRealtimeMessages(conversationId: string | undefined) {
  const onNewMessage = useRef<((message: any) => void) | null>(null)
  const onMessageUpdate = useRef<((message: any) => void) | null>(null)
  const onMessageDelete = useRef<((messageId: string) => void) | null>(null)

  useRealtimeSubscription({
    table: 'messages',
    event: '*',
    filter: conversationId ? `conversation_id=eq.${conversationId}` : undefined,
    enabled: !!conversationId,
    onInsert: (message) => {
      if (onNewMessage.current) onNewMessage.current(message)
    },
    onUpdate: ({ new: message }) => {
      if (onMessageUpdate.current) onMessageUpdate.current(message)
    },
    onDelete: (message) => {
      if (onMessageDelete.current) onMessageDelete.current(message.id)
    },
  })

  return {
    setOnNewMessage: (fn: (message: any) => void) => {
      onNewMessage.current = fn
    },
    setOnMessageUpdate: (fn: (message: any) => void) => {
      onMessageUpdate.current = fn
    },
    setOnMessageDelete: (fn: (messageId: string) => void) => {
      onMessageDelete.current = fn
    },
  }
}

// Hook for typing indicators
export function useTypingIndicator(conversationId: string, userId: string) {
  const { send, channel } = useBroadcast({
    channelName: `typing-${conversationId}`,
    eventName: 'typing',
    enabled: !!conversationId && !!userId,
  })

  const sendTyping = useCallback(
    (isTyping: boolean) => {
      send({ user_id: userId, is_typing: isTyping })
    },
    [send, userId]
  )

  return { sendTyping, channel }
}
