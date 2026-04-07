export const MAX_FEED_ATTACHMENTS = 4

export type FeedMediaKind = 'image' | 'video' | 'file'

export interface FeedMediaAttachment {
  id?: string | null
  url: string
  pathname?: string | null
  kind: FeedMediaKind
  mimeType?: string | null
  name?: string | null
  size?: number | null
  sortOrder?: number
}

interface FeedUploadRule {
  kind: FeedMediaKind
  maxSize: number
}

const IMAGE_MAX_SIZE = 5 * 1024 * 1024
const VIDEO_MAX_SIZE = 20 * 1024 * 1024
const FILE_MAX_SIZE = 10 * 1024 * 1024

const FEED_UPLOAD_RULES: Record<string, FeedUploadRule> = {
  'image/jpeg': { kind: 'image', maxSize: IMAGE_MAX_SIZE },
  'image/png': { kind: 'image', maxSize: IMAGE_MAX_SIZE },
  'image/gif': { kind: 'image', maxSize: IMAGE_MAX_SIZE },
  'image/webp': { kind: 'image', maxSize: IMAGE_MAX_SIZE },
  'video/mp4': { kind: 'video', maxSize: VIDEO_MAX_SIZE },
  'video/webm': { kind: 'video', maxSize: VIDEO_MAX_SIZE },
  'video/quicktime': { kind: 'video', maxSize: VIDEO_MAX_SIZE },
  'application/pdf': { kind: 'file', maxSize: FILE_MAX_SIZE },
  'application/msword': { kind: 'file', maxSize: FILE_MAX_SIZE },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { kind: 'file', maxSize: FILE_MAX_SIZE },
  'text/plain': { kind: 'file', maxSize: FILE_MAX_SIZE },
}

export const FEED_UPLOAD_ACCEPT = Object.keys(FEED_UPLOAD_RULES).join(',')

export function getFeedUploadRule(mimeType: string | null | undefined): FeedUploadRule | null {
  if (!mimeType) return null
  return FEED_UPLOAD_RULES[mimeType] ?? null
}

export function isSupportedFeedUploadType(mimeType: string | null | undefined) {
  return Boolean(getFeedUploadRule(mimeType))
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function normalizeAttachmentKind(raw: Record<string, unknown>, mimeType: string | null): FeedMediaKind | null {
  const explicitKind = raw.kind
  if (explicitKind === 'image' || explicitKind === 'video' || explicitKind === 'file') {
    return explicitKind
  }

  const rule = getFeedUploadRule(mimeType)
  if (rule) return rule.kind

  const mediaType = raw.media_type
  if (mediaType === 'image' || mediaType === 'video' || mediaType === 'file') {
    return mediaType
  }

  return null
}

export function normalizeFeedAttachment(raw: unknown, index = 0): FeedMediaAttachment | null {
  if (!isObject(raw)) return null

  const url =
    typeof raw.url === 'string'
      ? raw.url
      : typeof raw.media_url === 'string'
        ? raw.media_url
        : null

  if (!url) return null

  const mimeType =
    typeof raw.mimeType === 'string'
      ? raw.mimeType
      : typeof raw.mime_type === 'string'
        ? raw.mime_type
        : null

  const kind = normalizeAttachmentKind(raw, mimeType)
  if (!kind) return null

  return {
    id: typeof raw.id === 'string' ? raw.id : typeof raw.id === 'number' ? String(raw.id) : null,
    url,
    pathname: typeof raw.pathname === 'string' ? raw.pathname : null,
    kind,
    mimeType,
    name: typeof raw.name === 'string' ? raw.name : null,
    size: typeof raw.size === 'number' ? raw.size : null,
    sortOrder:
      typeof raw.sortOrder === 'number'
        ? raw.sortOrder
        : typeof raw.sort_order === 'number'
          ? raw.sort_order
          : index,
  }
}

export function normalizeFeedAttachments(raw: unknown): FeedMediaAttachment[] {
  if (!Array.isArray(raw)) return []

  return raw
    .map((item, index) => normalizeFeedAttachment(item, index))
    .filter((item): item is FeedMediaAttachment => Boolean(item))
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .slice(0, MAX_FEED_ATTACHMENTS)
}

export function mergeMetadataWithFeedAttachments(
  metadata: Record<string, unknown> | null | undefined,
  attachments: FeedMediaAttachment[]
) {
  const nextMetadata: Record<string, unknown> = { ...(metadata ?? {}) }

  if (attachments.length > 0) {
    nextMetadata.attachments = attachments.map((attachment, index) => ({
      url: attachment.url,
      pathname: attachment.pathname ?? null,
      kind: attachment.kind,
      mimeType: attachment.mimeType ?? null,
      name: attachment.name ?? null,
      size: attachment.size ?? null,
      sortOrder: attachment.sortOrder ?? index,
    }))
  } else {
    delete nextMetadata.attachments
  }

  return nextMetadata
}

export function extractFeedAttachmentsFromMetadata(metadata: unknown) {
  if (!isObject(metadata)) return []
  return normalizeFeedAttachments(metadata.attachments)
}

export function getPrimaryLegacyImageUrl(attachments: FeedMediaAttachment[]) {
  const primaryVisual = attachments.find((attachment) => attachment.kind === 'image')
  return primaryVisual?.url ?? null
}

export function isAnnouncementFeedPost(input: {
  post_type?: string | null
  metadata?: Record<string, unknown> | null
}) {
  return input.post_type === 'announcement' || Boolean(input.metadata?.pinned_at)
}
