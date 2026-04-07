'use client'

import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import useSWR from 'swr'
import useSWRInfinite from 'swr/infinite'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import {
  Bookmark,
  CalendarDays,
  Edit3,
  FileText,
  Globe2,
  Heart,
  Loader2,
  Lock,
  Megaphone,
  MessageCircle,
  Paperclip,
  Search,
  Send,
  Share2,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { usePresence } from '@/lib/hooks/use-realtime'
import { useRealtimeGateway } from '@/lib/hooks/use-realtime-gateway'
import type { RealtimeEventEnvelope } from '@/backend/realtime/types'
import { cn } from '@/lib/utils'
import { createClientTraceId, logClientTrace, observeClientMetric } from '@/lib/infrastructure/web-observability'
import { resolveFeedReturnContext, trackFeedFunnelEvent } from '@/lib/infrastructure/product-analytics'
import { applyAudienceToMetadata, getSelectedViewerIds, normalizeStoredVisibility, resolveFeedAudience } from '@/lib/feed-visibility'
import { FEED_UPLOAD_ACCEPT, MAX_FEED_ATTACHMENTS, normalizeFeedAttachments, type FeedMediaAttachment } from '@/lib/feed/media'
import { toast } from 'sonner'

type FeedFilter = 'all' | 'general' | 'announcements'
type ComposerVisibility = 'public' | 'selected' | 'private'

interface FeedPost {
  id: string
  content: string
  created_at: string
  updated_at: string
  author_id: string
  image_url: string | null
  post_type: string | null
  category: string | null
  visibility: string | null
  is_published: boolean
  mosque_id: string | null
  metadata: Record<string, unknown>
  pinned_at: string | null
  media: FeedMediaAttachment[]
  likes_count: number
  comments_count: number
  profiles: {
    id: string | null
    full_name: string | null
    avatar_url: string | null
    profession: string | null
    role: string | null
  } | null
  viewer: {
    liked: boolean
    bookmarked: boolean
  }
}

interface FeedPage {
  data: FeedPost[]
  userLikes: string[]
  userBookmarks: string[]
  nextCursor: string | null
  totalCount: number | null
}

interface CommunityMember {
  id: string
  full_name: string | null
  avatar_url: string | null
  profession?: string | null
  role?: string | null
  last_seen_at?: string | null
}

interface PostComment {
  id: string
  content: string
  created_at: string
  author_id: string
  author?: {
    id: string | null
    full_name: string | null
    avatar_url: string | null
    role: string | null
  } | null
}

const fetcher = async <T,>(url: string): Promise<T> => {
  const response = await fetch(url, { cache: 'no-store' })
  const payload = await response.json()

  if (!response.ok) {
    throw new Error(payload.error || 'Request failed')
  }

  return payload
}

function getInitials(name: string | null | undefined) {
  if (!name) return 'U'
  return name
    .split(' ')
    .filter(Boolean)
    .map((segment) => segment[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function resolveInitialFeed(value: string | null): FeedFilter {
  if (value === 'general' || value === 'announcements' || value === 'all') {
    return value
  }

  return 'all'
}

function buildFeedUrl(pathname: string, feed: FeedFilter, q: string) {
  const params = new URLSearchParams()
  if (feed !== 'all') params.set('feed', feed)
  if (q.trim()) params.set('q', q.trim())
  const search = params.toString()
  return search ? `${pathname}?${search}` : pathname
}

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedValue(value), delayMs)
    return () => window.clearTimeout(timeout)
  }, [delayMs, value])

  return debouncedValue
}

function roleLabel(role: string | null | undefined) {
  if (!role || role === 'member' || role === 'user') return null
  return role.charAt(0).toUpperCase() + role.slice(1)
}

function isAnnouncement(post: FeedPost) {
  return post.post_type === 'announcement' || Boolean(post.pinned_at)
}

function isMemberOnline(member: CommunityMember, realtimeOnlineIds: Set<string>) {
  const lastSeenAt = member.last_seen_at ? Date.parse(member.last_seen_at) : 0
  return realtimeOnlineIds.has(member.id) || (lastSeenAt > 0 && Date.now() - lastSeenAt < 5 * 60 * 1000)
}

function resolveComposerVisibility(post: Pick<FeedPost, 'visibility' | 'metadata'>): ComposerVisibility {
  const audience = resolveFeedAudience({ visibility: post.visibility, metadata: post.metadata })
  if (audience === 'selected') return 'selected'
  if (audience === 'private') return 'private'
  return 'public'
}

function visibilityLabel(value: ComposerVisibility | 'followers') {
  if (value === 'selected') return 'Selected friends'
  if (value === 'private') return 'Only me'
  if (value === 'followers') return 'Followers'
  return 'Community'
}

function visibilityHint(value: ComposerVisibility) {
  if (value === 'selected') return 'Only the friends you pick can view, like, and comment.'
  if (value === 'private') return 'Only you can see this post in your feed.'
  return 'Visible to the whole community feed.'
}

function VisibilityStatusIcon({ value }: { value: ComposerVisibility }) {
  if (value === 'selected') return <Users className="h-4 w-4 text-muted-foreground" />
  if (value === 'private') return <Lock className="h-4 w-4 text-muted-foreground" />
  return <Globe2 className="h-4 w-4 text-muted-foreground" />
}

function resolveRealtimeActorUserId(event: RealtimeEventEnvelope) {
  if (typeof event.actorUserId === 'string' && event.actorUserId) return event.actorUserId
  if (typeof event.payload.actorUserId === 'string' && event.payload.actorUserId) return event.payload.actorUserId
  if (typeof event.payload.authorId === 'string' && event.payload.authorId) return event.payload.authorId
  return null
}

function PostSkeleton() {
  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="aspect-video w-full rounded-xl" />
      </CardContent>
    </Card>
  )
}

