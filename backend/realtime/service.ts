import { createClient } from '@/lib/supabase/server'
import type { PublishRealtimeEventInput, RealtimeEventEnvelope } from './types'
import { REALTIME_EVENT_VERSION } from './types'
import { getMutedAndBlockedUserIds } from '@/backend/safety/service'

export function buildRealtimeChannels(input: { targetUserIds?: string[]; feedStreamId?: string }): string[] {
  const channels = new Set<string>()

  for (const userId of input.targetUserIds ?? []) {
    if (userId) channels.add(`user:${userId}`)
  }

  if (input.feedStreamId) {
    channels.add(`feed:${input.feedStreamId}`)
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
  const supabase = await createClient()
  const filteredTargetUserIds = await filterTargetUserIdsForActor(input.actorUserId, input.targetUserIds ?? [])
  const channels = buildRealtimeChannels({
    targetUserIds: [input.actorUserId, ...filteredTargetUserIds],
    feedStreamId: input.feedStreamId,
  })

  const version = input.version ?? REALTIME_EVENT_VERSION

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

  const { data, error } = await supabase.from('realtime_events').insert(insertPayload).select('*').single()

  if (error && error.code !== '23505') {
    throw error
  }

  const persisted =
    data ?? (await supabase.from('realtime_events').select('*').eq('idempotency_key', input.idempotencyKey).single()).data

  if (!persisted) {
    throw new Error('Failed to persist realtime event')
  }

  const envelope: RealtimeEventEnvelope<TPayload> = {
    eventId: persisted.event_id,
    version: persisted.version,
    eventType: persisted.event_type,
    entityType: persisted.entity_type,
    entityId: persisted.entity_id,
    actorUserId: persisted.actor_user_id,
    occurredAt: persisted.occurred_at,
    idempotencyKey: persisted.idempotency_key,
    channels: persisted.channels ?? [],
    payload: (persisted.payload ?? {}) as TPayload,
  }

  await broadcastToChannels(envelope)

  return envelope
}

export async function listRealtimeEventsSince(input: {
  userId: string
  lastSeenEventId?: number
  feedStreamId?: string
  limit?: number
}): Promise<RealtimeEventEnvelope[]> {
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
    throw error
  }

  const hiddenUserIds = await getMutedAndBlockedUserIds(supabase, input.userId)

  return (data ?? [])
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
}
