'use client'

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import useSWR from 'swr'
import useSWRInfinite from 'swr/infinite'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Heart,
  MessageCircle,
  Share2,
  Image as ImageIcon,
  Loader2,
  Search,
  Users,
  UserCheck,
  Send,
  X,
  Trash2,
  Bookmark,
  Reply,
  Repeat2,
  ArrowUp,
  Link2,
  Check,
  Edit3,
  Globe,
  Lock,
  Users2,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { usePresence } from '@/lib/hooks/use-realtime'
import { useRealtimeGateway } from '@/lib/hooks/use-realtime-gateway'
import type { RealtimeEventEnvelope } from '@/backend/realtime/types'
import { cn } from '@/lib/utils'
import { createClientTraceId, logClientTrace, observeClientMetric } from '@/lib/infrastructure/web-observability'
import { resolveFeedReturnContext, trackFeedFunnelEvent } from '@/lib/infrastructure/product-analytics'

interface FeedPost {
  id: string
  content: string
  image_url: string | null
  created_at: string
  author_id: string
  likes_count: number
  comments_count: number
  profiles?: {
    id: string
    full_name: string | null
    avatar_url: string | null
    profession: string | null
    role: string | null
  } | null
  visibility?: 'public' | 'followers' | 'private'
  metadata?: {
    shared_post_id?: string
    shared_author_name?: string
    shared_post_excerpt?: string
    [key: string]: unknown
  } | null
}

interface FeedPage {
  data: FeedPost[]
  userLikes: string[]
  userBookmarks: string[]
  nextCursor: string | null
  totalCount?: number | null
}

interface PostComment {
  id: string
  content: string
  created_at: string
  author_id: string
  parent_comment_id?: string | null
  author?: {
    id: string
    full_name: string | null
    avatar_url: string | null
    role: string | null
  }
}


interface MemberSummary {
  id: string
  full_name: string | null
  avatar_url: string | null
  profession: string | null
  role: string | null
  isFollowing?: boolean
}

const fetcher = async <T,>(url: string): Promise<T> => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json() as Promise<T>
}

function PostSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-3/4" />
      </CardContent>
    </Card>
  )
}

function UserCard({
  user: member,
  isOnline = false,
  currentUserId,
  initialIsFollowing = false,
  onFollowToggle,
}: {
  user: MemberSummary
  isOnline?: boolean
  currentUserId?: string | null
  initialIsFollowing?: boolean
  onFollowToggle?: (memberId: string, nowFollowing: boolean) => void
}) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing)
  const [isToggling, setIsToggling] = useState(false)
  const isSelf = currentUserId === member.id

  useEffect(() => {
    setIsFollowing(initialIsFollowing)
  }, [initialIsFollowing])

  const handleFollowToggle = useCallback(async () => {
    if (!currentUserId || isSelf || isToggling) return
    const next = !isFollowing
    setIsFollowing(next)
    setIsToggling(true)
    try {
      const res = await fetch(`/api/users/${member.id}/follow`, { method: next ? 'POST' : 'DELETE' })
      if (!res.ok) {
        setIsFollowing(!next)
        toast.error(next ? 'Failed to follow' : 'Failed to unfollow')
      } else {
        onFollowToggle?.(member.id, next)
      }
    } catch {
      setIsFollowing(!next)
      toast.error('Network error')
    } finally {
      setIsToggling(false)
    }
  }, [currentUserId, isSelf, isToggling, isFollowing, member.id, onFollowToggle])

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
      <div className="relative">
        <Avatar className="h-10 w-10">
          <AvatarImage src={member.avatar_url || undefined} alt={member.full_name || undefined} />
          <AvatarFallback>{member.full_name?.[0] || 'U'}</AvatarFallback>
        </Avatar>
        {isOnline && <span className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 border-2 border-background rounded-full" />}
      </div>
      <div className="flex-1 min-w-0">
        <Link href={`/profile/${member.id}`} className="font-medium text-sm hover:underline truncate block">
          {member.full_name || 'Anonymous'}
        </Link>
        <p className="text-xs text-muted-foreground truncate">{member.profession || member.role || 'Member'}</p>
      </div>
      {isOnline && !currentUserId && (
        <Badge variant="secondary" className="text-xs shrink-0">Online</Badge>
      )}
      {currentUserId && !isSelf && (
        <Button
          variant={isFollowing ? 'secondary' : 'outline'}
          size="sm"
          className="h-7 px-2 text-xs shrink-0"
          onClick={handleFollowToggle}
          disabled={isToggling}
        >
          {isToggling ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : isFollowing ? (
            <><UserCheck className="h-3 w-3 mr-1" />Following</>
          ) : (
            <>Follow</>
          )}
        </Button>
      )}
    </div>
  )
}

/** Normalise a raw API post row — single canonical place for body→content mapping */
function normalisePost(raw: any): FeedPost {
  return {
    ...raw,
    content: raw.content ?? raw.body ?? '',
    likes_count: raw.likes_count ?? raw.like_count ?? 0,
    comments_count: raw.comments_count ?? raw.comment_count ?? 0,
  }
}

