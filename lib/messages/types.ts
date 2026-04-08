export const CONVERSATION_TYPES = ['direct', 'group', 'broadcast'] as const
export type ConversationType = (typeof CONVERSATION_TYPES)[number]

export const CONVERSATION_FOLDERS = ['primary', 'requests', 'archived'] as const
export type ConversationFolder = (typeof CONVERSATION_FOLDERS)[number]

export type ConversationInboxFilter = ConversationFolder | 'broadcast'

export const MEMBERSHIP_STATES = ['requested', 'active', 'left', 'removed'] as const
export type ConversationMembershipState = (typeof MEMBERSHIP_STATES)[number]

export const PARTICIPANT_ROLES = ['admin', 'member'] as const
export type ConversationParticipantRole = (typeof PARTICIPANT_ROLES)[number]

export const MESSAGE_ATTACHMENT_KINDS = ['image', 'video', 'file'] as const
export type MessageAttachmentKind = (typeof MESSAGE_ATTACHMENT_KINDS)[number]

export interface MessagingProfile {
  id: string
  full_name: string | null
  avatar_url: string | null
  role: string | null
  email?: string | null
  last_seen_at?: string | null
}

export interface MessagingParticipant {
  id: string
  conversation_id: string
  user_id: string
  role: ConversationParticipantRole
  folder: ConversationFolder
  membership_state: ConversationMembershipState
  last_read_at: string | null
  last_read_message_id: string | null
  is_muted: boolean
  archived_at: string | null
  joined_at: string
  profile: MessagingProfile | null
}

export interface MessagingAttachment {
  id: string
  message_id: string
  kind: MessageAttachmentKind
  url: string
  pathname: string | null
  mime_type: string | null
  name: string | null
  size: number | null
  sort_order: number
  created_at: string
}

export interface MessagingReactionSummary {
  emoji: string
  count: number
  reacted: boolean
  user_ids: string[]
}

export interface MessagingReadReceipt {
  user_id: string
  read_at: string
}

export interface MessagingReplyPreview {
  id: string
  content: string | null
  sender: Pick<MessagingProfile, 'id' | 'full_name'> | null
}

export interface MessagingMessage {
  id: string
  conversation_id: string
  sender_id: string | null
  content: string | null
  message_type: 'text' | 'image' | 'file' | 'system'
  image_url: string | null
  file_url: string | null
  file_name: string | null
  reply_to_id: string | null
  is_edited: boolean
  is_deleted: boolean
  created_at: string
  updated_at: string
  sender: MessagingProfile | null
  reply_to: MessagingReplyPreview | null
  attachments: MessagingAttachment[]
  reactions: MessagingReactionSummary[]
  read_by: MessagingReadReceipt[]
}

export interface MessagingConversation {
  id: string
  name: string | null
  type: ConversationType
  image_url: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  viewer_participation: MessagingParticipant
  participants: MessagingParticipant[]
  last_message: MessagingMessage | null
  unread_count: number
  can_send: boolean
}

export interface MessagingConversationPage {
  conversations: MessagingConversation[]
  next_cursor: string | null
}

export interface MessagingSearchHit {
  message: MessagingMessage
  conversation: Pick<MessagingConversation, 'id' | 'name' | 'type' | 'image_url' | 'updated_at' | 'participants'>
}

export interface MessagingSearchResponse {
  conversations: MessagingConversation[]
  messages: MessagingSearchHit[]
}
