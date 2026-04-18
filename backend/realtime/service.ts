import { createClient } from '@/lib/supabase/server'
import type { PublishRealtimeEventInput, RealtimeEventEnvelope } from './types'
import { REALTIME_EVENT_VERSION } from './types'
import { getMutedAndBlockedUserIds } from '@/backend/safety/service'
import { logWithTrace, observeCounter, observeHistogram } from '@/lib/infrastructure/observability'

function isMissingRealtimeChannelsColumnError(error: unknown) {
  const message = error instanceof Error ? error.message : typeof error === 'object' && error !== null && 'message' in error ? String((error as { message?: unknown }).message ?? '') : ''
  return message.toLowerCase().includes("could not find the 'channels' column of 'realtime_events'") || message.toLowerCase().includes('column "channels"')
}

export function buildRealtimeChannels(input: {
  targetUserIds?: string[]
  feedStreamId?: string
  feedStreamIds?: string[]
}): string[] {
  const channels = new Set<string>()

  for (const userId of input.targetUserIds ?? []) {
    if (userId) channels.add(`user:${userId}`)
  }

  const feedStreamIds = new Set<string>()
  if (input.feedStreamId) {
    feedStreamIds.add(input.feedStreamId)
  }
  for (const feedStreamId of input.feedStreamIds ?? []) {
    if (feedStreamId) {
      feedStreamIds.add(feedStreamId)
    }
  }

  for (const feedStreamId of feedStreamIds) {
    channels.add(`feed:${feedStreamId}`)
  }

  return [...channels]
}

async function filterTargetUserIdsForActor(actorUserId: string, targetUserIds: string[]) {
  const supabase = await createClient()
  const hiddenIds = await getMutedAndBlockedUserIds(supabase, actorUserId)
  return targetUserIds.filter((id) => id && !hiddenIds.has(id))
}

async function broadcastToChannels(envelope: RealtimeEventEnvelope): Promise<void> {
  const supabase = await createClient()

  await Promise.all(
    envelope.channels.map(async (channelName) => {
      const channel = supabase.channel(`rt:${channelName}`)
      try {
        await channel.send({
          type: 'broadcast',
          event: 'event',
          payload: envelope,
        })
      } finally {
        await supabase.removeChannel(channel)
      }
    })
  )
}

export async function publishRealtimeEvent<TPayload extends Record<string, unknown>>(
  input: PublishRealtimeEventInput<TPayload>
): Promise<RealtimeEventEnvelope<TPayload>> {
  const startedAt = Date.now()
  const filteredTargetUserIds = await filterTargetUserIdsForActor(input.actorUserId, input.targetUserIds ?? [])
  const channels = buildRealtimeChannels({
    targetUserIds: [input.actorUserId, ...filteredTargetUserIds],
    feedStreamId: input.feedStreamId,
    feedStreamIds: input.feedStreamIds,
  })

  const version = input.version ?? REALTIME_EVENT_VERSION
  const traceId =
    (typeof input.payload?.traceId === 'string' && input.payload.traceId) ||
    `realtime:${input.idempotencyKey}`
  const occurredAt = new Date().toISOString()
  const fallbackEnvelope: RealtimeEventEnvelope<TPayload> = {
    eventId: Date.now(),
    version,
    eventType: input.eventType,
    entityType: input.entityType,
    entityId: input.entityId,
    actorUserId: input.actorUserId,
    occurredAt,
    idempotencyKey: input.idempotencyKey,
    channels,
    payload: input.payload,
  }

  const insertPayload = {
    event_type: input.eventType,
    entity_type: input.entityType,
    entity_id: input.entityId,
    actor_user_id: input.actorUserId,
    payload: input.payload,
    idempotency_key: input.idempotencyKey,
    version,
    channels,
  }

  let envelope = fallbackEnvelope
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from('realtime_events').insert(insertPayload).select('*').single()

    if (error && error.code !== '23505') {
      throw error
    }

    const persisted =
      data ?? (await supabase.from('realtime_events').select('*').eq('idempotency_key', input.idempotencyKey).single()).data

    if (!persisted) {
      throw new Error('Failed to persist realtime event')
    }

    envelope = {
      eventId: persisted.event_id,
      version: persisted.version,
      eventType: persisted.event_type,
      entityType: persisted.entity_type,
      entityId: persisted.entity_id,
      actorUserId: persisted.actor_user_id,
      occurredAt: persisted.occurred_at,
      idempotencyKey: persisted.idempotency_key,
      channels: persisted.channels ?? channels,
      payload: (persisted.payload ?? {}) as TPayload,
    }
  } catch (error) {
    if (!isMissingRealtimeChannelsColumnError(error)) {
      throw error
    }

    logWithTrace({
      level: 'warn',
      traceId,
      message: 'Realtime event persistence skipped because realtime_events.channels is unavailable',
      error,
      tags: {
        eventType: input.eventType,
        entityType: input.entityType,
      },
    })
  }

  try {
    await broadcastToChannels(envelope)
  } catch (error) {
    logWithTrace({
      level: 'warn',
      traceId,
      message: 'Realtime broadcast failed after event publication',
      error,
      tags: {
        eventType: envelope.eventType,
        entityType: envelope.entityType,
      },
    })
  }

  observeCounter('realtime.events.published.total', 1, {
    eventType: envelope.eventType,
    entityType: envelope.entityType,
  })
  observeHistogram('realtime.events.publish_latency_ms', Date.now() - startedAt, {
    eventType: envelope.eventType,
  })
  logWithTrace({
    traceId,
    message: 'Realtime event published',
    tags: {
      eventType: envelope.eventType,
      entityType: envelope.entityType,
      entityId: envelope.entityId,
      channelCount: envelope.channels.length,
    },
  })

  return envelope
}

