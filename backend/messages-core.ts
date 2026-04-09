import { enqueueWork } from '@/lib/infrastructure/queue'
import { normalizeFeedAttachments, type FeedMediaAttachment, MAX_FEED_ATTACHMENTS } from '@/lib/feed/media'
import { canUsersInteract, enforceMultiScopeThrottle, writeAuditLog } from '@/backend/safety/service'
import type {
  ConversationFolder,
  ConversationInboxFilter,
  ConversationMembershipState,
  ConversationParticipantRole,
  ConversationType,
  MessageAttachmentKind,
  MessagingAttachment,
  MessagingConversation,
  MessagingConversationPage,
  MessagingMessage,
  MessagingParticipant,
  MessagingProfile,
  MessagingReactionSummary,
  MessagingReadReceipt,
  MessagingSearchResponse,
} from '@/lib/messages/types'

type SupabaseLike = {
  from: (table: string) => any
}

type ConversationRow = {
  id: string
  name: string | null
  type: string
  image_url: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

type ParticipantRow = {
  id: string
  conversation_id: string
  user_id: string
  role: string | null
  folder: string | null
  membership_state: string | null
  last_read_at: string | null
  last_read_message_id: string | null
  is_muted: boolean | null
  archived_at: string | null
  joined_at: string
}

type ProfileRow = {
  id: string
  full_name: string | null
  avatar_url: string | null
  role: string | null
  email?: string | null
  last_seen_at?: string | null
}

type MessageRow = {
  id: string
  conversation_id: string
  sender_id: string | null
  content: string | null
  message_type: string | null
  image_url: string | null
  file_url: string | null
  file_name: string | null
  reply_to_id: string | null
  is_edited: boolean | null
  is_deleted: boolean | null
  created_at: string
  updated_at: string
}

type MessageAttachmentRow = {
  id: string
  message_id: string
  kind: string
  url: string
  pathname: string | null
  mime_type: string | null
  name: string | null
  size: number | null
  sort_order: number | null
  created_at: string
}

type MessageReactionRow = {
  id: string
  message_id: string
  user_id: string
  emoji: string
  created_at: string
}

type MessageReadRow = {
  id: string
  message_id: string
  user_id: string
  read_at: string
}

const DEFAULT_CONVERSATION_LIMIT = 20
const MAX_CONVERSATION_LIMIT = 50
const DEFAULT_MESSAGE_LIMIT = 30
const MAX_MESSAGE_LIMIT = 50
const BROADCAST_ROLES = new Set(['imam', 'shura', 'admin', 'super_admin'])

export class MessagingError extends Error {
  status: number
  code: string

  constructor(message: string, status = 400, code = 'messaging_error') {
    super(message)
    this.name = 'MessagingError'
    this.status = status
    this.code = code
  }
}

function clampLimit(limit: number | undefined, fallback: number, max: number) {
  if (!Number.isFinite(limit) || !limit || limit <= 0) return fallback
  return Math.min(Math.floor(limit), max)
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))]
}

function assert(condition: unknown, message: string, status = 400, code?: string): asserts condition {
  if (!condition) {
    throw new MessagingError(message, status, code)
  }
}

function asConversationType(value: string | null | undefined): ConversationType {
  if (value === 'direct' || value === 'group' || value === 'broadcast') return value
  return 'direct'
}

function asFolder(value: string | null | undefined): ConversationFolder {
  if (value === 'requests' || value === 'archived') return value
  return 'primary'
}

function asMembershipState(value: string | null | undefined): ConversationMembershipState {
  if (value === 'requested' || value === 'left' || value === 'removed') return value
  return 'active'
}

function asParticipantRole(value: string | null | undefined): ConversationParticipantRole {
  return value === 'admin' ? 'admin' : 'member'
}

function asAttachmentKind(value: string | null | undefined): MessageAttachmentKind {
  if (value === 'image' || value === 'video') return value
  return 'file'
}

function asMessageType(value: string | null | undefined): MessagingMessage['message_type'] {
  if (value === 'image' || value === 'file' || value === 'system') return value
  return 'text'
}

function matchesCursor(timestamp: string, cursor: string | null | undefined) {
  return !cursor || Date.parse(timestamp) < Date.parse(cursor)
}

function normalizeSearchTerm(input: string | null | undefined) {
  return input?.trim().toLowerCase() ?? ''
}

function normalizeConversationName(
  conversation: Pick<ConversationRow, 'name' | 'type'>,
  participants: MessagingParticipant[],
  viewerUserId: string
) {
  if (conversation.name?.trim()) return conversation.name.trim()
  if (conversation.type === 'direct') {
    return participants.find((participant) => participant.user_id !== viewerUserId)?.profile?.full_name ?? 'Direct Message'
  }
  if (conversation.type === 'broadcast') return 'Broadcast'
  return 'Group Chat'
}

async function getViewerRole(supabase: SupabaseLike, userId: string) {
  const { data, error } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle()
  if (error) return 'member'
  return typeof data?.role === 'string' ? data.role : 'member'
}