export function EnhancedSocialFeed() {
  const { userId, profile, resolvedRole } = useAuth()
  const [newPostContent, setNewPostContent] = useState('')
  const [newPostImage, setNewPostImage] = useState<string | null>(null)
  const [newPostVisibility, setNewPostVisibility] = useState<'public' | 'followers' | 'private'>('public')
  const [isPosting, setIsPosting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'online' | 'members'>('online')
  const [realtimeOnline, setRealtimeOnline] = useState<Record<string, any>>({})
  const [shareTargetPost, setShareTargetPost] = useState<FeedPost | null>(null)
  const [shareNote, setShareNote] = useState('')
  const [editingPost, setEditingPost] = useState<FeedPost | null>(null)
  const [editContent, setEditContent] = useState('')
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [newPostsCount, setNewPostsCount] = useState(0)
  const [mentionSearch, setMentionSearch] = useState('')
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false)
  const [postSearchQuery, setPostSearchQuery] = useState('')
  const traceIdRef = useRef<string>(createClientTraceId())
  const observerRef = useRef<HTMLDivElement | null>(null)
  const presenceLastUpdatedRef = useRef<number>(0)

  const getKey = useCallback((pageIndex: number, previousPageData: FeedPage | null) => {
    if (!userId) return null
    if (previousPageData && !previousPageData.nextCursor) return null
    const params = new URLSearchParams({ limit: '20' })
    if (pageIndex > 0 && previousPageData?.nextCursor) {
      params.set('cursor', previousPageData.nextCursor)
    }
    return `/api/feed/posts?${params.toString()}`
  }, [userId])

  const {
    data: feedPages,
    mutate: mutateFeed,
    size,
    setSize,
    isLoading: feedLoading,
    isValidating: feedValidating,
  } = useSWRInfinite<FeedPage>(getKey, fetcher, {
    revalidateFirstPage: false,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    persistSize: true,
    revalidateAll: false,
    dedupingInterval: 3000,
    refreshInterval: 0,
    keepPreviousData: true,
  })

  const { data: onlineUsersData, mutate: mutateOnlineUsers } = useSWR(userId ? '/api/users/online' : null, fetcher, { keepPreviousData: true })
  const { data: discoveryData, mutate: mutateDiscovery } = useSWR(userId ? '/api/users/community?mode=discovery' : null, fetcher, { keepPreviousData: true })
  const membersUrl = useMemo(() => {
    if (!userId) return null
    const params = new URLSearchParams()
    if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim())
    const qs = params.toString()
    return qs ? `/api/users/community?${qs}` : '/api/users/community'
  }, [userId, debouncedSearch])
  const { data: membersData, mutate: mutateMembers } = useSWR(membersUrl, fetcher, { keepPreviousData: true, revalidateOnFocus: false })

  const lastStablePosts = useRef<FeedPost[]>([])
  const posts = useMemo(() => {
    let allPosts = feedPages?.flatMap((page) => page.data) ?? []
    
    // If we have no posts right now, use the last stable posts to prevent a white-out blink
    if (allPosts.length === 0 && lastStablePosts.current.length > 0) {
      allPosts = lastStablePosts.current
    } else if (allPosts.length > 0) {
      lastStablePosts.current = allPosts
    }

    if (postSearchQuery.trim()) {
      const q = postSearchQuery.toLowerCase()
      return allPosts.filter((p) =>
        p.content.toLowerCase().includes(q) ||
        p.profiles?.full_name?.toLowerCase().includes(q)
      )
    }
    return allPosts
  }, [feedPages, postSearchQuery])
  
  const userLikes = useMemo(() => new Set(feedPages?.flatMap((page: FeedPage) => page.userLikes) ?? []), [feedPages])
  const userBookmarks = useMemo(() => new Set(feedPages?.flatMap((page: FeedPage) => page.userBookmarks) ?? []), [feedPages])

  const lastStableOnlineUsers = useRef<MemberSummary[]>([])
  const lastStableMembers = useRef<MemberSummary[]>([])
  const lastStableDiscovery = useRef<MemberSummary[]>([])

  const onlineUsers = useMemo(() => {
    const data = (onlineUsersData as { data?: MemberSummary[] } | undefined)?.data
    if ((!data || data.length === 0) && lastStableOnlineUsers.current.length > 0) {
      return lastStableOnlineUsers.current
    }
    if (data && data.length > 0) lastStableOnlineUsers.current = data
    return data || []
  }, [onlineUsersData])

  const members = useMemo(() => {
    const data = (membersData as { data?: MemberSummary[] } | undefined)?.data
    if (!data && lastStableMembers.current.length > 0) return lastStableMembers.current
    if (data) lastStableMembers.current = data
    return data || []
  }, [membersData])

  const discoverySuggestions = useMemo(() => {
    const data = (discoveryData as { data?: MemberSummary[] } | undefined)?.data
    if (!data && lastStableDiscovery.current.length > 0) return lastStableDiscovery.current
    if (data) lastStableDiscovery.current = data
    return data || []
  }, [discoveryData])

  const realtimeOnlineIds = useMemo(() => new Set(Object.keys(realtimeOnline)), [realtimeOnline])

  const hasMore = !!feedPages?.[feedPages.length - 1]?.nextCursor
  const isLoadingMore = feedValidating && feedPages && feedPages.length === size && hasMore

  const mergedOnlineUsers = useMemo(() => {
    const byId = new Map<string, MemberSummary>()
    onlineUsers.forEach((member: MemberSummary) => byId.set(member.id, member))
    members.filter((member: MemberSummary) => realtimeOnlineIds.has(member.id)).forEach((member: MemberSummary) => byId.set(member.id, member))
    if (userId && (realtimeOnlineIds.has(userId) || onlineUsers.some((member: MemberSummary) => member.id === userId))) {
      byId.set(userId, {
        id: userId,
        full_name: profile?.full_name || 'You',
        avatar_url: profile?.avatar_url || null,
        profession: (profile as any)?.profession || null,
        role: resolvedRole || profile?.role || 'member',
      })
    }
    return Array.from(byId.values())
  }, [members, onlineUsers, profile, realtimeOnlineIds, resolvedRole, userId])

  // Surgically patch a post in the SWR cache without triggering a refetch
  const patchFeed = useCallback((fn: (post: FeedPost) => FeedPost) => {
    mutateFeed((pages) => {
      if (!pages) return pages
      return pages.map((page) => ({ ...page, data: page.data.map(fn) }))
    }, false)
  }, [mutateFeed])

  /**
   * Realtime event handler.
   * KEY RULE: skip patches for events the current user triggered — they already
   * have the optimistic update applied. Only apply patches for other users' events
   * to avoid double-counting likes, comments, etc.
   */
  const handleRealtimeEvent = useCallback((event: RealtimeEventEnvelope) => {
    observeClientMetric('feed.realtime.events_received.total', 1, { eventType: event.eventType })
    logClientTrace({
      traceId: String((event.payload as Record<string, unknown>)?.traceId ?? traceIdRef.current),
      message: 'Feed consumed realtime event',
      tags: { eventType: event.eventType, entityId: event.entityId },
    })

    const isSelf = event.actorUserId === userId

    if (event.eventType === 'post.liked' || event.eventType === 'post.unliked') {
      // Self already applied optimistic update — skip to avoid double-count
      if (isSelf) return
      const postId = String(event.payload.postId ?? event.entityId)
      const direction = event.eventType === 'post.liked' ? 1 : -1
      patchFeed((post) => post.id === postId ? { ...post, likes_count: Math.max(0, post.likes_count + direction) } : post)
      return
    }

    if (event.eventType === 'comment.created') {
      // Self already applied optimistic update — skip to avoid double-count
      if (isSelf) return
      const postId = String(event.payload.postId ?? '')
      if (!postId) return
      patchFeed((post) => post.id === postId ? { ...post, comments_count: post.comments_count + 1 } : post)
      return
    }

    if (event.eventType === 'post.created') {
      // Own post was already optimistically prepended — skip
      if (isSelf) return
      setNewPostsCount((prev) => prev + 1)
      return
    }

    if (event.eventType === 'post.updated') {
      // Surgically update the post body in cache — no full refetch needed
      const postId = String(event.payload.postId ?? event.entityId)
      const updatedBody = event.payload.body as string | undefined
      if (postId && updatedBody) {
        patchFeed((post) => post.id === postId ? { ...post, content: updatedBody } : post)
      }
      return
    }

    if (event.eventType === 'post.deleted') {
      const postId = String(event.payload.postId ?? event.entityId)
      if (!postId) return
      mutateFeed((pages) => pages?.map((page) => ({
        ...page,
        data: page.data.filter((p) => p.id !== postId),
      })), false)
      return
    }

    if (event.eventType === 'follow.created' || event.eventType === 'follow.deleted') {
      mutateMembers()
      mutateOnlineUsers()
      mutateDiscovery()
    }
  }, [mutateMembers, mutateOnlineUsers, mutateDiscovery, mutateFeed, patchFeed, userId])

  /**
   * Prepend new posts from other users without resetting scroll position.
   * Fetches only the first page and inserts posts not already in the cache.
   */
  const refreshFeedPosts = useCallback(async () => {
    setNewPostsCount(0)
    try {
      const res = await fetch('/api/feed/posts?limit=20')
      if (!res.ok) return
      const freshPage: FeedPage = await res.json()
      mutateFeed((pages) => {
        if (!pages) return [freshPage]
        const existingIds = new Set(pages.flatMap((p) => p.data.map((post) => post.id)))
        const newPosts = freshPage.data.filter((p) => !existingIds.has(p.id))
        if (newPosts.length === 0) return pages
        return [{ ...pages[0], data: [...newPosts, ...pages[0].data] }, ...pages.slice(1)]
      }, false)
    } catch {
      // Fallback to full revalidation if fetch fails
      mutateFeed()
    }
  }, [mutateFeed])

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
    enabled: !!userId,
    feedStreamId: 'home',
    onEvent: handleRealtimeEvent,
    onError: () => {
      // Avoid full-feed revalidation storms during transient socket reconnects.
      if (!feedPages || feedPages.length === 0) {
        void mutateFeed()
      }
    },
  })

  usePresence({
    channelName: 'community-presence',
    userId: userId || '',
    userInfo: { full_name: profile?.full_name, avatar_url: profile?.avatar_url, role: profile?.role },
    enabled: !!userId,
    onSync: (state) => {
      const flattened = Object.entries(state).reduce<Record<string, any>>((acc, [key, presences]) => {
        if (presences.length > 0) acc[key] = presences[0]
        return acc
      }, {})
      const now = Date.now()
      const hasAnyOnline = Object.keys(flattened).length > 0
      if (hasAnyOnline) {
        presenceLastUpdatedRef.current = now
        setRealtimeOnline(flattened)
        return
      }

      // Presence can briefly sync as empty during reconnect.
      // Keep the previous state for a short grace window to prevent "online blinking".
      if (now - presenceLastUpdatedRef.current < 8000) {
        return
      }
      setRealtimeOnline({})
    },
  })

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  useEffect(() => {
    if (!observerRef.current || !hasMore || feedLoading) return
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) setSize((prev) => prev + 1)
    }, { rootMargin: '300px' })
    observer.observe(observerRef.current)
    return () => observer.disconnect()
  }, [setSize, hasMore, feedLoading])

  const handleImageUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return toast.error('Please select an image file')
    if (file.size > 5 * 1024 * 1024) return toast.error('Image must be less than 5MB')
    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const response = await fetch('/api/upload', { method: 'POST', body: formData })
      if (!response.ok) throw new Error('Upload failed')
      const { url, pathname } = await response.json()
      const imageUrl = typeof url === 'string' && url.length > 0
        ? url
        : pathname ? `/api/file?pathname=${encodeURIComponent(pathname)}` : null
      if (!imageUrl) throw new Error('Upload completed but no image URL was returned')
      setNewPostImage(imageUrl)
      toast.success('Image uploaded')
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload image')
    } finally {
      setIsUploading(false)
    }
  }, [])

  /**
   * Optimistically prepend a post with a known tempId so we can replace it
   * precisely when the real post comes back — no full refetch needed.
   */
  const optimisticAddPost = useCallback((tempId: string, content: string, imageUrl: string | null, metadata?: Record<string, unknown>) => {
    const optimisticPost: FeedPost = {
      id: tempId,
      content,
      image_url: imageUrl,
      created_at: new Date().toISOString(),
      author_id: userId || 'unknown',
      likes_count: 0,
      comments_count: 0,
      metadata: metadata || {},
      profiles: {
        id: userId || 'unknown',
        full_name: profile?.full_name || 'You',
        avatar_url: profile?.avatar_url || null,
        profession: (profile as any)?.profession || null,
        role: profile?.role || null,
      },
    }
    mutateFeed((pages) => {
      if (!pages || pages.length === 0) {
        return [{ data: [optimisticPost], userLikes: [], userBookmarks: [], nextCursor: null }]
      }
      return [{ ...pages[0], data: [optimisticPost, ...pages[0].data] }, ...pages.slice(1)]
    }, false)
  }, [mutateFeed, profile, userId])

  const updatePostContent = useCallback((value: string) => {
    setNewPostContent(value)
    const lastAt = value.lastIndexOf('@')
    if (lastAt !== -1) {
      const query = value.slice(lastAt + 1)
      if (!query.includes(' ')) {
        setMentionSearch(query)
        setShowMentionSuggestions(true)
        return
      }
    }
    setShowMentionSuggestions(false)
  }, [])

  const insertMention = useCallback((mentionName: string) => {
    const lastAt = newPostContent.lastIndexOf('@')
    setNewPostContent(newPostContent.slice(0, lastAt) + '@' + mentionName + ' ')
    setShowMentionSuggestions(false)
  }, [newPostContent])

  const handlePostCreate = useCallback(async (opts?: { asShare?: boolean; sourcePost?: FeedPost | null; contentOverride?: string }) => {
    const content = opts?.contentOverride ?? newPostContent
    if (!userId || !content.trim()) return toast.error('Please write something to post')
    if (content.trim().length > 2000) return toast.error('Post must be 2000 characters or less')

    const tempId = `optimistic-${Date.now()}`
    setIsPosting(true)
    trackFeedFunnelEvent({
      funnel: 'feed_engagement',
      step: 'interact',
      traceId: traceIdRef.current,
      metadata: { action: opts?.asShare ? 'share_post' : 'create_post' },
    })

    const shareMetadata = opts?.asShare && opts.sourcePost ? {
      shared_post_id: opts.sourcePost.id,
      shared_author_name: opts.sourcePost.profiles?.full_name,
      shared_post_excerpt: opts.sourcePost.content.slice(0, 180),
    } : undefined

    optimisticAddPost(tempId, content.trim(), newPostImage, shareMetadata)

    try {
      const response = await fetch('/api/feed/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim(),
          image_url: newPostImage,
          post_type: newPostImage ? 'image' : 'text',
          category: 'general',
          metadata: opts?.asShare && opts.sourcePost ? { shared_post_id: opts.sourcePost.id } : {},
          visibility: newPostVisibility,
        }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Failed to create post')

      // Replace the optimistic entry with the real post — no full refetch, no flash
      const realPost: FeedPost = normalisePost(payload.post)
      mutateFeed((pages) => pages?.map((page) => ({
        ...page,
        data: page.data.map((p) => p.id === tempId ? realPost : p),
      })), false)

      setNewPostContent('')
      setNewPostImage(null)
      setShareTargetPost(null)
      setShareNote('')
      setNewPostVisibility('public')
      toast.success(opts?.asShare ? 'Shared to your feed' : 'Post created!')
    } catch (error: any) {
      // Roll back the optimistic entry by revalidating from the server
      mutateFeed()
      toast.error(error.message || 'Failed to create post')
    } finally {
      setIsPosting(false)
    }
  }, [mutateFeed, newPostContent, newPostImage, optimisticAddPost, userId])

  const handleLike = useCallback(async (postId: string, isLiked: boolean) => {
    if (!userId) return toast.error('Please sign in to like posts')
    trackFeedFunnelEvent({
      funnel: 'feed_engagement',
      step: 'interact',
      traceId: traceIdRef.current,
      metadata: { action: isLiked ? 'unlike' : 'like', postId },
    })
    // Optimistic update — realtime event from self will be ignored in handleRealtimeEvent
    patchFeed((post) => post.id === postId ? { ...post, likes_count: Math.max(0, post.likes_count + (isLiked ? -1 : 1)) } : post)
    mutateFeed((pages) => pages?.map((page) => ({
      ...page,
      userLikes: isLiked ? page.userLikes.filter((id) => id !== postId) : Array.from(new Set([...page.userLikes, postId])),
    })), false)
    try {
      const response = await fetch(`/api/posts/${postId}/like`, { method: isLiked ? 'DELETE' : 'POST' })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Failed to update like')
    } catch (error: any) {
      toast.error(error.message || 'Failed to update like')
      mutateFeed()
    }
  }, [mutateFeed, patchFeed, userId])

  const handleCommentCreate = useCallback(async (postId: string, content: string, parentCommentId?: string) => {
    const trimmed = content.trim()
    if (!trimmed) return
    trackFeedFunnelEvent({
      funnel: 'feed_engagement',
      step: 'interact',
      traceId: traceIdRef.current,
      metadata: { action: 'comment', postId },
    })
    // Optimistic update — realtime event from self will be ignored in handleRealtimeEvent
    patchFeed((post) => post.id === postId ? { ...post, comments_count: post.comments_count + 1 } : post)
    try {
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: trimmed, parent_comment_id: parentCommentId }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Failed to comment')
    } catch (error: any) {
      toast.error(error.message || 'Failed to comment')
      mutateFeed()
    }
  }, [mutateFeed, patchFeed])

  const handleBookmark = useCallback(async (postId: string, isBookmarked: boolean) => {
    mutateFeed((pages) => pages?.map((page) => ({
      ...page,
      userBookmarks: isBookmarked ? page.userBookmarks.filter((id) => id !== postId) : Array.from(new Set([...page.userBookmarks, postId])),
    })), false)
    try {
      const response = await fetch('/api/feed/bookmarks', {
        method: isBookmarked ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Failed to update bookmark')
    } catch {
      mutateFeed()
    }
  }, [mutateFeed])

  const handleDeletePost = useCallback(async (postId: string) => {
    // Optimistic removal — realtime post.deleted event from self is also handled safely
    mutateFeed((pages) => pages?.map((page) => ({ ...page, data: page.data.filter((p) => p.id !== postId) })), false)
    try {
      const response = await fetch(`/api/feed/posts/${postId}`, { method: 'DELETE' })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Failed to delete post')
      toast.success('Post deleted')
    } catch {
      toast.error('Failed to delete post')
      mutateFeed()
    }
  }, [mutateFeed])


  const handleEditPost = useCallback(async () => {
    if (!editingPost || !editContent.trim()) {
      toast.error('Post content cannot be empty')
      return
    }
    if (editContent.trim().length > 2000) {
      toast.error('Post must be 2000 characters or less')
      return
    }

    setIsSavingEdit(true)
    try {
      const response = await fetch(`/api/feed/posts/${editingPost.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent.trim() }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Failed to update post')

      patchFeed((post) => post.id === editingPost.id ? { ...post, content: editContent.trim() } : post)
      toast.success('Post updated')
      setEditingPost(null)
      setEditContent('')
    } catch (error: any) {
      toast.error(error.message || 'Failed to update post')
    } finally {
      setIsSavingEdit(false)
    }
  }, [editContent, editingPost, patchFeed])

  if (!userId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Users className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Join the Community</h2>
        <p className="text-muted-foreground mb-6 max-w-md">Sign in to connect with community members and participate in conversations.</p>
        <div className="flex gap-3">
          <Button asChild><Link href="/sign-in">Sign In</Link></Button>
          <Button variant="outline" asChild><Link href="/sign-up">Create Account</Link></Button>
        </div>
      </div>
    )
  }

  const postLength = newPostContent.trim().length

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left sidebar — profile card */}
      <aside className="hidden lg:block lg:col-span-3">
        <Card className="sticky top-20">
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center">
              <Avatar className="h-20 w-20 mb-4">
                <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || undefined} />
                <AvatarFallback className="text-2xl">{profile?.full_name?.[0] || 'U'}</AvatarFallback>
              </Avatar>
              <h3 className="font-semibold text-lg">{profile?.full_name || 'Welcome!'}</h3>
              <p className="text-sm text-muted-foreground mb-2">{(profile as any)?.profession || 'Community Member'}</p>
              <Badge variant="secondary" className="capitalize">{resolvedRole || profile?.role || 'member'}</Badge>
              <div className="w-full mt-6 pt-4 border-t space-y-2">
                <Link href="/profile" className="block"><Button variant="outline" className="w-full" size="sm">View Profile</Button></Link>
                <Link href="/settings" className="block"><Button variant="ghost" className="w-full" size="sm">Settings</Button></Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </aside>

      {/* Main feed column */}
      <main className="lg:col-span-6 space-y-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search posts..."
            value={postSearchQuery}
            onChange={(e) => setPostSearchQuery(e.target.value)}
            className="pl-9 bg-background/50 border-muted focus:bg-background transition-colors"
          />
        </div>

        {/* Compose box */}
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-3">
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || undefined} />
                <AvatarFallback>{profile?.full_name?.[0] || 'U'}</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-3 relative">
                <Textarea
                  placeholder="Share an update… use @name for mentions"
                  value={newPostContent}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updatePostContent(e.target.value)}
                  className="min-h-[80px] resize-none"
                />
                {showMentionSuggestions && (
                  <Card className="absolute z-50 left-0 right-0 top-full mt-1 shadow-xl border-primary/20 overflow-hidden">
                    <ScrollArea className="max-h-[200px]">
                      <div className="p-1">
                        {members.filter((m: MemberSummary) =>
                          (m.full_name || '').toLowerCase().includes(mentionSearch.toLowerCase())
                        ).slice(0, 5).map((m: MemberSummary) => (
                          <button
                            key={m.id}
                            className="w-full flex items-center gap-2 p-2 hover:bg-muted text-left text-sm rounded-md transition-colors"
                            onClick={() => insertMention(m.full_name || 'member')}
                          >
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={m.avatar_url || undefined} />
                              <AvatarFallback>{(m.full_name || 'U')[0]}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{m.full_name}</span>
                            <span className="text-xs text-muted-foreground">@{m.id.slice(0, 4)}</span>
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                  </Card>
                )}
                {newPostImage && (
                  <div className="relative inline-block">
                    <img src={newPostImage} alt="Upload preview" width={200} height={150} className="rounded-lg object-cover" />
                    <Button size="icon" variant="destructive" className="absolute -top-2 -right-2 h-6 w-6" onClick={() => setNewPostImage(null)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => document.getElementById('post-image-input')?.click()} disabled={isUploading}>
                      {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                      <span className="ml-2 hidden sm:inline">Photo</span>
                    </Button>
                    <input id="post-image-input" type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleImageUpload(file); e.target.value = '' }} />
                    <Select value={newPostVisibility} onValueChange={(v: 'public' | 'followers' | 'private') => setNewPostVisibility(v)}>
                      <SelectTrigger className="h-8 w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">Public</SelectItem>
                        <SelectItem value="followers">Followers</SelectItem>
                        <SelectItem value="private">Only me</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={cn('text-xs', postLength > 2000 ? 'text-destructive' : 'text-muted-foreground')}>{postLength}/2000</span>
                    <Button onClick={() => handlePostCreate()} disabled={isPosting || !newPostContent.trim() || postLength > 2000} size="sm">
                      {isPosting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}Post
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Post list */}
        <div className="space-y-4 relative">
          {/* Refresh indicator removed to eliminate blinking feel during background updates */}

          {/* New posts banner — prepends without resetting scroll */}
          {newPostsCount > 0 && (
            <div className="sticky top-20 z-20 flex justify-center py-2 animate-in fade-in slide-in-from-top-4 duration-500">
              <Button
                variant="default"
                size="sm"
                className="rounded-full shadow-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8 py-6 gap-3 border-none ring-4 ring-background transform hover:scale-105 transition-all"
                onClick={() => { void refreshFeedPosts() }}
              >
                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                {newPostsCount} {newPostsCount === 1 ? 'New Post' : 'New Posts'}
                <ArrowUp className="h-4 w-4 animate-bounce" />
              </Button>
            </div>
          )}

          {feedLoading && posts.length === 0 && !feedPages ? (
            <div className="space-y-4">
              <PostSkeleton /><PostSkeleton /><PostSkeleton />
            </div>
          ) : posts.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold mb-2">No posts yet</h3>
                <p className="text-muted-foreground">Be the first to share something with the community!</p>
              </CardContent>
            </Card>
          ) : (
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                isOwner={post.author_id === userId}
                isLiked={userLikes.has(post.id)}
                isBookmarked={userBookmarks.has(post.id)}
                onLike={() => handleLike(post.id, userLikes.has(post.id))}
                onBookmark={() => handleBookmark(post.id, userBookmarks.has(post.id))}
                onDelete={() => handleDeletePost(post.id)}
                onComment={handleCommentCreate}
                onOpenShare={() => {
                  setShareTargetPost(post)
                  setShareNote(`Sharing @${post.profiles?.full_name || 'community'}: `)
                  setNewPostContent('')
                }}
                onEdit={() => {
                  setEditingPost(post)
                  setEditContent(post.content)
                }}
              />
            ))
          )}

          {isLoadingMore && <><PostSkeleton /><PostSkeleton /></>}
          <div ref={observerRef} className="h-6" />
        </div>
      </main>

      {/* Right sidebar — online / members */}
      <aside className="hidden lg:block lg:col-span-3">
        <Card className="sticky top-20">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'online' | 'members')}>
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="online" className="text-xs"><UserCheck className="h-3 w-3 mr-1" />Online ({mergedOnlineUsers.length})</TabsTrigger>
              <TabsTrigger value="members" className="text-xs"><Users className="h-3 w-3 mr-1" />Members ({members.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="online" className="mt-0">
              <ScrollArea className="h-[400px]">
                <div className="p-2">
                  {mergedOnlineUsers.length === 0
                    ? <p className="text-center text-sm text-muted-foreground py-8">No users online</p>
                    : mergedOnlineUsers.map((member: MemberSummary) => (
                        <UserCard
                          key={member.id}
                          user={member}
                          isOnline
                          currentUserId={userId}
                          initialIsFollowing={member.isFollowing ?? false}
                          onFollowToggle={() => { mutateMembers(); mutateOnlineUsers() }}
                        />
                      ))}
                </div>
              </ScrollArea>
            </TabsContent>
            <TabsContent value="members" className="mt-0">
              <div className="p-2">
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search members..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-9" />
                </div>
              </div>
              <ScrollArea className="h-[500px]">
                <div className="p-2 pt-0">
                  {members.length === 0
                    ? <p className="text-center text-sm text-muted-foreground py-8">No members found</p>
                    : members.map((member: MemberSummary) => (
                        <UserCard
                          key={member.id}
                          user={member}
                          isOnline={realtimeOnlineIds.has(member.id) || onlineUsers.some((u: MemberSummary) => u.id === member.id)}
                          currentUserId={userId}
                          initialIsFollowing={member.isFollowing ?? false}
                          onFollowToggle={() => mutateMembers()}
                        />
                      ))}
                </div>

                {/* Discovery section */}
                {discoverySuggestions.length > 0 && (
                  <div className="px-2 pb-2">
                    <div className="flex items-center gap-2 py-2 px-1">
                      <div className="h-px flex-1 bg-border" />
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                        People you may know
                      </span>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                    <div className="rounded-lg border bg-muted/20 overflow-hidden">
                      {discoverySuggestions.map((suggestion: MemberSummary) => (
                        <UserCard
                          key={suggestion.id}
                          user={suggestion}
                          isOnline={realtimeOnlineIds.has(suggestion.id) || onlineUsers.some((u: MemberSummary) => u.id === suggestion.id)}
                          currentUserId={userId}
                          initialIsFollowing={false}
                          onFollowToggle={() => { mutateMembers(); mutateDiscovery() }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </Card>
      </aside>

      <Dialog open={!!editingPost} onOpenChange={(open) => !open && setEditingPost(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit post</DialogTitle></DialogHeader>
          <Textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="min-h-[120px]"
          />
          <div className="flex items-center justify-between">
            <span className={cn('text-xs', editContent.trim().length > 2000 ? 'text-destructive' : 'text-muted-foreground')}>{editContent.trim().length}/2000</span>
            <Button onClick={() => { void handleEditPost() }} disabled={isSavingEdit || !editContent.trim() || editContent.trim().length > 2000}>
              {isSavingEdit ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Share dialog */}
      <Dialog open={!!shareTargetPost} onOpenChange={(open) => !open && setShareTargetPost(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Share post with note</DialogTitle></DialogHeader>
          <Textarea
            value={shareNote}
            onChange={(e) => setShareNote(e.target.value)}
            placeholder="Add context, mention people with @name, and share."
            className="min-h-[100px]"
          />
          <Card className="bg-muted/40 border-dashed">
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Sharing from</p>
              <p className="font-medium">{shareTargetPost?.profiles?.full_name || 'Community Member'}</p>
              <p className="text-sm line-clamp-3 mt-1">{shareTargetPost?.content}</p>
            </CardContent>
          </Card>
          <div className="flex justify-end">
            <Button
              onClick={() => {
                setNewPostImage(null)
                handlePostCreate({ asShare: true, sourcePost: shareTargetPost, contentOverride: shareNote.trim() })
              }}
              disabled={isPosting || !shareNote.trim()}
            >
              {isPosting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Repeat2 className="h-4 w-4 mr-2" />}Share post
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function PostCard({
  post,
  isOwner,
  isLiked,
  isBookmarked,
  onLike,
  onBookmark,
  onDelete,
  onComment,
  onOpenShare,
  onEdit,
}: {
  post: FeedPost
  isOwner: boolean
  isLiked: boolean
  isBookmarked: boolean
  onLike: () => void
  onBookmark: () => void
  onDelete: () => void
  onComment: (postId: string, content: string, parentCommentId?: string) => Promise<void>
  onOpenShare: () => void
  onEdit: () => void
}) {
  const [showComments, setShowComments] = useState(false)
  const [commentInput, setCommentInput] = useState('')
  const [replyPrefix, setReplyPrefix] = useState('')
  const [replyToId, setReplyToId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleCopyLink = useCallback(() => {
    const url = `${window.location.origin}/feed?post=${post.id}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      toast.success('Link copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {
      toast.error('Failed to copy link')
    })
  }, [post.id])

  const { data: commentsResponse, mutate: mutateComments } = useSWR<{ comments: PostComment[] }>(
    showComments ? `/api/posts/${post.id}/comments` : null,
    fetcher,
    { revalidateOnFocus: false, keepPreviousData: true }
  )
  const comments = commentsResponse?.comments ?? []

  const submitComment = async () => {
    const payload = `${replyPrefix}${commentInput}`.trim()
    if (!payload) return
    const targetParentId = replyToId
    const optimisticComment: PostComment = {
      id: `temp-${Date.now()}`,
      content: payload,
      created_at: new Date().toISOString(),
      author_id: 'self',
      parent_comment_id: targetParentId ?? null,
      author: { id: 'self', full_name: 'You', avatar_url: null, role: 'user' },
    }
    mutateComments((current) => ({ comments: [...(current?.comments ?? []), optimisticComment] }), false)
    setCommentInput('')
    setReplyPrefix('')
    setReplyToId(null)
    await onComment(post.id, payload, targetParentId || undefined)
    mutateComments()
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link href={`/profile/${post.author_id}`}>
              <Avatar className="h-10 w-10">
                <AvatarImage src={post.profiles?.avatar_url || undefined} alt={post.profiles?.full_name || undefined} />
                <AvatarFallback>{post.profiles?.full_name?.[0] || 'U'}</AvatarFallback>
              </Avatar>
            </Link>
            <div className="min-w-0">
              <Link href={`/profile/${post.author_id}`} className="font-semibold hover:underline truncate block">{post.profiles?.full_name || 'Anonymous'}</Link>
              <p className="text-xs text-muted-foreground truncate">
                {post.profiles?.profession || post.profiles?.role || 'Community member'} · {post.created_at && formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>
          {isOwner && (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={onEdit}>
                <Edit3 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={onDelete}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <p className="whitespace-pre-wrap leading-relaxed">{post.content}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {post.visibility === 'followers' ? <Users2 className="h-3.5 w-3.5" /> : post.visibility === 'private' ? <Lock className="h-3.5 w-3.5" /> : <Globe className="h-3.5 w-3.5" />}
          <span className="capitalize">{post.visibility || 'public'}</span>
        </div>

        {post.metadata?.shared_post_id && (
          <div className="rounded-md border border-dashed bg-muted/30 p-3 text-sm">
            <p className="text-muted-foreground">Shared post</p>
            <p className="font-medium">{String(post.metadata.shared_author_name || 'Community member')}</p>
            <p className="line-clamp-2">{String(post.metadata.shared_post_excerpt || 'View original content')}</p>
          </div>
        )}

        {post.image_url && (
          <div className="w-full aspect-video rounded-lg overflow-hidden">
            <img src={post.image_url} alt="Post image" className="h-full w-full object-cover" />
          </div>
        )}

        <div className="flex items-center justify-between border-y py-2 text-xs text-muted-foreground">
          <span>{post.likes_count} likes</span>
          <span>{post.comments_count} comments</span>
        </div>

        <div className="flex flex-wrap items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className={cn('gap-2 group transition-all active:scale-95', isLiked && 'text-red-500')}
            onClick={onLike}
          >
            <Heart className={cn('h-4 w-4 transition-transform group-hover:scale-110', isLiked && 'fill-current animate-in zoom-in-50')} />
            Like
          </Button>
          <Button variant="ghost" size="sm" className="gap-2" onClick={() => setShowComments((v) => !v)}>
            <MessageCircle className="h-4 w-4" />Comment
          </Button>
          <Button variant="ghost" size="sm" className="gap-2" onClick={onOpenShare}>
            <Share2 className="h-4 w-4" />Share
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn('gap-2 transition-colors', copied && 'text-green-600')}
            onClick={handleCopyLink}
            title="Copy link to post"
          >
            {copied ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
            {copied ? 'Copied!' : 'Copy link'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn('gap-2', isBookmarked && 'text-primary')}
            onClick={onBookmark}
          >
            <Bookmark className={cn('h-4 w-4', isBookmarked && 'fill-current')} />
            Bookmark
          </Button>
        </div>

        {showComments && (
          <div className="space-y-3 border-t pt-3">
            {replyPrefix && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Reply className="h-3.5 w-3.5" />
                <span>Replying to <strong>{replyPrefix.trim()}</strong></span>
                <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => { setReplyPrefix(''); setReplyToId(null) }}>Clear</Button>
              </div>
            )}
            <div className="flex gap-2">
              <Input
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                placeholder="Comment… use @name and hit Enter"
                onKeyDown={(e) => e.key === 'Enter' && submitComment()}
              />
              <Button onClick={submitComment} disabled={!commentInput.trim()}><Send className="h-4 w-4" /></Button>
            </div>
            {comments.filter((c) => !c.parent_comment_id).map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                allComments={comments}
                onReply={(prefix, parentId) => {
                  setReplyPrefix(prefix)
                  setReplyToId(parentId)
                  setCommentInput('')
                }}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function CommentItem({
  comment,
  allComments,
  onReply,
}: {
  comment: any
  allComments: any[]
  onReply: (prefix: string, parentId: string) => void
}) {
  const replies = allComments.filter((c) => c.parent_comment_id === comment.id)

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-left-2 duration-200 mt-3">
      <div className="group rounded-md bg-muted/40 p-3 hover:bg-muted/60 transition-colors border border-transparent hover:border-primary/10 shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-1">
          <div className="flex items-center gap-2">
            <Avatar className="h-5 w-5">
              <AvatarImage src={comment.author?.avatar_url} />
              <AvatarFallback className="text-[10px] bg-primary/10">{comment.author?.full_name?.[0] || 'U'}</AvatarFallback>
            </Avatar>
            <Link href={`/profile/${comment.author_id}`} className="text-xs font-semibold hover:underline">
              {comment.author?.full_name || 'Member'}
            </Link>
          </div>
          <button
            className="text-[10px] text-muted-foreground hover:text-primary transition-colors font-medium opacity-0 group-hover:opacity-100"
            onClick={() => onReply(`@${comment.author?.full_name || 'member'} `, comment.id)}
          >
            Reply
          </button>
        </div>
        <p className="text-sm pl-7 whitespace-pre-wrap leading-relaxed">{comment.content}</p>
      </div>
      {replies.length > 0 && (
        <div className="pl-6 space-y-3 border-l-2 border-muted/50 ml-2.5">
          {replies.map((reply) => (
            <CommentItem key={reply.id} comment={reply} allComments={allComments} onReply={onReply} />
          ))}
        </div>
      )}
    </div>
  )
}