export async function listRealtimeEventsSince(input: {
  userId: string
  lastSeenEventId?: number
  feedStreamId?: string
  limit?: number
}): Promise<RealtimeEventEnvelope[]> {
  const startedAt = Date.now()
  const supabase = await createClient()
  const lastSeenEventId = input.lastSeenEventId ?? 0
  const limit = Math.max(1, Math.min(input.limit ?? 200, 1000))

  const requiredChannels = [`user:${input.userId}`]
  if (input.feedStreamId) {
    requiredChannels.push(`feed:${input.feedStreamId}`)
  }

  let query = supabase
    .from('realtime_events')
    .select('*')
    .gt('event_id', lastSeenEventId)
    .order('event_id', { ascending: true })
    .limit(limit)

  if (requiredChannels.length === 1) {
    query = query.contains('channels', [requiredChannels[0]])
  } else {
    query = query.or(requiredChannels.map((channel) => `channels.cs.{${channel}}`).join(','))
  }

  const { data, error } = await query

  if (error) {
    if (isMissingRealtimeChannelsColumnError(error)) {
      logWithTrace({
        level: 'warn',
        traceId: `realtime:catchup:${input.userId}`,
        message: 'Realtime catch-up skipped because realtime_events.channels is unavailable',
        error,
      })
      return []
    }

    throw error
  }

  const hiddenUserIds = await getMutedAndBlockedUserIds(supabase, input.userId)

  const events = (data ?? [])
    .filter((event) => {
      if (hiddenUserIds.has(event.actor_user_id)) return false

      const payloadAuthorId = event.payload?.authorId
      if (typeof payloadAuthorId === 'string' && hiddenUserIds.has(payloadAuthorId)) {
        return false
      }

      return true
    })
    .map((event) => ({
      eventId: event.event_id,
      version: event.version,
      eventType: event.event_type,
      entityType: event.entity_type,
      entityId: event.entity_id,
      actorUserId: event.actor_user_id,
      occurredAt: event.occurred_at,
      idempotencyKey: event.idempotency_key,
      channels: event.channels ?? [],
      payload: (event.payload ?? {}) as Record<string, unknown>,
    }))

  observeHistogram('realtime.events.read_latency_ms', Date.now() - startedAt, {
    hasFeedStream: Boolean(input.feedStreamId),
  })
  observeCounter('realtime.events.read.total', events.length)
  return events
}