function FormattedContent({
  content,
  onSearchTerm,
}: {
  content: string
  onSearchTerm: (term: string) => void
}) {
  if (!content) return null

  const parts = content.split(/(@[^\s.,!?;:]+|#[^\s.,!?;:]+)/g)

  return (
    <p className="whitespace-pre-wrap text-sm leading-6 sm:text-[15px]">
      {parts.map((part, index) => {
        if (part.startsWith('@') || part.startsWith('#')) {
          return (
            <button
              key={`${part}-${index}`}
              type="button"
              onClick={() => onSearchTerm(part)}
              className="inline rounded-sm bg-primary/5 px-1 font-medium text-primary transition-colors hover:bg-primary/10 hover:underline"
            >
              {part}
            </button>
          )
        }

        return <span key={`${index}-${part}`}>{part}</span>
      })}
    </p>
  )
}

function FeedAttachmentGrid({
  attachments,
  removable = false,
  onRemove,
}: {
  attachments: FeedMediaAttachment[]
  removable?: boolean
  onRemove?: (index: number) => void
}) {
  if (attachments.length === 0) return null

  const visualAttachments = attachments.filter((attachment) => attachment.kind === 'image' || attachment.kind === 'video')
  const fileAttachments = attachments.filter((attachment) => attachment.kind === 'file')

  return (
    <div className="space-y-3">
      {visualAttachments.length > 0 ? (
        <div className={cn('grid gap-2', visualAttachments.length === 1 ? 'grid-cols-1' : 'grid-cols-2')}>
          {visualAttachments.map((attachment, index) => (
            <div key={`${attachment.url}-${index}`} className="relative overflow-hidden rounded-2xl border bg-muted/20">
              {attachment.kind === 'image' ? (
                <img
                  src={attachment.url}
                  alt={attachment.name || 'Attachment preview'}
                  className="aspect-video h-full w-full object-cover"
                />
              ) : (
                <video
                  src={attachment.url}
                  controls
                  preload="metadata"
                  className="aspect-video h-full w-full bg-black object-cover"
                />
              )}
              {removable && onRemove ? (
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="absolute right-2 top-2 h-8 w-8 rounded-full shadow-sm"
                  onClick={() => onRemove(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {fileAttachments.length > 0 ? (
        <div className="space-y-2">
          {fileAttachments.map((attachment, index) => {
            const fileIndex = attachments.findIndex((candidate) => candidate.url === attachment.url)

            return (
              <div
                key={`${attachment.url}-${index}`}
                className="flex items-center gap-3 rounded-2xl border border-border/60 bg-muted/20 px-4 py-3"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-background shadow-sm">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <a
                    href={attachment.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block truncate text-sm font-medium hover:underline"
                  >
                    {attachment.name || 'Attachment'}
                  </a>
                  <p className="text-xs text-muted-foreground">
                    {attachment.mimeType || 'File'}
                    {attachment.size ? ` • ${Math.max(1, Math.round(attachment.size / 1024))} KB` : ''}
                  </p>
                </div>
                {removable && onRemove ? (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 rounded-full"
                    onClick={() => onRemove(fileIndex)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

function MemberRow({
  member,
  isOnline,
}: {
  member: CommunityMember
  isOnline: boolean
}) {
  return (
    <Link
      href={`/profile/${member.id}`}
      className="flex items-center gap-3 rounded-2xl border border-transparent px-3 py-3 transition-colors hover:border-border/60 hover:bg-muted/30"
    >
      <div className="relative">
        <Avatar className="h-10 w-10">
          <AvatarImage src={member.avatar_url || undefined} alt={member.full_name || 'Member'} />
          <AvatarFallback>{getInitials(member.full_name)}</AvatarFallback>
        </Avatar>
        <span
          className={cn(
            'absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background',
            isOnline ? 'bg-emerald-500' : 'bg-muted'
          )}
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{member.full_name || 'Community member'}</p>
        <p className="truncate text-xs text-muted-foreground">{member.profession || roleLabel(member.role) || 'Member'}</p>
      </div>
    </Link>
  )
}

function AudiencePicker({
  members,
  currentUserId,
  searchValue,
  onSearchChange,
  selectedIds,
  onToggle,
}: {
  members: CommunityMember[]
  currentUserId: string | null
  searchValue: string
  onSearchChange: (value: string) => void
  selectedIds: string[]
  onToggle: (memberId: string) => void
}) {
  const filteredMembers = useMemo(() => {
    const query = searchValue.trim().toLowerCase()
    return members
      .filter((member) => member.id !== currentUserId)
      .filter((member) => {
        if (!query) return true
        const haystack = [member.full_name, member.profession, member.role].filter(Boolean).join(' ').toLowerCase()
        return haystack.includes(query)
      })
  }, [currentUserId, members, searchValue])

  return (
    <div className="space-y-3 rounded-2xl border border-border/60 bg-muted/20 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Selected friends</p>
          <p className="text-xs text-muted-foreground">Pick exactly who can see this post.</p>
        </div>
        <Badge variant="secondary" className="rounded-full">
          {selectedIds.length}
        </Badge>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search members"
          className="rounded-full pl-9"
        />
      </div>

      <ScrollArea className="h-44">
        <div className="space-y-2 pr-2">
          {filteredMembers.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border/60 px-3 py-6 text-center text-sm text-muted-foreground">
              No members match that search.
            </p>
          ) : (
            filteredMembers.map((member) => {
              const checked = selectedIds.includes(member.id)
              return (
                <label
                  key={member.id}
                  className="flex cursor-pointer items-center gap-3 rounded-2xl border border-transparent px-3 py-2 transition-colors hover:border-border/60 hover:bg-background"
                >
                  <Checkbox checked={checked} onCheckedChange={() => onToggle(member.id)} />
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={member.avatar_url || undefined} alt={member.full_name || 'Member'} />
                    <AvatarFallback>{getInitials(member.full_name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{member.full_name || 'Community member'}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {member.profession || roleLabel(member.role) || 'Member'}
                    </p>
                  </div>
                </label>
              )
            })
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

export function EnhancedSocialFeed() {
  const { userId, profile, resolvedRole } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [composerMode, setComposerMode] = useState<'general' | 'announcement'>(
    searchParams.get('feed') === 'announcements' ? 'announcement' : 'general'
  )
  const [activeFeed, setActiveFeed] = useState<FeedFilter>(resolveInitialFeed(searchParams.get('feed')))
  const [searchInput, setSearchInput] = useState(searchParams.get('q') ?? '')
  const [memberSearch, setMemberSearch] = useState('')
  const [newPostContent, setNewPostContent] = useState('')
  const [attachments, setAttachments] = useState<FeedMediaAttachment[]>([])
  const [composerVisibility, setComposerVisibility] = useState<ComposerVisibility>('public')
  const [selectedAudienceIds, setSelectedAudienceIds] = useState<string[]>([])
  const [audienceSearch, setAudienceSearch] = useState('')
  const [isPosting, setIsPosting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [editTargetPost, setEditTargetPost] = useState<FeedPost | null>(null)
  const [editContent, setEditContent] = useState('')
  const [editVisibility, setEditVisibility] = useState<ComposerVisibility>('public')
  const [editSelectedAudienceIds, setEditSelectedAudienceIds] = useState<string[]>([])
  const [editAudienceSearch, setEditAudienceSearch] = useState('')
  const [realtimeOnline, setRealtimeOnline] = useState<Record<string, any>>({})
  const debouncedSearch = useDebouncedValue(searchInput, 250)
  const traceIdRef = useRef<string>(createClientTraceId())
  const observerRef = useRef<HTMLDivElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const profileProfession = (profile as { profession?: string | null } | null)?.profession ?? null

  const getKey = useCallback((pageIndex: number, previousPageData: FeedPage | null) => {
    if (!userId) return null
    if (previousPageData && !previousPageData.nextCursor) return null

    const params = new URLSearchParams({ limit: '10' })
    if (activeFeed !== 'all') params.set('feed', activeFeed)
    if (debouncedSearch.trim()) params.set('q', debouncedSearch.trim())
    if (pageIndex > 0 && previousPageData?.nextCursor) {
      params.set('cursor', previousPageData.nextCursor)
    }

    return `/api/feed/posts?${params.toString()}`
  }, [activeFeed, debouncedSearch, userId])

  const {
    data: feedPages,
    mutate: mutateFeed,
    size,
    setSize,
    error: feedError,
    isLoading: feedLoading,
    isValidating: feedValidating,
  } = useSWRInfinite<FeedPage>(getKey, fetcher, {
    revalidateFirstPage: false,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    persistSize: true,
    revalidateAll: false,
    dedupingInterval: 1500,
  })

  const { data: membersData, mutate: mutateMembers } = useSWR<{ data: CommunityMember[] }>(
    userId ? '/api/users/community' : null,
    fetcher
  )

  useEffect(() => {
    if (userId) {
      setSize(1)
    }
  }, [activeFeed, debouncedSearch, setSize, userId])

  useEffect(() => {
    startTransition(() => {
      router.replace(buildFeedUrl(pathname, activeFeed, debouncedSearch), { scroll: false })
    })
  }, [activeFeed, debouncedSearch, pathname, router])

  const posts = useMemo(() => {
    const rawPosts = feedPages?.flatMap((page) => page.data) ?? []
    return Array.from(new Map(rawPosts.map((post) => [post.id, post])).values())
  }, [feedPages])

  const members = membersData?.data ?? []
  const realtimeOnlineIds = useMemo(() => new Set(Object.keys(realtimeOnline)), [realtimeOnline])

  const memberRows = useMemo(() => {
    const query = memberSearch.trim().toLowerCase()
    return members
      .map((member, index) => ({
        member,
        isOnline: isMemberOnline(member, realtimeOnlineIds),
        index,
      }))
      .filter(({ member }) => {
        if (!query) return true
        const haystack = [member.full_name, member.profession, member.role].filter(Boolean).join(' ').toLowerCase()
        return haystack.includes(query)
      })
      .sort((left, right) => Number(right.isOnline) - Number(left.isOnline) || left.index - right.index)
  }, [memberSearch, members, realtimeOnlineIds])

  const onlineMemberCount = useMemo(
    () => members.filter((member) => isMemberOnline(member, realtimeOnlineIds)).length,
    [members, realtimeOnlineIds]
  )
  const myLoadedPostCount = useMemo(
    () => posts.filter((post) => post.author_id === userId).length,
    [posts, userId]
  )

  const hasMore = Boolean(feedPages?.[feedPages.length - 1]?.nextCursor)
  const isLoadingMore = feedValidating && size > 1

  const patchFeed = useCallback((patcher: (post: FeedPost) => FeedPost) => {
    mutateFeed((pages) => {
      if (!pages) return pages
      return pages.map((page) => ({
        ...page,
        data: page.data.map(patcher),
      }))
    }, false)
  }, [mutateFeed])

  const upsertFeedPost = useCallback((nextPost: FeedPost, options?: { prepend?: boolean }) => {
    mutateFeed((pages) => {
      if (!pages || pages.length === 0) {
        return [{ data: [nextPost], userLikes: [], userBookmarks: [], nextCursor: null, totalCount: null }]
      }

      let found = false
      const nextPages = pages.map((page) => {
        const data = page.data
          .map((post) => {
            if (post.id !== nextPost.id) return post
            found = true
            return nextPost
          })
          .filter((post, index, array) => array.findIndex((candidate) => candidate.id === post.id) === index)

        return { ...page, data }
      })

      if (found && options?.prepend) {
        return [
          {
            ...nextPages[0],
            data: [nextPost, ...nextPages[0].data.filter((post) => post.id !== nextPost.id)],
          },
          ...nextPages.slice(1),
        ]
      }

      if (found || !options?.prepend) {
        return nextPages
      }

      return [
        {
          ...nextPages[0],
          data: [nextPost, ...nextPages[0].data.filter((post) => post.id !== nextPost.id)],
        },
        ...nextPages.slice(1),
      ]
    }, false)
  }, [mutateFeed])

  const removeFeedPost = useCallback((postId: string) => {
    mutateFeed((pages) => {
      if (!pages) return pages
      return pages.map((page) => ({
        ...page,
        data: page.data.filter((post) => post.id !== postId),
      }))
    }, false)
  }, [mutateFeed])

  const refreshPostFromServer = useCallback(async (postId: string, options?: { prepend?: boolean; removeIfMissing?: boolean }) => {
    try {
      const response = await fetch(`/api/feed/posts/${postId}`, { cache: 'no-store' })
      let payload: { post?: FeedPost; error?: string } | null = null

      try {
        payload = await response.json()
      } catch {
        payload = null
      }

      if (response.status === 404) {
        if (options?.removeIfMissing) {
          removeFeedPost(postId)
        }
        return
      }

      if (!response.ok || !payload?.post) {
        throw new Error(payload?.error || 'Failed to refresh post')
      }

      upsertFeedPost(payload.post, { prepend: options?.prepend })
    } catch {
      mutateFeed()
    }
  }, [mutateFeed, removeFeedPost, upsertFeedPost])

  const optimisticAddPost = useCallback((
    content: string,
    nextAttachments: FeedMediaAttachment[],
    postType: FeedPost['post_type'],
    visibility: ComposerVisibility,
    selectedIds: string[]
  ) => {
    const optimisticId = `optimistic-${Date.now()}`
    const metadata = applyAudienceToMetadata(
      nextAttachments.length > 0 ? { attachments: nextAttachments } : {},
      visibility,
      selectedIds
    )
    const optimisticPost: FeedPost = {
      id: optimisticId,
      content,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      author_id: userId || 'unknown',
      image_url: nextAttachments.find((attachment) => attachment.kind === 'image')?.url ?? null,
      post_type: postType,
      category: postType === 'announcement' ? 'announcement' : 'general',
      visibility: normalizeStoredVisibility(visibility, metadata),
      is_published: true,
      mosque_id: null,
      metadata,
      pinned_at: null,
      media: nextAttachments,
      likes_count: 0,
      comments_count: 0,
      profiles: {
        id: userId || 'unknown',
        full_name: profile?.full_name || 'You',
        avatar_url: profile?.avatar_url || null,
        profession: (profile as any)?.profession || null,
        role: resolvedRole || profile?.role || 'member',
      },
      viewer: {
        liked: false,
        bookmarked: false,
      },
    }

    mutateFeed((pages) => {
      if (!pages || pages.length === 0) {
        return [{ data: [optimisticPost], userLikes: [], userBookmarks: [], nextCursor: null, totalCount: null }]
      }

      return [{ ...pages[0], data: [optimisticPost, ...pages[0].data] }, ...pages.slice(1)]
    }, false)

    return optimisticId
  }, [mutateFeed, profile, resolvedRole, userId])

  const applyFeedSearch = useCallback((term: string) => {
    setActiveFeed('all')
    setSearchInput(term)
    document.getElementById('feed-search-input')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [])

  const toggleComposerAudienceMember = useCallback((memberId: string) => {
    setSelectedAudienceIds((current) =>
      current.includes(memberId) ? current.filter((id) => id !== memberId) : [...current, memberId]
    )
  }, [])

  const toggleEditAudienceMember = useCallback((memberId: string) => {
    setEditSelectedAudienceIds((current) =>
      current.includes(memberId) ? current.filter((id) => id !== memberId) : [...current, memberId]
    )
  }, [])

  const handleRealtimeEvent = useCallback((event: RealtimeEventEnvelope) => {
    observeClientMetric('feed.realtime.events_received.total', 1, { eventType: event.eventType })
    logClientTrace({
      traceId: String((event.payload as Record<string, unknown>)?.traceId ?? traceIdRef.current),
      message: 'Feed consumed realtime event',
      tags: { eventType: event.eventType, entityId: event.entityId },
    })
    const actorUserId = resolveRealtimeActorUserId(event)

    if (event.eventType === 'post.liked' || event.eventType === 'post.unliked') {
      if (actorUserId && actorUserId === userId) return
      const postId = String(event.payload.postId ?? event.entityId)
      if (!postId) return
      void refreshPostFromServer(postId)
      return
    }

    if (event.eventType === 'comment.created') {
      if (actorUserId && actorUserId === userId) return
      const postId = String(event.payload.postId ?? '')
      if (!postId) return
      void refreshPostFromServer(postId)
      return
    }

    if (event.eventType === 'post.created') {
      if (actorUserId && actorUserId === userId) {
        return
      }
      const postId = String(event.payload.postId ?? event.entityId)
      if (!postId) return
      void refreshPostFromServer(postId, { prepend: true })
      return
    }

    if (event.eventType === 'post.updated') {
      const postId = String(event.payload.postId ?? event.entityId)
      if (!postId) return
      void refreshPostFromServer(postId, { removeIfMissing: true })
      return
    }

    if (event.eventType === 'post.deleted') {
      const postId = String(event.payload.postId ?? event.entityId)
      if (!postId) return
      removeFeedPost(postId)
      return
    }

    if (event.eventType === 'follow.created' || event.eventType === 'follow.deleted') {
      mutateMembers()
    }
  }, [mutateFeed, mutateMembers, refreshPostFromServer, removeFeedPost, userId])

  useEffect(() => {
    const returnContext = resolveFeedReturnContext()
    trackFeedFunnelEvent({ funnel: 'feed_engagement', step: 'view', traceId: traceIdRef.current })
    if (returnContext.isReturn) {
      trackFeedFunnelEvent({
        funnel: 'feed_engagement',
        step: 'return',
        traceId: traceIdRef.current,
        metadata: { minutesSinceLastView: returnContext.minutesSinceLastView },
      })
    }
  }, [])

  useRealtimeGateway({
    enabled: Boolean(userId),
    feedStreamId: 'home',
    onEvent: handleRealtimeEvent,
    onError: () => mutateFeed(),
  })

  usePresence({
    channelName: 'community-presence',
    userId: userId || '',
    userInfo: {
      full_name: profile?.full_name,
      avatar_url: profile?.avatar_url,
      role: resolvedRole || profile?.role,
    },
    enabled: Boolean(userId),
    onSync: (state) => {
      const flattened = Object.entries(state).reduce<Record<string, any>>((acc, [key, presences]) => {
        if (presences.length > 0) acc[key] = presences[0]
        return acc
      }, {})
      setRealtimeOnline(flattened)
    },
  })

  useEffect(() => {
    if (!observerRef.current || !hasMore || feedLoading) return
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        setSize((previous) => previous + 1)
      }
    }, { rootMargin: '240px' })

    observer.observe(observerRef.current)
    return () => observer.disconnect()
  }, [feedLoading, hasMore, setSize])

  useEffect(() => {
    const highlightedPostId = searchParams.get('post')
    if (!highlightedPostId) return

    const timeout = window.setTimeout(() => {
      document.getElementById(`feed-post-${highlightedPostId}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }, 150)

    return () => window.clearTimeout(timeout)
  }, [posts.length, searchParams])

  const uploadFiles = useCallback(async (fileList: FileList | File[]) => {
    const files = Array.from(fileList)
    if (files.length === 0) return

    const remainingSlots = MAX_FEED_ATTACHMENTS - attachments.length
    if (remainingSlots <= 0) {
      toast.error(`You can attach up to ${MAX_FEED_ATTACHMENTS} files per post`)
      return
    }

    const selectedFiles = files.slice(0, remainingSlots)
    if (files.length > remainingSlots) {
      toast.message(`Only the first ${remainingSlots} file(s) were added`)
    }

    setIsUploading(true)
    try {
      const uploadedAttachments: FeedMediaAttachment[] = []
      for (const file of selectedFiles) {
        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch('/api/upload', { method: 'POST', body: formData })
        const payload = await response.json()
        if (!response.ok) {
          throw new Error(payload.error || 'Upload failed')
        }

        const nextAttachment = normalizeFeedAttachments([payload.attachment || payload])[0]
        if (!nextAttachment) {
          throw new Error('Upload succeeded but the attachment payload was invalid')
        }

        uploadedAttachments.push(nextAttachment)
      }

      setAttachments((current) => [...current, ...uploadedAttachments].slice(0, MAX_FEED_ATTACHMENTS))
      toast.success(uploadedAttachments.length === 1 ? 'Attachment uploaded' : 'Attachments uploaded')
    } catch (error: any) {
      toast.error(error?.message || 'Failed to upload attachment')
    } finally {
      setIsUploading(false)
    }
  }, [attachments.length])

  const handleCreatePost = useCallback(async () => {
    if (!userId) {
      toast.error('Please sign in to post')
      return
    }

    const trimmedContent = newPostContent.trim()
    if (!trimmedContent && attachments.length === 0) {
      toast.error('Write something or attach media to post')
      return
    }

    if (composerVisibility === 'selected' && selectedAudienceIds.length === 0) {
      toast.error('Choose at least one friend before sharing with selected friends')
      return
    }

    const postType: FeedPost['post_type'] =
      composerMode === 'announcement'
        ? 'announcement'
        : attachments[0]?.kind === 'video'
          ? 'video'
          : attachments[0]?.kind === 'image'
            ? 'image'
            : attachments[0]?.kind === 'file'
              ? 'file'
              : 'text'

    setIsPosting(true)
    trackFeedFunnelEvent({
      funnel: 'feed_engagement',
      step: 'interact',
      traceId: traceIdRef.current,
      metadata: { action: 'create_post', postType, mediaCount: attachments.length, visibility: composerVisibility },
    })

    const metadata = applyAudienceToMetadata(
      attachments.length > 0 ? { attachments } : {},
      composerVisibility,
      selectedAudienceIds
    )

    const optimisticPostId = optimisticAddPost(trimmedContent, attachments, postType, composerVisibility, selectedAudienceIds)

    try {
      const response = await fetch('/api/feed/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: trimmedContent,
          post_type: postType,
          category: composerMode === 'announcement' ? 'announcement' : 'general',
          visibility: composerVisibility,
          metadata,
          media: attachments,
        }),
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to create post')
      }

      mutateFeed((pages) => {
        if (!pages) return pages

        return pages.map((page, pageIndex) => {
          const nextData = page.data
            .map((post) => (post.id === optimisticPostId && payload.post ? (payload.post as FeedPost) : post))
            .filter((post, index, array) => array.findIndex((candidate) => candidate.id === post.id) === index)

          return pageIndex === 0 ? { ...page, data: nextData } : { ...page, data: nextData }
        })
      }, false)

      setNewPostContent('')
      setAttachments([])
      setComposerVisibility('public')
      setSelectedAudienceIds([])
      setAudienceSearch('')
      toast.success(composerMode === 'announcement' ? 'Announcement published' : 'Post published')
      if (!payload.post) {
        mutateFeed()
      }
    } catch (error: any) {
      mutateFeed((pages) => {
        if (!pages) return pages
        return pages.map((page) => ({
          ...page,
          data: page.data.filter((post) => post.id !== optimisticPostId),
        }))
      }, false)
      toast.error(error?.message || 'Failed to create post')
      mutateFeed()
    } finally {
      setIsPosting(false)
    }
  }, [attachments, composerMode, composerVisibility, mutateFeed, newPostContent, optimisticAddPost, selectedAudienceIds, userId])

  const handleLike = useCallback(async (postId: string, isLiked: boolean) => {
    if (!userId) {
      toast.error('Please sign in to like posts')
      return
    }

    patchFeed((post) =>
      post.id === postId
        ? {
            ...post,
            likes_count: Math.max(0, post.likes_count + (isLiked ? -1 : 1)),
            viewer: { ...post.viewer, liked: !isLiked },
          }
        : post
    )

    try {
      const response = await fetch(`/api/posts/${postId}/like`, { method: isLiked ? 'DELETE' : 'POST' })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Failed to update like')
      void refreshPostFromServer(postId)
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update like')
      mutateFeed()
    }
  }, [mutateFeed, patchFeed, refreshPostFromServer, userId])

  const handleBookmark = useCallback(async (postId: string, isBookmarked: boolean) => {
    patchFeed((post) =>
      post.id === postId
        ? {
            ...post,
            viewer: { ...post.viewer, bookmarked: !isBookmarked },
          }
        : post
    )

    try {
      const response = await fetch('/api/feed/bookmarks', {
        method: isBookmarked ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Failed to update bookmark')
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update bookmark')
      mutateFeed()
    }
  }, [mutateFeed, patchFeed])

  const handleCommentCreate = useCallback(async (postId: string, content: string) => {
    const trimmedContent = content.trim()
    if (!trimmedContent) return

    patchFeed((post) =>
      post.id === postId ? { ...post, comments_count: post.comments_count + 1 } : post
    )

    try {
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: trimmedContent }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Failed to comment')
      void refreshPostFromServer(postId)
    } catch (error: any) {
      toast.error(error?.message || 'Failed to comment')
      mutateFeed()
    }
  }, [mutateFeed, patchFeed, refreshPostFromServer])

  const handleUpdatePost = useCallback(async () => {
    if (!editTargetPost) return
    const trimmedContent = editContent.trim()
    if (!trimmedContent && editTargetPost.media.length === 0) {
      toast.error('Post content cannot be empty')
      return
    }

    if (editVisibility === 'selected' && editSelectedAudienceIds.length === 0) {
      toast.error('Choose at least one friend before sharing with selected friends')
      return
    }

    const metadata = applyAudienceToMetadata(editTargetPost.metadata, editVisibility, editSelectedAudienceIds)
    const storedVisibility = normalizeStoredVisibility(editVisibility, metadata)

    patchFeed((post) =>
      post.id === editTargetPost.id
        ? { ...post, content: trimmedContent, visibility: storedVisibility, metadata }
        : post
    )

    try {
      const response = await fetch(`/api/feed/posts/${editTargetPost.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: trimmedContent,
          visibility: editVisibility,
          metadata,
        }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Failed to update post')

      toast.success('Post updated')
      if (payload.post) {
        upsertFeedPost(payload.post as FeedPost)
      } else {
        mutateFeed()
      }
      setEditTargetPost(null)
      setEditContent('')
      setEditVisibility('public')
      setEditSelectedAudienceIds([])
      setEditAudienceSearch('')
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update post')
      mutateFeed()
    }
  }, [editContent, editSelectedAudienceIds, editTargetPost, editVisibility, mutateFeed, patchFeed, upsertFeedPost])

  const handleDeletePost = useCallback(async (postId: string) => {
    removeFeedPost(postId)

    try {
      const response = await fetch(`/api/feed/posts/${postId}`, { method: 'DELETE' })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Failed to delete post')
      toast.success('Post deleted')
    } catch (error: any) {
      toast.error(error?.message || 'Failed to delete post')
      mutateFeed()
    }
  }, [mutateFeed, removeFeedPost])

  const handleCopyLink = useCallback(async (post: FeedPost) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/feed?post=${post.id}`)
      toast.success('Post link copied')
    } catch {
      toast.error('Failed to copy link')
    }
  }, [])

  if (!userId) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/70 px-6 py-20 text-center">
        <Users className="mb-4 h-14 w-14 text-muted-foreground" />
        <h2 className="text-2xl font-semibold">Join the community feed</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Sign in to post updates, upload media, comment on community news, and see who is around right now.
        </p>
        <div className="mt-6 flex gap-3">
          <Button asChild>
            <Link href="/sign-in">Sign In</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/sign-up">Create Account</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[240px_minmax(0,1fr)_300px]">
      <aside className="hidden xl:block">
        <div className="sticky top-20 space-y-4">
          <Card className="border-border/60 shadow-sm">
            <CardContent className="space-y-4 p-5">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || 'You'} />
                  <AvatarFallback>{getInitials(profile?.full_name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{profile?.full_name || 'You'}</p>
                  <p className="truncate text-xs text-muted-foreground">@{profile?.username || 'member'}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="rounded-full">
                    {roleLabel(resolvedRole || profile?.role) || 'Member'}
                  </Badge>
                  {profileProfession ? <Badge variant="outline" className="rounded-full">{profileProfession}</Badge> : null}
                </div>
                <p className="text-sm leading-6 text-muted-foreground">
                  {profile?.bio || 'Your profile summary stays here while the main column focuses on the conversation.'}
                </p>
              </div>

              <div className="space-y-2 rounded-2xl border border-border/60 bg-muted/15 p-3">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">My posts</span>
                  <span className="font-semibold">{myLoadedPostCount}</span>
                </div>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">Members online</span>
                  <span className="font-semibold">{onlineMemberCount}</span>
                </div>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">Visibility</span>
                  <span className="font-semibold">Community</span>
                </div>
              </div>

              <div className="rounded-2xl border border-border/60 bg-background px-4 py-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-2 font-medium text-foreground">
                  <CalendarDays className="h-4 w-4" />
                  Joined
                </div>
                <p className="mt-1">
                  {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'Profile active'}
                </p>
              </div>

              <div className="flex gap-2">
                <Button asChild className="flex-1 rounded-full">
                  <Link href="/profile">View profile</Link>
                </Button>
                <Button asChild variant="outline" className="flex-1 rounded-full">
                  <Link href="/settings">Settings</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </aside>

      <main className="space-y-5">
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-4 sm:p-5">
            <div className="flex gap-3">
              <Avatar className="mt-1 h-11 w-11 shrink-0">
                <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || 'You'} />
                <AvatarFallback>{getInitials(profile?.full_name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" variant={composerMode === 'general' ? 'default' : 'outline'} size="sm" className="rounded-full" onClick={() => setComposerMode('general')}>
                    Post
                  </Button>
                  <Button type="button" variant={composerMode === 'announcement' ? 'default' : 'outline'} size="sm" className="rounded-full" onClick={() => setComposerMode('announcement')}>
                    <Megaphone className="mr-1.5 h-4 w-4" />
                    Announcement
                  </Button>
                </div>

                <Textarea
                  id="new-post-box"
                  value={newPostContent}
                  onChange={(event) => setNewPostContent(event.target.value)}
                  placeholder={composerMode === 'announcement' ? 'Share an announcement with the community...' : "Share an update, add context to your media, or mention someone with @name..."}
                  className="min-h-[120px] resize-none border-none px-0 text-base shadow-none focus-visible:ring-0"
                />

                <FeedAttachmentGrid attachments={attachments} removable onRemove={(index) => setAttachments((current) => current.filter((_, currentIndex) => currentIndex !== index))} />

                <div className="space-y-3 rounded-2xl border border-border/60 bg-muted/15 p-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-2">
                      <VisibilityStatusIcon value={composerVisibility} />
                      <div>
                        <p className="text-sm font-medium">Who can see this post?</p>
                        <p className="text-xs text-muted-foreground">{visibilityHint(composerVisibility)}</p>
                      </div>
                    </div>
                    <Select
                      value={composerVisibility}
                      onValueChange={(value) => setComposerVisibility(value as ComposerVisibility)}
                    >
                      <SelectTrigger className="w-full rounded-full sm:w-[210px]">
                        <SelectValue placeholder="Choose visibility" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">Community</SelectItem>
                        <SelectItem value="selected">Selected friends</SelectItem>
                        <SelectItem value="private">Only me</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {composerVisibility === 'selected' ? (
                    <AudiencePicker
                      members={members}
                      currentUserId={userId}
                      searchValue={audienceSearch}
                      onSearchChange={setAudienceSearch}
                      selectedIds={selectedAudienceIds}
                      onToggle={toggleComposerAudienceMember}
                    />
                  ) : null}
                </div>

                <div className="flex flex-col gap-3 border-t border-border/60 pt-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => fileInputRef.current?.click()} disabled={isUploading || attachments.length >= MAX_FEED_ATTACHMENTS}>
                      {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Paperclip className="mr-2 h-4 w-4" />}
                      Add media
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept={FEED_UPLOAD_ACCEPT}
                      className="hidden"
                      onChange={(event) => {
                        if (event.target.files) {
                          void uploadFiles(event.target.files)
                        }
                        event.target.value = ''
                      }}
                    />
                    <p className="text-xs text-muted-foreground">{attachments.length}/{MAX_FEED_ATTACHMENTS} attachments</p>
                  </div>

                  <Button
                    type="button"
                    onClick={() => void handleCreatePost()}
                    disabled={
                      isPosting ||
                      isUploading ||
                      (!newPostContent.trim() && attachments.length === 0) ||
                      (composerVisibility === 'selected' && selectedAudienceIds.length === 0)
                    }
                    className="rounded-full px-5"
                  >
                    {isPosting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    {composerMode === 'announcement' ? 'Publish announcement' : 'Post update'}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardContent className="flex flex-col gap-3 p-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
            {([
              ['all', 'All'],
              ['general', 'General'],
              ['announcements', 'Announcements'],
            ] as const).map(([feedValue, label]) => (
              <Button
                key={feedValue}
                type="button"
                variant={activeFeed === feedValue ? 'default' : 'outline'}
                size="sm"
                className="rounded-full px-4 whitespace-nowrap"
                onClick={() => {
                  setActiveFeed(feedValue)
                  if (feedValue === 'announcements') setComposerMode('announcement')
                }}
              >
                {label}
              </Button>
            ))}
            </div>

            <div className="relative w-full lg:max-w-[280px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="feed-search-input"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search the feed"
                className="rounded-full pl-9"
              />
              {searchInput ? (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {feedError ? (
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="p-10 text-center">
                <p className="text-lg font-semibold">Unable to load the feed</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  The latest posts could not be loaded right now. Try refreshing the feed.
                </p>
                <Button className="mt-5 rounded-full" variant="outline" onClick={() => mutateFeed()}>
                  Refresh feed
                </Button>
              </CardContent>
            </Card>
          ) : feedLoading ? (
            <>
              <PostSkeleton />
              <PostSkeleton />
              <PostSkeleton />
            </>
          ) : posts.length === 0 ? (
            <Card className="border-dashed border-border/70">
              <CardContent className="p-12 text-center">
                <MessageCircle className="mx-auto h-12 w-12 text-muted-foreground/60" />
                <h3 className="mt-4 text-xl font-semibold">Nothing has been posted here yet</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Start the conversation with an update, a file, a photo, or an announcement for the community.
                </p>
                <Button className="mt-5 rounded-full" onClick={() => document.getElementById('new-post-box')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>
                  Create the first post
                </Button>
              </CardContent>
            </Card>
          ) : (
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                canManage={post.author_id === userId}
                highlighted={searchParams.get('post') === post.id}
                onLike={() => void handleLike(post.id, post.viewer.liked)}
                onBookmark={() => void handleBookmark(post.id, post.viewer.bookmarked)}
                onCopyLink={() => void handleCopyLink(post)}
                onDelete={() => void handleDeletePost(post.id)}
                onEdit={() => {
                  setEditTargetPost(post)
                  setEditContent(post.content)
                  setEditVisibility(resolveComposerVisibility(post))
                  setEditSelectedAudienceIds(getSelectedViewerIds(post.metadata))
                  setEditAudienceSearch('')
                }}
                onComment={handleCommentCreate}
                onSearchTerm={applyFeedSearch}
              />
            ))
          )}

          {isLoadingMore ? (
            <>
              <PostSkeleton />
              <PostSkeleton />
            </>
          ) : null}

          <div ref={observerRef} className="h-4" />
        </div>
      </main>

      <aside className="hidden xl:block">
        <Card className="sticky top-20 border-border/60 shadow-sm">
          <CardHeader className="space-y-3 border-b border-border/60 pb-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Members</h2>
                <p className="text-sm text-muted-foreground">Online members stay pinned to the top while the list stays calm.</p>
              </div>
              <Badge variant="secondary" className="rounded-full">
                {onlineMemberCount} online
              </Badge>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={memberSearch} onChange={(event) => setMemberSearch(event.target.value)} placeholder="Search members" className="rounded-full pl-9" />
            </div>
          </CardHeader>
          <ScrollArea className="h-[calc(100vh-220px)]">
            <div className="space-y-1 p-3">
              {memberRows.length === 0 ? (
                <p className="rounded-2xl px-3 py-6 text-center text-sm text-muted-foreground">No members match that search.</p>
              ) : (
                memberRows.map(({ member, isOnline }) => {
                  return <MemberRow key={member.id} member={member} isOnline={isOnline} />
                })
              )}
            </div>
          </ScrollArea>
        </Card>
      </aside>

      <Dialog
        open={Boolean(editTargetPost)}
        onOpenChange={(open) => {
          if (!open) {
            setEditTargetPost(null)
            setEditContent('')
            setEditVisibility('public')
            setEditSelectedAudienceIds([])
            setEditAudienceSearch('')
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit post</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea value={editContent} onChange={(event) => setEditContent(event.target.value)} className="min-h-[150px] resize-none" />
            {editTargetPost?.media?.length ? <FeedAttachmentGrid attachments={editTargetPost.media} /> : null}
            <div className="space-y-3 rounded-2xl border border-border/60 bg-muted/15 p-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-2">
                  <VisibilityStatusIcon value={editVisibility} />
                  <div>
                    <p className="text-sm font-medium">Post visibility</p>
                    <p className="text-xs text-muted-foreground">{visibilityHint(editVisibility)}</p>
                  </div>
                </div>
                <Select
                  value={editVisibility}
                  onValueChange={(value) => setEditVisibility(value as ComposerVisibility)}
                >
                  <SelectTrigger className="w-full rounded-full sm:w-[210px]">
                    <SelectValue placeholder="Choose visibility" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Community</SelectItem>
                    <SelectItem value="selected">Selected friends</SelectItem>
                    <SelectItem value="private">Only me</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {editVisibility === 'selected' ? (
                <AudiencePicker
                  members={members}
                  currentUserId={userId}
                  searchValue={editAudienceSearch}
                  onSearchChange={setEditAudienceSearch}
                  selectedIds={editSelectedAudienceIds}
                  onToggle={toggleEditAudienceMember}
                />
              ) : null}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setEditTargetPost(null)
                  setEditContent('')
                  setEditVisibility('public')
                  setEditSelectedAudienceIds([])
                  setEditAudienceSearch('')
                }}
              >
                Cancel
              </Button>
              <Button onClick={() => void handleUpdatePost()}>
                Save changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function PostCard({
  post,
  canManage,
  highlighted,
  onLike,
  onBookmark,
  onCopyLink,
  onDelete,
  onEdit,
  onComment,
  onSearchTerm,
}: {
  post: FeedPost
  canManage: boolean
  highlighted: boolean
  onLike: () => void
  onBookmark: () => void
  onCopyLink: () => void
  onDelete: () => void
  onEdit: () => void
  onComment: (postId: string, content: string) => Promise<void>
  onSearchTerm: (term: string) => void
}) {
  const [showComments, setShowComments] = useState(false)
  const [commentInput, setCommentInput] = useState('')
  const { profile } = useAuth()

  const { data: commentsResponse, mutate: mutateComments } = useSWR<{ comments: PostComment[] }>(
    showComments ? `/api/posts/${post.id}/comments` : null,
    fetcher,
    { revalidateOnFocus: false }
  )

  const comments = commentsResponse?.comments ?? []
  const profileName = post.profiles?.full_name || 'Community member'
  const displayRole = roleLabel(post.profiles?.role)
  const audience = resolveFeedAudience({ visibility: post.visibility, metadata: post.metadata })
  const audienceLabel = visibilityLabel(audience === 'followers' ? 'followers' : audience === 'selected' ? 'selected' : audience === 'private' ? 'private' : 'public')

  const submitComment = async () => {
    const trimmed = commentInput.trim()
    if (!trimmed) return

    const optimisticComment: PostComment = {
      id: `temp-${Date.now()}`,
      content: trimmed,
      created_at: new Date().toISOString(),
      author_id: profile?.id || 'self',
      author: {
        id: profile?.id || 'self',
        full_name: profile?.full_name || 'You',
        avatar_url: profile?.avatar_url || null,
        role: profile?.role || 'member',
      },
    }

    mutateComments((current) => ({ comments: [...(current?.comments ?? []), optimisticComment] }), false)
    setCommentInput('')
    await onComment(post.id, trimmed)
    mutateComments()
  }

  return (
    <Card id={`feed-post-${post.id}`} className={cn('border-border/60 shadow-sm transition-shadow hover:shadow-md', highlighted && 'ring-2 ring-primary/20')}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link href={`/profile/${post.author_id}`}>
              <Avatar className="h-11 w-11">
                <AvatarImage src={post.profiles?.avatar_url || undefined} alt={profileName} />
                <AvatarFallback>{getInitials(profileName)}</AvatarFallback>
              </Avatar>
            </Link>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/profile/${post.author_id}`} className="truncate text-sm font-semibold hover:underline">
                  {profileName}
                </Link>
                {displayRole ? <Badge variant="secondary" className="rounded-full text-[11px]">{displayRole}</Badge> : null}
                <Badge variant="outline" className="rounded-full text-[11px]">{audienceLabel}</Badge>
                {isAnnouncement(post) ? <Badge className="rounded-full bg-amber-500/10 text-amber-700 hover:bg-amber-500/10 dark:text-amber-300">{post.pinned_at ? 'Pinned announcement' : 'Announcement'}</Badge> : null}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>{post.profiles?.profession || displayRole || 'Member'}</span>
                <span>&middot;</span>
                <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
              </div>
            </div>
          </div>

          {canManage ? (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={onEdit}>
                <Edit3 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-destructive hover:text-destructive" onClick={onDelete}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <FormattedContent content={post.content} onSearchTerm={onSearchTerm} />
        <FeedAttachmentGrid attachments={post.media} />

        <div className="flex items-center justify-between border-y border-border/60 py-2 text-xs text-muted-foreground">
          <span>{post.likes_count} likes</span>
          <span>{post.comments_count} comments</span>
        </div>

        <div className="flex flex-wrap items-center gap-1">
          <Button variant="ghost" size="sm" className={cn('rounded-full px-3', post.viewer.liked && 'text-rose-600 hover:text-rose-600')} onClick={onLike}>
            <Heart className={cn('mr-2 h-4 w-4', post.viewer.liked && 'fill-current')} />
            Like
          </Button>
          <Button variant="ghost" size="sm" className="rounded-full px-3" onClick={() => setShowComments((current) => !current)}>
            <MessageCircle className="mr-2 h-4 w-4" />
            Comment
          </Button>
          <Button variant="ghost" size="sm" className="rounded-full px-3" onClick={onCopyLink}>
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>
          <Button variant="ghost" size="sm" className={cn('rounded-full px-3', post.viewer.bookmarked && 'text-primary hover:text-primary')} onClick={onBookmark}>
            <Bookmark className={cn('mr-2 h-4 w-4', post.viewer.bookmarked && 'fill-current')} />
            Save
          </Button>
        </div>

        {showComments ? (
          <div className="space-y-3 border-t border-border/60 pt-3">
            <div className="flex gap-2">
              <Avatar className="mt-1 h-9 w-9">
                <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || 'You'} />
                <AvatarFallback>{getInitials(profile?.full_name)}</AvatarFallback>
              </Avatar>
              <Input
                value={commentInput}
                onChange={(event) => setCommentInput(event.target.value)}
                placeholder="Write a comment"
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    void submitComment()
                  }
                }}
                className="rounded-full"
              />
              <Button type="button" size="icon" className="rounded-full" disabled={!commentInput.trim()} onClick={() => void submitComment()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>

            {comments.length > 0 ? (
              <div className="space-y-3">
                {comments.map((comment) => (
                  <div key={comment.id} className="rounded-2xl bg-muted/35 px-4 py-3">
                    <div className="flex gap-3">
                      <Avatar className="mt-0.5 h-9 w-9">
                        <AvatarImage src={comment.author?.avatar_url || undefined} alt={comment.author?.full_name || 'Member'} />
                        <AvatarFallback>{getInitials(comment.author?.full_name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">{comment.author?.full_name || 'Member'}</span>
                          <span>&middot;</span>
                          <span>{formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}</span>
                        </div>
                        <p className="mt-1 whitespace-pre-wrap text-sm leading-6">{comment.content}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No comments yet. Start the conversation.</p>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
