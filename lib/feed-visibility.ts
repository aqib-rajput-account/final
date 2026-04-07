type MetadataRecord = Record<string, unknown>

export type StoredPostVisibility = 'public' | 'followers' | 'private'
export type FeedAudience = StoredPostVisibility | 'selected'

function isObject(value: unknown): value is MetadataRecord {
  return typeof value === 'object' && value !== null
}

export function ensureMetadataRecord(value: unknown): MetadataRecord {
  return isObject(value) ? { ...value } : {}
}

function normalizeViewerIdList(value: unknown) {
  if (!Array.isArray(value)) return []

  return Array.from(
    new Set(
      value
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter(Boolean)
    )
  )
}

export function getSelectedViewerIds(metadata: unknown) {
  const record = ensureMetadataRecord(metadata)
  return normalizeViewerIdList(
    record.selected_viewer_ids ?? record.allowed_viewer_ids ?? record.viewer_ids ?? []
  )
}

export function resolveFeedAudience(input: {
  visibility?: string | null
  metadata?: unknown
}): FeedAudience {
  const metadata = ensureMetadataRecord(input.metadata)
  const selectedViewerIds = getSelectedViewerIds(metadata)
  const requestedAudience = typeof metadata.audience === 'string' ? metadata.audience : null

  if (input.visibility === 'public') return 'public'
  if (input.visibility === 'followers') return 'followers'
  if (input.visibility === 'private') {
    if (selectedViewerIds.length > 0 || requestedAudience === 'selected') {
      return 'selected'
    }

    return 'private'
  }

  if (requestedAudience === 'selected' && selectedViewerIds.length > 0) return 'selected'
  if (requestedAudience === 'followers') return 'followers'
  if (requestedAudience === 'private') return 'private'

  return 'public'
}

export function applyAudienceToMetadata(
  metadata: unknown,
  audience: FeedAudience,
  selectedViewerIds: string[] = []
) {
  const nextMetadata = ensureMetadataRecord(metadata)
  const normalizedIds = normalizeViewerIdList(selectedViewerIds)

  if (audience === 'selected') {
    nextMetadata.audience = 'selected'
    nextMetadata.selected_viewer_ids = normalizedIds
    delete nextMetadata.allowed_viewer_ids
    delete nextMetadata.viewer_ids
    return nextMetadata
  }

  delete nextMetadata.selected_viewer_ids
  delete nextMetadata.allowed_viewer_ids
  delete nextMetadata.viewer_ids
  nextMetadata.audience = audience
  return nextMetadata
}

export function normalizeStoredVisibility(
  requestedVisibility: string | null | undefined,
  metadata: unknown
): StoredPostVisibility {
  if (requestedVisibility === 'followers') return 'followers'

  const audience =
    requestedVisibility === 'selected'
      ? 'selected'
      : resolveFeedAudience({ visibility: requestedVisibility, metadata })

  if (audience === 'selected' || audience === 'private') return 'private'
  return 'public'
}

export function canViewerAccessPostRecord(
  post: {
    author_id?: unknown
    visibility?: unknown
    metadata?: unknown
    is_published?: unknown
  },
  viewerId: string | null,
  followedAuthorIds: Set<string> = new Set<string>()
) {
  if (post.is_published === false) return false

  const authorId = typeof post.author_id === 'string' ? post.author_id : ''
  if (viewerId && authorId && viewerId === authorId) return true

  if (viewerId) {
    const selectedViewerIds = getSelectedViewerIds(post.metadata)
    if (selectedViewerIds.includes(viewerId)) {
      return true
    }
  }

  const audience = resolveFeedAudience({
    visibility: typeof post.visibility === 'string' ? post.visibility : null,
    metadata: post.metadata,
  })

  if (audience === 'public') return true
  if (audience === 'followers') {
    return Boolean(viewerId && authorId && followedAuthorIds.has(authorId))
  }

  return false
}