async function getProfileMap(supabase: SupabaseLike, userIds: string[]) {
  const ids = uniqueStrings(userIds)
  if (ids.length === 0) {
    return new Map<string, MessagingProfile>()
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, role, email, last_seen_at')
    .in('id', ids)

  if (error) {
    throw new MessagingError('Failed to load profiles', 500, 'profile_load_failed')
  }

  const profiles = new Map<string, MessagingProfile>()
  for (const row of (data ?? []) as ProfileRow[]) {
    profiles.set(row.id, {
      id: row.id,
      full_name: row.full_name ?? null,
      avatar_url: row.avatar_url ?? null,
      role: row.role ?? null,
      email: row.email ?? null,
      last_seen_at: row.last_seen_at ?? null,
    })
  }
  return profiles
}

function mapParticipant(row: ParticipantRow, profiles: Map<string, MessagingProfile>): MessagingParticipant {
  return {
    id: row.id,
    conversation_id: row.conversation_id,
    user_id: row.user_id,
    role: asParticipantRole(row.role),
    folder: asFolder(row.folder),
    membership_state: asMembershipState(row.membership_state),
    last_read_at: row.last_read_at ?? null,
    last_read_message_id: row.last_read_message_id ?? null,
    is_muted: Boolean(row.is_muted),
    archived_at: row.archived_at ?? null,
    joined_at: row.joined_at,
    profile: profiles.get(row.user_id) ?? null,
  }
}

function mapAttachment(row: MessageAttachmentRow): MessagingAttachment {
  return {
    id: row.id,
    message_id: row.message_id,
    kind: asAttachmentKind(row.kind),
    url: row.url,
    pathname: row.pathname ?? null,
    mime_type: row.mime_type ?? null,
    name: row.name ?? null,
    size: row.size ?? null,
    sort_order: row.sort_order ?? 0,
    created_at: row.created_at,
  }
}

function legacyAttachments(row: MessageRow): MessagingAttachment[] {
  const attachments: MessagingAttachment[] = []
  if (row.image_url) {
    attachments.push({
      id: `legacy-image-${row.id}`,
      message_id: row.id,
      kind: 'image',
      url: row.image_url,
      pathname: null,
      mime_type: null,
      name: null,
      size: null,
      sort_order: 0,
      created_at: row.created_at,
    })
  }
  if (row.file_url) {
    attachments.push({
      id: `legacy-file-${row.id}`,
      message_id: row.id,
      kind: 'file',
      url: row.file_url,
      pathname: null,
      mime_type: null,
      name: row.file_name ?? null,
      size: null,
      sort_order: attachments.length,
      created_at: row.created_at,
    })
  }
  return attachments
}

function buildReactionSummaries(rows: MessageReactionRow[], viewerUserId: string) {
  const map = new Map<string, { emoji: string; count: number; user_ids: string[] }>()

  for (const row of rows) {
    const current = map.get(row.emoji) ?? { emoji: row.emoji, count: 0, user_ids: [] }
    current.count += 1
    current.user_ids.push(row.user_id)
    map.set(row.emoji, current)
  }

  return [...map.values()].map<MessagingReactionSummary>((reaction) => ({
    emoji: reaction.emoji,
    count: reaction.count,
    reacted: reaction.user_ids.includes(viewerUserId),
    user_ids: reaction.user_ids,
  }))
}

async function getParticipantRowsForConversation(supabase: SupabaseLike, conversationId: string) {
  const { data, error } = await supabase
    .from('conversation_participants')
    .select(
      'id, conversation_id, user_id, role, folder, membership_state, last_read_at, last_read_message_id, is_muted, archived_at, joined_at'
    )
    .eq('conversation_id', conversationId)
    .order('joined_at', { ascending: true })

  if (error) {
    throw new MessagingError('Failed to load participants', 500, 'participant_load_failed')
  }

  return (data ?? []) as ParticipantRow[]
}

async function hydrateMessages(supabase: SupabaseLike, viewerUserId: string, rows: MessageRow[]) {
  if (rows.length === 0) return [] as MessagingMessage[]

  const messageIds = rows.map((row) => row.id)
  const senderIds = uniqueStrings(rows.map((row) => row.sender_id))
  const replyIds = uniqueStrings(rows.map((row) => row.reply_to_id))

  const [attachmentResult, reactionResult, readResult, replyResult] = await Promise.all([
    supabase
      .from('message_attachments')
      .select('id, message_id, kind, url, pathname, mime_type, name, size, sort_order, created_at')
      .in('message_id', messageIds)
      .order('sort_order', { ascending: true }),
    supabase
      .from('message_reactions')
      .select('id, message_id, user_id, emoji, created_at')
      .in('message_id', messageIds),
    supabase.from('message_reads').select('id, message_id, user_id, read_at').in('message_id', messageIds),
    replyIds.length > 0
      ? supabase
          .from('messages')
          .select(
            'id, conversation_id, sender_id, content, message_type, image_url, file_url, file_name, reply_to_id, is_edited, is_deleted, created_at, updated_at'
          )
          .in('id', replyIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  if (attachmentResult.error || reactionResult.error || readResult.error || replyResult.error) {
    throw new MessagingError('Failed to load message metadata', 500, 'message_hydration_failed')
  }

  const replyRows = (replyResult.data ?? []) as MessageRow[]
  const profileMap = await getProfileMap(
    supabase,
    uniqueStrings([...senderIds, ...replyRows.map((row) => row.sender_id)])
  )

  const attachmentsByMessage = new Map<string, MessagingAttachment[]>()
  for (const row of (attachmentResult.data ?? []) as MessageAttachmentRow[]) {
    const current = attachmentsByMessage.get(row.message_id) ?? []
    current.push(mapAttachment(row))
    attachmentsByMessage.set(row.message_id, current)
  }

  const reactionsByMessage = new Map<string, MessageReactionRow[]>()
  for (const row of (reactionResult.data ?? []) as MessageReactionRow[]) {
    const current = reactionsByMessage.get(row.message_id) ?? []
    current.push(row)
    reactionsByMessage.set(row.message_id, current)
  }

  const readsByMessage = new Map<string, MessagingReadReceipt[]>()
  for (const row of (readResult.data ?? []) as MessageReadRow[]) {
    const current = readsByMessage.get(row.message_id) ?? []
    current.push({ user_id: row.user_id, read_at: row.read_at })
    readsByMessage.set(row.message_id, current)
  }

  const replyMap = new Map(
    replyRows.map((row) => [
      row.id,
      {
        id: row.id,
        content: row.content ?? null,
        sender: row.sender_id
          ? {
              id: row.sender_id,
              full_name: profileMap.get(row.sender_id)?.full_name ?? null,
            }
          : null,
      },
    ])
  )

  return rows.map<MessagingMessage>((row) => {
    const attachments = attachmentsByMessage.get(row.id) ?? legacyAttachments(row)
    return {
      id: row.id,
      conversation_id: row.conversation_id,
      sender_id: row.sender_id ?? null,
      content: row.content ?? null,
      message_type: asMessageType(row.message_type),
      image_url: row.image_url ?? null,
      file_url: row.file_url ?? null,
      file_name: row.file_name ?? null,
      reply_to_id: row.reply_to_id ?? null,
      is_edited: Boolean(row.is_edited),
      is_deleted: Boolean(row.is_deleted),
      created_at: row.created_at,
      updated_at: row.updated_at,
      sender: row.sender_id ? profileMap.get(row.sender_id) ?? null : null,
      reply_to: row.reply_to_id ? replyMap.get(row.reply_to_id) ?? null : null,
      attachments,
      reactions: buildReactionSummaries(reactionsByMessage.get(row.id) ?? [], viewerUserId),
      read_by: (readsByMessage.get(row.id) ?? []).sort((a, b) => Date.parse(a.read_at) - Date.parse(b.read_at)),
    }
  })
}

async function getUnreadCount(
  supabase: SupabaseLike,
  conversationId: string,
  viewerUserId: string,
  viewerParticipant: MessagingParticipant
) {
  let query = supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('conversation_id', conversationId)
    .neq('sender_id', viewerUserId)

  if (viewerParticipant.last_read_at) {
    query = query.gt('created_at', viewerParticipant.last_read_at)
  }

  const { count, error } = await query
  if (error) {
    throw new MessagingError('Failed to load unread count', 500, 'unread_count_failed')
  }
  return count ?? 0
}

function canSendInConversation(args: {
  conversation: ConversationRow
  viewerParticipant: MessagingParticipant
  participants: MessagingParticipant[]
  viewerRole: string
}) {
  const { conversation, viewerParticipant, participants, viewerRole } = args

  if (viewerParticipant.membership_state !== 'active') return false
  if (conversation.type === 'broadcast') {
    return BROADCAST_ROLES.has(viewerRole)
  }
  if (conversation.type === 'direct') {
    return participants.every((participant) => participant.membership_state === 'active')
  }
  return true
}

async function hydrateConversation(
  supabase: SupabaseLike,
  viewerUserId: string,
  conversation: ConversationRow,
  participantRows?: ParticipantRow[],
  options?: {
    profileMap?: Map<string, MessagingProfile>
    viewerRole?: string
  }
) {
  const rows = participantRows ?? (await getParticipantRowsForConversation(supabase, conversation.id))
  const profileMap = options?.profileMap ?? (await getProfileMap(supabase, rows.map((row) => row.user_id)))
  const participants = rows.map((row) => mapParticipant(row, profileMap))
  const viewerParticipant = participants.find((participant) => participant.user_id === viewerUserId)

  if (!viewerParticipant || viewerParticipant.membership_state === 'removed') {
    throw new MessagingError('Conversation not found', 404, 'conversation_not_found')
  }

  const [lastMessageResult, unreadCount, viewerRole] = await Promise.all([
    supabase
      .from('messages')
      .select(
        'id, conversation_id, sender_id, content, message_type, image_url, file_url, file_name, reply_to_id, is_edited, is_deleted, created_at, updated_at'
      )
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    getUnreadCount(supabase, conversation.id, viewerUserId, viewerParticipant),
    Promise.resolve(options?.viewerRole ?? null).then((role) => role ?? getViewerRole(supabase, viewerUserId)),
  ])

  if (lastMessageResult.error) {
    throw new MessagingError('Failed to load latest message', 500, 'latest_message_failed')
  }

  const lastMessageRows = lastMessageResult.data ? [lastMessageResult.data as MessageRow] : []
  const lastMessages = await hydrateMessages(supabase, viewerUserId, lastMessageRows)

  return {
    id: conversation.id,
    name: normalizeConversationName(conversation, participants, viewerUserId),
    type: asConversationType(conversation.type),
    image_url: conversation.image_url ?? null,
    created_by: conversation.created_by ?? null,
    created_at: conversation.created_at,
    updated_at: conversation.updated_at,
    viewer_participation: viewerParticipant,
    participants,
    last_message: lastMessages[0] ?? null,
    unread_count: unreadCount,
    can_send: canSendInConversation({ conversation, viewerParticipant, participants, viewerRole }),
  } satisfies MessagingConversation
}

async function getConversationRow(supabase: SupabaseLike, conversationId: string) {
  const { data, error } = await supabase
    .from('conversations')
    .select('id, name, type, image_url, created_by, created_at, updated_at')
    .eq('id', conversationId)
    .maybeSingle()

  if (error) {
    throw new MessagingError('Failed to load conversation', 500, 'conversation_load_failed')
  }

  assert(data, 'Conversation not found', 404, 'conversation_not_found')
  return data as ConversationRow
}

async function ensureConversationAccess(supabase: SupabaseLike, conversationId: string, userId: string) {
  const conversation = await getConversationRow(supabase, conversationId)
  const participantRows = await getParticipantRowsForConversation(supabase, conversationId)
  const profileMap = await getProfileMap(supabase, participantRows.map((row) => row.user_id))
  const participants = participantRows.map((row) => mapParticipant(row, profileMap))
  const viewerParticipant = participants.find((participant) => participant.user_id === userId)

  assert(
    viewerParticipant && viewerParticipant.membership_state !== 'removed',
    'Conversation access denied',
    403,
    'conversation_access_denied'
  )

  return {
    conversation,
    participantRows,
    participants,
    viewerParticipant,
    viewerRole: await getViewerRole(supabase, userId),
  }
}

async function ensureGroupAdminAccess(supabase: SupabaseLike, conversationId: string, userId: string) {
  const access = await ensureConversationAccess(supabase, conversationId, userId)
  assert(access.conversation.type === 'group', 'Only group conversations support this action', 400, 'group_only')
  assert(access.viewerParticipant.membership_state === 'active', 'Inactive members cannot manage this group', 403, 'inactive_member')
  assert(access.viewerParticipant.role === 'admin', 'Only group admins can manage this group', 403, 'group_admin_required')
  return access
}

function pickLegacyMessageType(attachments: FeedMediaAttachment[], text: string | null) {
  if (attachments.length === 0) return text ? 'text' : 'file'
  if (attachments[0].kind === 'image') return 'image'
  return 'file'
}

async function insertMessageRecord(args: {
  supabase: SupabaseLike
  conversationId: string
  senderId: string
  text: string | null
  attachments: FeedMediaAttachment[]
  replyToId?: string | null
}) {
  const messageType = pickLegacyMessageType(args.attachments, args.text)
  const primaryAttachment = args.attachments[0]

  const { data: message, error } = await args.supabase
    .from('messages')
    .insert({
      conversation_id: args.conversationId,
      sender_id: args.senderId,
      content: args.text,
      message_type: messageType,
      image_url: primaryAttachment?.kind === 'image' ? primaryAttachment.url : null,
      file_url: primaryAttachment?.kind === 'file' ? primaryAttachment.url : null,
      file_name: primaryAttachment?.kind === 'file' ? primaryAttachment.name ?? null : null,
      reply_to_id: args.replyToId ?? null,
    })
    .select(
      'id, conversation_id, sender_id, content, message_type, image_url, file_url, file_name, reply_to_id, is_edited, is_deleted, created_at, updated_at'
    )
    .single()

  if (error || !message) {
    throw new MessagingError('Failed to send message', 500, 'message_insert_failed')
  }

  if (args.attachments.length > 0) {
    const { error: attachmentError } = await args.supabase.from('message_attachments').insert(
      args.attachments.map((attachment, index) => ({
        message_id: message.id,
        kind: attachment.kind,
        url: attachment.url,
        pathname: attachment.pathname ?? null,
        mime_type: attachment.mimeType ?? null,
        name: attachment.name ?? null,
        size: attachment.size ?? null,
        sort_order: attachment.sortOrder ?? index,
      }))
    )

    if (attachmentError) {
      throw new MessagingError('Failed to persist attachments', 500, 'attachment_insert_failed')
    }
  }

  const now = new Date().toISOString()
  await Promise.all([
    args.supabase.from('conversations').update({ updated_at: now }).eq('id', args.conversationId),
    args.supabase
      .from('conversation_participants')
      .update({
        last_read_at: now,
        last_read_message_id: message.id,
      })
      .eq('conversation_id', args.conversationId)
      .eq('user_id', args.senderId),
  ])

  return message as MessageRow
}

async function findExistingDirectConversationId(supabase: SupabaseLike, actorUserId: string, otherUserId: string) {
  const { data: existingDirectParticipations, error } = await supabase
    .from('conversation_participants')
    .select('conversation_id, conversations!inner(type)')
    .eq('user_id', actorUserId)
    .eq('conversations.type', 'direct')

  if (error) {
    throw new MessagingError('Failed to check direct conversations', 500, 'direct_lookup_failed')
  }

  const conversationIds = (existingDirectParticipations ?? []).map((row: { conversation_id: string }) => row.conversation_id)
  if (conversationIds.length === 0) return null

  const { data: common, error: commonError } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', otherUserId)
    .in('conversation_id', conversationIds)
    .limit(1)

  if (commonError) {
    throw new MessagingError('Failed to resolve direct conversation', 500, 'direct_lookup_failed')
  }

  return common?.[0]?.conversation_id ?? null
}

function matchesConversationSearch(conversation: MessagingConversation, normalizedQuery: string, viewerUserId: string) {
  if (!normalizedQuery) return true

  const conversationName = normalizeSearchTerm(conversation.name)
  if (conversationName.includes(normalizedQuery)) return true

  const participantText = conversation.participants
    .filter((participant) => participant.user_id !== viewerUserId)
    .map((participant) => normalizeSearchTerm(participant.profile?.full_name))
    .join(' ')

  if (participantText.includes(normalizedQuery)) return true

  const lastMessageText = normalizeSearchTerm(conversation.last_message?.content)
  return lastMessageText.includes(normalizedQuery)
}

function visibleInInboxFilter(conversation: MessagingConversation, filter: ConversationInboxFilter | undefined) {
  if (filter === 'requests') {
    return conversation.viewer_participation.membership_state === 'requested' && conversation.viewer_participation.folder === 'requests'
  }

  if (filter === 'archived') {
    return conversation.viewer_participation.folder === 'archived'
  }

  if (filter === 'broadcast') {
    return conversation.type === 'broadcast' && conversation.viewer_participation.membership_state === 'active'
  }

  return (
    conversation.type !== 'broadcast' &&
    conversation.viewer_participation.folder === 'primary' &&
    conversation.viewer_participation.membership_state === 'active'
  )
}

function getNextCursor<T extends { updated_at: string }>(items: T[], limit: number) {
  if (items.length <= limit) return null
  return items[limit - 1]?.updated_at ?? null
}

export async function listConversations(args: {
  supabase: SupabaseLike
  userId: string
  folder?: ConversationInboxFilter
  query?: string | null
  cursor?: string | null
  limit?: number
}): Promise<MessagingConversationPage> {
  const limit = clampLimit(args.limit, DEFAULT_CONVERSATION_LIMIT, MAX_CONVERSATION_LIMIT)

  const { data: participantData, error: participantError } = await args.supabase
    .from('conversation_participants')
    .select(
      'id, conversation_id, user_id, role, folder, membership_state, last_read_at, last_read_message_id, is_muted, archived_at, joined_at'
    )
    .eq('user_id', args.userId)
    .neq('membership_state', 'removed')

  if (participantError) {
    throw new MessagingError('Failed to load conversations', 500, 'conversation_list_failed')
  }

  const participantRows = (participantData ?? []) as ParticipantRow[]
  const conversationIds = uniqueStrings(participantRows.map((row) => row.conversation_id))
  if (conversationIds.length === 0) {
    return { conversations: [], next_cursor: null }
  }

  const { data: conversationData, error: conversationError } = await args.supabase
    .from('conversations')
    .select('id, name, type, image_url, created_by, created_at, updated_at')
    .in('id', conversationIds)
    .order('updated_at', { ascending: false })

  if (conversationError) {
    throw new MessagingError('Failed to load conversations', 500, 'conversation_list_failed')
  }

  const { data: allParticipantData, error: allParticipantError } = await args.supabase
    .from('conversation_participants')
    .select(
      'id, conversation_id, user_id, role, folder, membership_state, last_read_at, last_read_message_id, is_muted, archived_at, joined_at'
    )
    .in('conversation_id', conversationIds)
    .neq('membership_state', 'removed')

  if (allParticipantError) {
    throw new MessagingError('Failed to load conversations', 500, 'conversation_list_failed')
  }

  const allParticipantRows = (allParticipantData ?? []) as ParticipantRow[]
  const groupedParticipantRows = new Map<string, ParticipantRow[]>()
  for (const row of allParticipantRows) {
    const current = groupedParticipantRows.get(row.conversation_id) ?? []
    current.push(row)
    groupedParticipantRows.set(row.conversation_id, current)
  }

  const viewerRole = await getViewerRole(args.supabase, args.userId)
  const profileMap = await getProfileMap(args.supabase, allParticipantRows.map((row) => row.user_id))

  const hydrated = await Promise.all(
    ((conversationData ?? []) as ConversationRow[])
      .filter((conversation) => matchesCursor(conversation.updated_at, args.cursor))
      .map((conversation) =>
        hydrateConversation(args.supabase, args.userId, conversation, groupedParticipantRows.get(conversation.id) ?? [], {
          profileMap,
          viewerRole,
        })
      )
  )

  const normalizedQuery = normalizeSearchTerm(args.query)
  const filtered = hydrated
    .filter((conversation) => visibleInInboxFilter(conversation, args.folder))
    .filter((conversation) => matchesConversationSearch(conversation, normalizedQuery, args.userId))
    .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at))

  return {
    conversations: filtered.slice(0, limit),
    next_cursor: getNextCursor(filtered, limit),
  }
}

export async function createConversation(args: {
  supabase: SupabaseLike
  request: Request
  userId: string
  type: ConversationType
  participantIds: string[]
  name?: string | null
  openerMessage?: string | null
  imageUrl?: string | null
}) {
  const participantIds = uniqueStrings(args.participantIds).filter((id) => id !== args.userId)
  const type = asConversationType(args.type)
  const openerMessage = args.openerMessage?.trim() ?? ''

  if (type === 'direct') {
    assert(participantIds.length === 1, 'Direct conversations require exactly one participant', 400, 'invalid_direct_participants')

    const otherUserId = participantIds[0]
    const canInteract = await canUsersInteract(args.supabase as never, args.userId, otherUserId)
    assert(canInteract, 'You cannot message this user', 403, 'message_blocked')

    const existingConversationId = await findExistingDirectConversationId(args.supabase, args.userId, otherUserId)
    if (existingConversationId) {
      return hydrateConversation(args.supabase, args.userId, await getConversationRow(args.supabase, existingConversationId))
    }

    const throttle = await enforceMultiScopeThrottle({
      request: args.request,
      userId: args.userId,
      action: 'messages:new-direct-request',
      windowSeconds: 3600,
      accountLimit: 10,
      ipLimit: 20,
      deviceLimit: 15,
    })

    if (!throttle.allowed) {
      throw new MessagingError('Too many new message requests. Please try again later.', 429, 'dm_request_rate_limited')
    }
  }

  if (type === 'group') {
    const throttle = await enforceMultiScopeThrottle({
      request: args.request,
      userId: args.userId,
      action: 'messages:group-create',
      windowSeconds: 3600,
      accountLimit: 5,
      ipLimit: 8,
      deviceLimit: 6,
    })

    if (!throttle.allowed) {
      throw new MessagingError('Too many group creations. Please try again later.', 429, 'group_create_rate_limited')
    }
  }

  if (type === 'broadcast') {
    const role = await getViewerRole(args.supabase, args.userId)
    assert(BROADCAST_ROLES.has(role), 'Only privileged roles can create broadcasts', 403, 'broadcast_role_required')
  }

  for (const participantId of participantIds) {
    const allowed = await canUsersInteract(args.supabase as never, args.userId, participantId)
    assert(allowed, 'One or more participants cannot be added to this conversation', 403, 'participant_interaction_blocked')
  }

  const { data: conversation, error: conversationError } = await args.supabase
    .from('conversations')
    .insert({
      name: type === 'direct' ? null : args.name?.trim() || null,
      type,
      image_url: args.imageUrl ?? null,
      created_by: args.userId,
    })
    .select('id, name, type, image_url, created_by, created_at, updated_at')
    .single()

  if (conversationError || !conversation) {
    throw new MessagingError('Failed to create conversation', 500, 'conversation_create_failed')
  }

  const participantsToInsert = [
    {
      conversation_id: conversation.id,
      user_id: args.userId,
      role: 'admin',
      folder: 'primary',
      membership_state: 'active',
      archived_at: null,
    },
    ...participantIds.map((participantId) => ({
      conversation_id: conversation.id,
      user_id: participantId,
      role: 'member',
      folder: type === 'direct' ? 'requests' : 'primary',
      membership_state: type === 'direct' ? 'requested' : 'active',
      archived_at: null,
    })),
  ]

  const { error: participantInsertError } = await args.supabase.from('conversation_participants').insert(participantsToInsert)

  if (participantInsertError) {
    throw new MessagingError('Failed to add participants', 500, 'participant_insert_failed')
  }

  if (openerMessage) {
    await insertMessageRecord({
      supabase: args.supabase,
      conversationId: conversation.id,
      senderId: args.userId,
      text: openerMessage,
      attachments: [],
    })
  }

  await writeAuditLog({
    supabase: args.supabase as never,
    actorUserId: args.userId,
    action: 'conversation.created',
    targetType: 'conversation',
    targetId: conversation.id,
    metadata: { type },
  })

  return hydrateConversation(args.supabase, args.userId, conversation as ConversationRow)
}

export async function getConversation(args: { supabase: SupabaseLike; userId: string; conversationId: string }) {
  const access = await ensureConversationAccess(args.supabase, args.conversationId, args.userId)
  return hydrateConversation(args.supabase, args.userId, access.conversation, access.participantRows)
}

export async function listMessages(args: {
  supabase: SupabaseLike
  userId: string
  conversationId: string
  cursor?: string | null
  limit?: number
}) {
  await ensureConversationAccess(args.supabase, args.conversationId, args.userId)

  const limit = clampLimit(args.limit, DEFAULT_MESSAGE_LIMIT, MAX_MESSAGE_LIMIT)
  let query = args.supabase
    .from('messages')
    .select(
      'id, conversation_id, sender_id, content, message_type, image_url, file_url, file_name, reply_to_id, is_edited, is_deleted, created_at, updated_at'
    )
    .eq('conversation_id', args.conversationId)
    .order('created_at', { ascending: false })
    .limit(limit + 1)

  if (args.cursor) {
    query = query.lt('created_at', args.cursor)
  }

  const { data, error } = await query
  if (error) {
    throw new MessagingError('Failed to load messages', 500, 'message_list_failed')
  }

  const rows = (data ?? []) as MessageRow[]
  const pageRows = rows.slice(0, limit).reverse()
  const messages = await hydrateMessages(args.supabase, args.userId, pageRows)

  return {
    messages,
    next_cursor: rows.length > limit ? rows[limit - 1]?.created_at ?? null : null,
  }
}

export async function sendMessage(args: {
  supabase: SupabaseLike
  request: Request
  userId: string
  conversationId: string
  text?: string | null
  attachments?: unknown
  replyToId?: string | null
}) {
  const access = await ensureConversationAccess(args.supabase, args.conversationId, args.userId)

  assert(
    canSendInConversation({
      conversation: access.conversation,
      viewerParticipant: access.viewerParticipant,
      participants: access.participants,
      viewerRole: access.viewerRole,
    }),
    access.conversation.type === 'direct'
      ? 'This conversation is waiting for acceptance before more messages can be sent'
      : 'You cannot send messages in this conversation',
    403,
    'send_not_allowed'
  )

  const throttle = await enforceMultiScopeThrottle({
    request: args.request,
    userId: args.userId,
    action: 'messages:send',
    windowSeconds: 60,
    accountLimit: 60,
    ipLimit: 120,
    deviceLimit: 90,
  })

  if (!throttle.allowed) {
    throw new MessagingError('You are sending messages too quickly. Please slow down.', 429, 'message_rate_limited')
  }

  const text = args.text?.trim() || null
  const attachments = normalizeFeedAttachments(args.attachments)
  assert(text || attachments.length > 0, 'Message content required', 400, 'message_empty')
  assert(attachments.length <= MAX_FEED_ATTACHMENTS, `A message can include up to ${MAX_FEED_ATTACHMENTS} attachments`, 400, 'too_many_attachments')

  if (args.replyToId) {
    const { data: replyMessage, error } = await args.supabase
      .from('messages')
      .select('id, conversation_id')
      .eq('id', args.replyToId)
      .maybeSingle()

    if (error) {
      throw new MessagingError('Failed to resolve reply target', 500, 'reply_lookup_failed')
    }

    assert(replyMessage?.conversation_id === args.conversationId, 'Reply target must be in the same conversation', 400, 'invalid_reply_target')
  }

  const messageRow = await insertMessageRecord({
    supabase: args.supabase,
    conversationId: args.conversationId,
    senderId: args.userId,
    text,
    attachments,
    replyToId: args.replyToId ?? null,
  })

  const [conversation, hydratedMessages] = await Promise.all([
    hydrateConversation(args.supabase, args.userId, access.conversation, access.participantRows),
    hydrateMessages(args.supabase, args.userId, [messageRow]),
  ])

  return {
    conversation,
    message: hydratedMessages[0],
  }
}

export async function markMessagesRead(args: {
  supabase: SupabaseLike
  userId: string
  conversationId: string
  messageIds: string[]
}) {
  const access = await ensureConversationAccess(args.supabase, args.conversationId, args.userId)
  const targetIds = uniqueStrings(args.messageIds)

  if (targetIds.length === 0) {
    return hydrateConversation(args.supabase, args.userId, access.conversation, access.participantRows)
  }

  const { data: messages, error } = await args.supabase
    .from('messages')
    .select('id, created_at')
    .eq('conversation_id', args.conversationId)
    .in('id', targetIds)

  if (error) {
    throw new MessagingError('Failed to mark messages as read', 500, 'read_lookup_failed')
  }

  const validMessages = (messages ?? []) as Array<{ id: string; created_at: string }>
  if (validMessages.length === 0) {
    return hydrateConversation(args.supabase, args.userId, access.conversation, access.participantRows)
  }

  const { data: existingReads, error: existingReadsError } = await args.supabase
    .from('message_reads')
    .select('message_id')
    .eq('user_id', args.userId)
    .in('message_id', validMessages.map((message) => message.id))

  if (existingReadsError) {
    throw new MessagingError('Failed to mark messages as read', 500, 'read_existing_lookup_failed')
  }

  const existingReadIds = new Set(
    ((existingReads ?? []) as Array<{ message_id: string | null }>).flatMap((row) =>
      row.message_id ? [row.message_id] : []
    )
  )
  const unreadMessages = validMessages.filter((message) => !existingReadIds.has(message.id))

  if (unreadMessages.length === 0) {
    return hydrateConversation(args.supabase, args.userId, access.conversation)
  }

  const { error: readError } = await args.supabase.from('message_reads').upsert(
    unreadMessages.map((message) => ({
      message_id: message.id,
      user_id: args.userId,
      read_at: new Date().toISOString(),
    })),
    { onConflict: 'message_id,user_id', ignoreDuplicates: true }
  )

  if (readError) {
    throw new MessagingError('Failed to mark messages as read', 500, 'read_insert_failed')
  }

  const latestUnreadMessage = [...unreadMessages].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0]
  const currentLastReadAt = access.viewerParticipant.last_read_at ? Date.parse(access.viewerParticipant.last_read_at) : 0

  if (latestUnreadMessage && Date.parse(latestUnreadMessage.created_at) > currentLastReadAt) {
    await args.supabase
      .from('conversation_participants')
      .update({
        last_read_at: latestUnreadMessage.created_at,
        last_read_message_id: latestUnreadMessage.id,
      })
      .eq('conversation_id', args.conversationId)
      .eq('user_id', args.userId)
  }

  return hydrateConversation(args.supabase, args.userId, access.conversation)
}

async function updateParticipantState(args: {
  supabase: SupabaseLike
  userId: string
  conversationId: string
  updates: Partial<{
    folder: ConversationFolder
    membership_state: ConversationMembershipState
    is_muted: boolean
    archived_at: string | null
  }>
}) {
  const access = await ensureConversationAccess(args.supabase, args.conversationId, args.userId)
  const { error } = await args.supabase
    .from('conversation_participants')
    .update(args.updates)
    .eq('conversation_id', args.conversationId)
    .eq('user_id', args.userId)

  if (error) {
    throw new MessagingError('Failed to update conversation state', 500, 'conversation_state_failed')
  }

  return hydrateConversation(args.supabase, args.userId, access.conversation, access.participantRows)
}

export async function acceptConversationRequest(args: {
  supabase: SupabaseLike
  userId: string
  conversationId: string
}) {
  const access = await ensureConversationAccess(args.supabase, args.conversationId, args.userId)
  assert(access.viewerParticipant.membership_state === 'requested', 'This conversation is not awaiting approval', 400, 'request_not_pending')

  const { error } = await args.supabase
    .from('conversation_participants')
    .update({
      membership_state: 'active',
      folder: 'primary',
      archived_at: null,
    })
    .eq('conversation_id', args.conversationId)
    .eq('user_id', args.userId)

  if (error) {
    throw new MessagingError('Failed to accept message request', 500, 'request_accept_failed')
  }

  await args.supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', args.conversationId)
  return hydrateConversation(args.supabase, args.userId, access.conversation, access.participantRows)
}

export async function ignoreConversationRequest(args: {
  supabase: SupabaseLike
  userId: string
  conversationId: string
}) {
  const access = await ensureConversationAccess(args.supabase, args.conversationId, args.userId)
  assert(access.viewerParticipant.membership_state === 'requested', 'This conversation is not awaiting approval', 400, 'request_not_pending')

  return updateParticipantState({
    supabase: args.supabase,
    userId: args.userId,
    conversationId: args.conversationId,
    updates: {
      folder: 'archived',
      archived_at: new Date().toISOString(),
    },
  })
}

export async function archiveConversation(args: {
  supabase: SupabaseLike
  userId: string
  conversationId: string
}) {
  return updateParticipantState({
    supabase: args.supabase,
    userId: args.userId,
    conversationId: args.conversationId,
    updates: {
      folder: 'archived',
      archived_at: new Date().toISOString(),
    },
  })
}

export async function unarchiveConversation(args: {
  supabase: SupabaseLike
  userId: string
  conversationId: string
}) {
  const access = await ensureConversationAccess(args.supabase, args.conversationId, args.userId)
  const nextFolder: ConversationFolder =
    access.viewerParticipant.membership_state === 'requested' ? 'requests' : 'primary'

  return updateParticipantState({
    supabase: args.supabase,
    userId: args.userId,
    conversationId: args.conversationId,
    updates: {
      folder: nextFolder,
      archived_at: null,
    },
  })
}

export async function muteConversation(args: {
  supabase: SupabaseLike
  userId: string
  conversationId: string
}) {
  return updateParticipantState({
    supabase: args.supabase,
    userId: args.userId,
    conversationId: args.conversationId,
    updates: { is_muted: true },
  })
}

export async function unmuteConversation(args: {
  supabase: SupabaseLike
  userId: string
  conversationId: string
}) {
  return updateParticipantState({
    supabase: args.supabase,
    userId: args.userId,
    conversationId: args.conversationId,
    updates: { is_muted: false },
  })
}

async function ensureRemainingAdmin(args: {
  supabase: SupabaseLike
  conversationId: string
  excludingUserId: string
}) {
  const { data, error } = await args.supabase
    .from('conversation_participants')
    .select('id, user_id, role, membership_state, joined_at')
    .eq('conversation_id', args.conversationId)
    .neq('user_id', args.excludingUserId)
    .order('joined_at', { ascending: true })

  if (error) {
    throw new MessagingError('Failed to check group admins', 500, 'group_admin_check_failed')
  }

  const activeParticipants = ((data ?? []) as Array<Pick<ParticipantRow, 'id' | 'user_id' | 'role' | 'membership_state' | 'joined_at'>>).filter(
    (participant) => asMembershipState(participant.membership_state) === 'active'
  )

  const hasAdmin = activeParticipants.some((participant) => asParticipantRole(participant.role) === 'admin')
  if (hasAdmin || activeParticipants.length === 0) return

  const oldestActive = activeParticipants[0]
  await args.supabase.from('conversation_participants').update({ role: 'admin' }).eq('id', oldestActive.id)
}

export async function leaveConversation(args: {
  supabase: SupabaseLike
  userId: string
  conversationId: string
}) {
  const access = await ensureConversationAccess(args.supabase, args.conversationId, args.userId)
  assert(access.conversation.type !== 'direct', 'Direct conversations can be archived instead of left', 400, 'leave_direct_not_supported')
  assert(access.viewerParticipant.membership_state === 'active', 'Only active participants can leave', 400, 'leave_inactive')

  const now = new Date().toISOString()
  const { error } = await args.supabase
    .from('conversation_participants')
    .update({
      membership_state: 'left',
      folder: 'archived',
      archived_at: now,
    })
    .eq('conversation_id', args.conversationId)
    .eq('user_id', args.userId)

  if (error) {
    throw new MessagingError('Failed to leave conversation', 500, 'leave_conversation_failed')
  }

  if (access.conversation.type === 'group' && access.viewerParticipant.role === 'admin') {
    await ensureRemainingAdmin({
      supabase: args.supabase,
      conversationId: args.conversationId,
      excludingUserId: args.userId,
    })
  }

  await args.supabase.from('conversations').update({ updated_at: now }).eq('id', args.conversationId)
  return hydrateConversation(args.supabase, args.userId, access.conversation, access.participantRows)
}

export async function updateConversationDetails(args: {
  supabase: SupabaseLike
  userId: string
  conversationId: string
  name?: string | null
  imageUrl?: string | null
}) {
  const access = await ensureConversationAccess(args.supabase, args.conversationId, args.userId)
  assert(access.conversation.type !== 'direct', 'Direct conversations cannot be renamed', 400, 'direct_update_unsupported')

  if (access.conversation.type === 'group') {
    assert(access.viewerParticipant.role === 'admin', 'Only group admins can update group details', 403, 'group_admin_required')
  }

  if (access.conversation.type === 'broadcast') {
    assert(BROADCAST_ROLES.has(access.viewerRole), 'Only privileged roles can update broadcasts', 403, 'broadcast_role_required')
  }

  const { error } = await args.supabase
    .from('conversations')
    .update({
      name: args.name?.trim() || null,
      image_url: args.imageUrl ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', args.conversationId)

  if (error) {
    throw new MessagingError('Failed to update conversation', 500, 'conversation_update_failed')
  }

  return hydrateConversation(args.supabase, args.userId, await getConversationRow(args.supabase, args.conversationId))
}

export async function hardDeleteConversation(args: {
  supabase: SupabaseLike
  userId: string
  conversationId: string
}) {
  const role = await getViewerRole(args.supabase, args.userId)
  assert(BROADCAST_ROLES.has(role), 'Only moderators can permanently delete conversations', 403, 'conversation_delete_forbidden')

  const { error } = await args.supabase.from('conversations').delete().eq('id', args.conversationId)
  if (error) {
    throw new MessagingError('Failed to delete conversation', 500, 'conversation_delete_failed')
  }

  await writeAuditLog({
    supabase: args.supabase as never,
    actorUserId: args.userId,
    action: 'conversation.deleted',
    targetType: 'conversation',
    targetId: args.conversationId,
  })

  return { success: true }
}

export async function addParticipantsToConversation(args: {
  supabase: SupabaseLike
  userId: string
  conversationId: string
  participantIds: string[]
}) {
  const access = await ensureGroupAdminAccess(args.supabase, args.conversationId, args.userId)
  const participantIds = uniqueStrings(args.participantIds).filter((id) => id !== args.userId)
  assert(participantIds.length > 0, 'Select at least one participant', 400, 'participant_ids_required')

  for (const participantId of participantIds) {
    const allowed = await canUsersInteract(args.supabase as never, args.userId, participantId)
    assert(allowed, 'One or more participants cannot be added to this group', 403, 'participant_interaction_blocked')
  }

  const existingByUser = new Map(access.participants.map((participant) => [participant.user_id, participant]))
  const newRows = participantIds
    .filter((participantId) => !existingByUser.has(participantId))
    .map((participantId) => ({
      conversation_id: args.conversationId,
      user_id: participantId,
      role: 'member',
      folder: 'primary',
      membership_state: 'active',
      archived_at: null,
    }))

  if (newRows.length > 0) {
    const { error } = await args.supabase.from('conversation_participants').insert(newRows)
    if (error) {
      throw new MessagingError('Failed to add participants', 500, 'participant_insert_failed')
    }
  }

  const reactivatedIds = participantIds.filter((participantId) => {
    const existing = existingByUser.get(participantId)
    return existing && existing.membership_state !== 'active'
  })

  if (reactivatedIds.length > 0) {
    const { error } = await args.supabase
      .from('conversation_participants')
      .update({
        membership_state: 'active',
        folder: 'primary',
        archived_at: null,
      })
      .eq('conversation_id', args.conversationId)
      .in('user_id', reactivatedIds)

    if (error) {
      throw new MessagingError('Failed to reactivate participants', 500, 'participant_reactivate_failed')
    }
  }

  await args.supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', args.conversationId)
  return hydrateConversation(args.supabase, args.userId, access.conversation)
}

export async function updateParticipantRole(args: {
  supabase: SupabaseLike
  userId: string
  conversationId: string
  targetUserId: string
  role: ConversationParticipantRole
}) {
  const access = await ensureGroupAdminAccess(args.supabase, args.conversationId, args.userId)
  const targetParticipant = access.participants.find((participant) => participant.user_id === args.targetUserId)
  assert(targetParticipant, 'Participant not found', 404, 'participant_not_found')
  assert(targetParticipant.membership_state === 'active', 'Only active participants can be updated', 400, 'participant_not_active')

  if (targetParticipant.role === 'admin' && args.role === 'member') {
    const activeAdmins = access.participants.filter(
      (participant) => participant.membership_state === 'active' && participant.role === 'admin'
    )
    assert(activeAdmins.length > 1, 'A group must always have at least one admin', 400, 'last_admin')
  }

  const { error } = await args.supabase
    .from('conversation_participants')
    .update({ role: args.role })
    .eq('conversation_id', args.conversationId)
    .eq('user_id', args.targetUserId)

  if (error) {
    throw new MessagingError('Failed to update participant role', 500, 'participant_role_failed')
  }

  return hydrateConversation(args.supabase, args.userId, access.conversation)
}

export async function removeParticipant(args: {
  supabase: SupabaseLike
  userId: string
  conversationId: string
  targetUserId: string
}) {
  const access = await ensureGroupAdminAccess(args.supabase, args.conversationId, args.userId)
  const targetParticipant = access.participants.find((participant) => participant.user_id === args.targetUserId)
  assert(targetParticipant, 'Participant not found', 404, 'participant_not_found')
  assert(targetParticipant.user_id !== args.userId, 'Use leave conversation to leave a group yourself', 400, 'remove_self_unsupported')

  if (targetParticipant.role === 'admin') {
    const activeAdmins = access.participants.filter(
      (participant) => participant.membership_state === 'active' && participant.role === 'admin'
    )
    assert(activeAdmins.length > 1, 'A group must always have at least one admin', 400, 'last_admin')
  }

  const { error } = await args.supabase
    .from('conversation_participants')
    .update({
      membership_state: 'removed',
      folder: 'archived',
      archived_at: new Date().toISOString(),
    })
    .eq('conversation_id', args.conversationId)
    .eq('user_id', args.targetUserId)

  if (error) {
    throw new MessagingError('Failed to remove participant', 500, 'participant_remove_failed')
  }

  return hydrateConversation(args.supabase, args.userId, access.conversation)
}

async function getMessageRow(args: { supabase: SupabaseLike; messageId: string }) {
  const { data, error } = await args.supabase
    .from('messages')
    .select(
      'id, conversation_id, sender_id, content, message_type, image_url, file_url, file_name, reply_to_id, is_edited, is_deleted, created_at, updated_at'
    )
    .eq('id', args.messageId)
    .maybeSingle()

  if (error) {
    throw new MessagingError('Failed to load message', 500, 'message_lookup_failed')
  }

  assert(data, 'Message not found', 404, 'message_not_found')
  return data as MessageRow
}

export async function getMessage(args: {
  supabase: SupabaseLike
  userId: string
  messageId: string
}) {
  const message = await getMessageRow({ supabase: args.supabase, messageId: args.messageId })
  await ensureConversationAccess(args.supabase, message.conversation_id, args.userId)
  const hydrated = await hydrateMessages(args.supabase, args.userId, [message])
  return hydrated[0]
}

export async function updateMessage(args: {
  supabase: SupabaseLike
  userId: string
  messageId: string
  content: string
}) {
  const message = await getMessageRow({ supabase: args.supabase, messageId: args.messageId })
  await ensureConversationAccess(args.supabase, message.conversation_id, args.userId)
  assert(message.sender_id === args.userId, 'Only the sender can edit this message', 403, 'message_edit_forbidden')
  assert(!message.is_deleted, 'Deleted messages cannot be edited', 400, 'message_deleted')

  const content = args.content.trim()
  assert(content.length > 0, 'Message content required', 400, 'message_empty')

  const { data, error } = await args.supabase
    .from('messages')
    .update({
      content,
      is_edited: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', args.messageId)
    .select(
      'id, conversation_id, sender_id, content, message_type, image_url, file_url, file_name, reply_to_id, is_edited, is_deleted, created_at, updated_at'
    )
    .single()

  if (error || !data) {
    throw new MessagingError('Failed to update message', 500, 'message_update_failed')
  }

  const hydrated = await hydrateMessages(args.supabase, args.userId, [data as MessageRow])
  return hydrated[0]
}

export async function deleteMessage(args: {
  supabase: SupabaseLike
  userId: string
  messageId: string
}) {
  const message = await getMessageRow({ supabase: args.supabase, messageId: args.messageId })
  await ensureConversationAccess(args.supabase, message.conversation_id, args.userId)

  const viewerRole = await getViewerRole(args.supabase, args.userId)
  const canDelete = message.sender_id === args.userId || BROADCAST_ROLES.has(viewerRole)
  assert(canDelete, 'You cannot delete this message', 403, 'message_delete_forbidden')

  const { data, error } = await args.supabase
    .from('messages')
    .update({
      content: null,
      is_deleted: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', args.messageId)
    .select(
      'id, conversation_id, sender_id, content, message_type, image_url, file_url, file_name, reply_to_id, is_edited, is_deleted, created_at, updated_at'
    )
    .single()

  if (error || !data) {
    throw new MessagingError('Failed to delete message', 500, 'message_delete_failed')
  }

  const hydrated = await hydrateMessages(args.supabase, args.userId, [data as MessageRow])
  return hydrated[0]
}

export async function addReaction(args: {
  supabase: SupabaseLike
  userId: string
  messageId: string
  emoji: string
}) {
  const message = await getMessageRow({ supabase: args.supabase, messageId: args.messageId })
  const access = await ensureConversationAccess(args.supabase, message.conversation_id, args.userId)
  assert(access.viewerParticipant.membership_state === 'active', 'Only active participants can react to messages', 403, 'reaction_not_allowed')
  assert(args.emoji.trim().length > 0 && args.emoji.trim().length <= 8, 'Invalid reaction', 400, 'reaction_invalid')

  const { error } = await args.supabase.from('message_reactions').upsert(
    {
      message_id: args.messageId,
      user_id: args.userId,
      emoji: args.emoji.trim(),
    },
    { onConflict: 'message_id,user_id,emoji', ignoreDuplicates: true }
  )

  if (error) {
    throw new MessagingError('Failed to react to message', 500, 'reaction_insert_failed')
  }

  const hydrated = await hydrateMessages(args.supabase, args.userId, [message])
  return hydrated[0]
}

export async function removeReaction(args: {
  supabase: SupabaseLike
  userId: string
  messageId: string
  emoji: string
}) {
  const message = await getMessageRow({ supabase: args.supabase, messageId: args.messageId })
  await ensureConversationAccess(args.supabase, message.conversation_id, args.userId)

  const { error } = await args.supabase
    .from('message_reactions')
    .delete()
    .eq('message_id', args.messageId)
    .eq('user_id', args.userId)
    .eq('emoji', args.emoji.trim())

  if (error) {
    throw new MessagingError('Failed to remove reaction', 500, 'reaction_delete_failed')
  }

  const hydrated = await hydrateMessages(args.supabase, args.userId, [message])
  return hydrated[0]
}

export async function searchMessages(args: {
  supabase: SupabaseLike
  userId: string
  query: string
}): Promise<MessagingSearchResponse> {
  const query = args.query.trim()
  if (query.length < 2) {
    return { conversations: [], messages: [] }
  }

  const { data: participantData, error: participantError } = await args.supabase
    .from('conversation_participants')
    .select(
      'id, conversation_id, user_id, role, folder, membership_state, last_read_at, last_read_message_id, is_muted, archived_at, joined_at'
    )
    .eq('user_id', args.userId)
    .neq('membership_state', 'removed')

  if (participantError) {
    throw new MessagingError('Failed to search messages', 500, 'message_search_failed')
  }

  const participantRows = (participantData ?? []) as ParticipantRow[]
  const conversationIds = uniqueStrings(participantRows.map((row) => row.conversation_id))
  if (conversationIds.length === 0) {
    return { conversations: [], messages: [] }
  }

  const { data: conversationData, error: conversationError } = await args.supabase
    .from('conversations')
    .select('id, name, type, image_url, created_by, created_at, updated_at')
    .in('id', conversationIds)

  if (conversationError) {
    throw new MessagingError('Failed to search messages', 500, 'message_search_failed')
  }

  const groupedParticipantRows = new Map<string, ParticipantRow[]>()
  for (const row of participantRows) {
    const current = groupedParticipantRows.get(row.conversation_id) ?? []
    current.push(row)
    groupedParticipantRows.set(row.conversation_id, current)
  }

  const conversations = await Promise.all(
    ((conversationData ?? []) as ConversationRow[]).map((conversation) =>
      hydrateConversation(args.supabase, args.userId, conversation, groupedParticipantRows.get(conversation.id) ?? [])
    )
  )

  const normalizedQuery = normalizeSearchTerm(query)
  const matchingConversations = conversations
    .filter((conversation) => matchesConversationSearch(conversation, normalizedQuery, args.userId))
    .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at))
    .slice(0, 10)

  const { data: messageData, error: messageError } = await args.supabase
    .from('messages')
    .select(
      'id, conversation_id, sender_id, content, message_type, image_url, file_url, file_name, reply_to_id, is_edited, is_deleted, created_at, updated_at'
    )
    .in('conversation_id', conversationIds)
    .eq('is_deleted', false)
    .ilike('content', `%${query}%`)
    .order('created_at', { ascending: false })
    .limit(20)

  if (messageError) {
    throw new MessagingError('Failed to search messages', 500, 'message_search_failed')
  }

  const hydratedMessages = await hydrateMessages(args.supabase, args.userId, (messageData ?? []) as MessageRow[])
  const conversationMap = new Map(conversations.map((conversation) => [conversation.id, conversation]))

  return {
    conversations: matchingConversations,
    messages: hydratedMessages
      .map((message) => {
        const conversation = conversationMap.get(message.conversation_id)
        if (!conversation) return null
        return {
          message,
          conversation: {
            id: conversation.id,
            name: conversation.name,
            type: conversation.type,
            image_url: conversation.image_url,
            updated_at: conversation.updated_at,
            participants: conversation.participants,
          },
        }
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item)),
  }
}

export async function reportMessage(args: {
  supabase: SupabaseLike
  userId: string
  messageId: string
  reason: string
  details?: string | null
}) {
  const message = await getMessageRow({ supabase: args.supabase, messageId: args.messageId })
  await ensureConversationAccess(args.supabase, message.conversation_id, args.userId)
  assert(args.reason.trim().length > 0, 'reason is required', 400, 'report_reason_required')

  const { data: report, error } = await args.supabase
    .from('content_reports')
    .insert({
      reporter_id: args.userId,
      message_id: args.messageId,
      reason: args.reason.trim(),
      details: args.details?.trim() || null,
      status: 'open',
    })
    .select('*')
    .single()

  if (error || !report) {
    throw new MessagingError('Failed to report message', 500, 'message_report_failed')
  }

  await args.supabase.from('moderation_queue').insert({
    report_id: report.id,
    status: 'queued',
    priority: 'normal',
  })

  await enqueueWork({
    queue: 'moderation',
    taskType: 'moderation.message.reported',
    payload: {
      reportId: String(report.id),
      reporterId: args.userId,
      messageId: args.messageId,
      conversationId: message.conversation_id,
    },
  })

  await writeAuditLog({
    supabase: args.supabase as never,
    actorUserId: args.userId,
    action: 'message.reported',
    targetType: 'message',
    targetId: args.messageId,
    metadata: { reportId: String(report.id) },
  })

  return { report }
}
