export const REALTIME_EVENT_VERSION = 1

export type RealtimeEventType =
  | 'post.created'
  | 'post.updated'
  | 'post.deleted'
  | 'post.liked'
  | 'post.unliked'
  | 'comment.created'
  | 'comment.updated'
  | 'comment.deleted'
  | 'follow.created'
  | 'follow.deleted'

export interface RealtimeEventEnvelope<TPayload extends Record<string, unknown> = Record<string, unknown>> {
  eventId: number
  version: number
  eventType: RealtimeEventType
  entityType: 'post' | 'comment' | 'follow' | 'feed'
  entityId: string
  actorUserId: string
  occurredAt: string
  idempotencyKey: string
  channels: string[]
  payload: TPayload
}

export interface PublishRealtimeEventInput<TPayload extends Record<string, unknown>> {
  eventType: RealtimeEventType
  entityType: RealtimeEventEnvelope['entityType']
  entityId: string
  actorUserId: string
  payload: TPayload
  idempotencyKey: string
  version?: number
  targetUserIds?: string[]
  feedStreamId?: string
}
