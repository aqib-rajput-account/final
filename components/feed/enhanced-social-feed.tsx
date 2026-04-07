'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import useSWR from 'swr'
import useSWRInfinite from 'swr/infinite'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
  AtSign,
  Reply,
  Repeat2,
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
}

interface UserProfile {
  id: string
  full_name: string | null
  avatar_url: string | null
  profession?: string | null
  role?: string | null
}

interface PostComment {
  id: string
  content: string
  created_at: string
  author_id: string
  author?: {
    id: string
    full_name: string | null
    avatar_url: string | null
    role: string | null
  }
}

const fetcher = async <T,>(url: string): Promise<T> => {
  const res = await fetch(url)
  if (!res.ok) {
    const error = new Error('Failed to fetch')
    throw error
  }
  return res.json()
}

// PREMIUM ANIMATIONS SYSTEM
const ANIMATIONS_CSS = `
@keyframes postIn {
  from { opacity: 0; transform: translateY(20px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes heartPulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.4); }
  100% { transform: scale(1); }
}
@keyframes shimmerGlint {
  0% { left: -100%; }
  100% { left: 100%; }
}
.animate-in-post { animation: postIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
.heart-pulse { animation: heartPulse 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
.glass-glint { position: relative; overflow: hidden; }
.glass-glint::after {
  content: ""; position: absolute; top: 0; left: -100%; width: 100%; height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent);
  animation: shimmerGlint 3s infinite;
}
`

function PostSkeleton() {
  return (
    <Card className="glass-card opacity-60">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
        <Skeleton className="w-full aspect-video rounded-lg" />
      </CardContent>
    </Card>
  )
}

function FormattedContent({ content }: { content: string }) {
  if (!content) return null
  // Regex to match @mentions and #hashtags
  const parts = content.split(/(@[^\s.,!?;:]+|#[^\s.,!?;:]+)/g)
  return (
    <p className="whitespace-pre-wrap leading-relaxed text-sm sm:text-base">
      {parts.map((part, i) => {
        if (part.startsWith('@')) {
          return (
            <Link
              key={i}
              href={`/search?q=${encodeURIComponent(part.slice(1))}`}
              className="text-primary hover:underline font-semibold bg-primary/5 px-1 rounded-sm"
            >
              {part}
            </Link>
          )
        }
        if (part.startsWith('#')) {
          return (
            <Link
              key={i}
              href={`/search?q=${encodeURIComponent(part)}`}
              className="text-primary/80 hover:underline font-medium hover:text-primary transition-colors"
            >
              {part}
            </Link>
          )
        }
        return part
      })}
    </p>
  )
}

function UserCard({ user: member, isOnline = false }: { user: any; isOnline?: boolean }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
      <div className="relative">
        <Avatar className="h-10 w-10">
          <AvatarImage src={member.avatar_url} alt={member.full_name} />
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
      {isOnline && (
        <Badge variant="secondary" className="text-xs shrink-0">
          Online
        </Badge>
      )}
    </div>
  )
}

export function EnhancedSocialFeed() {
  const { userId, profile, resolvedRole } = useAuth()
  const [newPostContent, setNewPostContent] = useState('')
  const [newPostImage, setNewPostImage] = useState<string | null>(null)
  const [isPosting, setIsPosting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'online' | 'members'>('online')
  const [realtimeOnline, setRealtimeOnline] = useState<Record<string, any>>({})
  const [shareTargetPost, setShareTargetPost] = useState<FeedPost | null>(null)
  const [editTargetPost, setEditTargetPost] = useState<FeedPost | null>(null)
  const [shareNote, setShareNote] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [feedSearch, setFeedSearch] = useState('')
  const traceIdRef = useRef<string>(createClientTraceId())
  const observerRef = useRef<HTMLDivElement | null>(null)

  const getKey = useCallback((pageIndex: number, previousPageData: FeedPage | null) => {
    if (!userId) return null
    if (previousPageData && !previousPageData.nextCursor) return null
    const params = new URLSearchParams({ limit: '10' })
    if (selectedCategory && selectedCategory !== 'all') {
      params.set('category', selectedCategory)
    }
    if (pageIndex > 0 && previousPageData?.nextCursor) {
      params.set('cursor', previousPageData.nextCursor)
    }
    return `/api/feed/posts?${params.toString()}`
  }, [userId, selectedCategory])

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
  })

  const { data: onlineUsersData, mutate: mutateOnlineUsers } = useSWR(userId ? '/api/users/online' : null, fetcher)
  const { data: membersData, mutate: mutateMembers } = useSWR(userId ? '/api/users/community' : null, fetcher)

  const posts = useMemo(() => {
    const rawPosts = (feedPages?.flatMap((page: FeedPage) => page.data) ?? []) as FeedPost[]
    // 1. Deduplicate
    const uniquePosts = Array.from(new Map(rawPosts.map((p: FeedPost) => [p.id, p])).values())
    // 2. Filter by search
    const filteredBySearch = feedSearch 
      ? uniquePosts.filter((p: FeedPost) => 
          p.content?.toLowerCase().includes(feedSearch.toLowerCase()) || 
          (p as any).body?.toLowerCase().includes(feedSearch.toLowerCase())
        )
      : uniquePosts
    // 3. Sort logic: Pinned first, then by date
    return filteredBySearch.sort((a: FeedPost, b: FeedPost) => {
      const aPinned = (a as any).pinned_at || a.metadata?.pinned_at
      const bPinned = (b as any).pinned_at || b.metadata?.pinned_at
      if (aPinned && !bPinned) return -1
      if (!aPinned && bPinned) return 1
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }, [feedPages, feedSearch])
  const userLikes = useMemo(() => new Set(feedPages?.flatMap((page) => page.userLikes) ?? []), [feedPages])
  const userBookmarks = useMemo(() => new Set(feedPages?.flatMap((page) => page.userBookmarks) ?? []), [feedPages])
  const hasMore = !!feedPages?.[feedPages.length - 1]?.nextCursor
  const isLoadingMore = feedValidating && size > 0

  const onlineUsers = (onlineUsersData as any)?.data || []
  const members = (membersData as any)?.data || []

  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return members
    const query = searchQuery.toLowerCase()
    return members.filter((member: any) =>
      member.full_name?.toLowerCase().includes(query) ||
      member.profession?.toLowerCase().includes(query) ||
      member.role?.toLowerCase().includes(query)
    )
  }, [members, searchQuery])

  const realtimeOnlineIds = useMemo(() => new Set(Object.keys(realtimeOnline)), [realtimeOnline])

  const mergedOnlineUsers = useMemo(() => {
    const byId = new Map<string, any>()
    onlineUsers.forEach((member: any) => byId.set(member.id, member))
    members.filter((member: any) => realtimeOnlineIds.has(member.id)).forEach((member: any) => byId.set(member.id, member))
    if (userId && (realtimeOnlineIds.has(userId) || onlineUsers.some((member: any) => member.id === userId))) {
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

  const patchFeed = useCallback((fn: (post: FeedPost) => FeedPost) => {
    mutateFeed((pages: FeedPage[] | undefined) => {
      if (!pages) return pages
      return pages.map((page: FeedPage) => ({ ...page, data: page.data.map(fn) }))
    }, false)
  }, [mutateFeed])

  const handleRealtimeEvent = useCallback((event: RealtimeEventEnvelope) => {
    observeClientMetric('feed.realtime.events_received.total', 1, { eventType: event.eventType })
    logClientTrace({
      traceId: String((event.payload as Record<string, unknown>)?.traceId ?? traceIdRef.current),
      message: 'Feed consumed realtime event',
      tags: { eventType: event.eventType, entityId: event.entityId },
    })
    if (event.eventType === 'post.liked' || event.eventType === 'post.unliked') {
      const postId = String(event.payload.postId ?? event.entityId)
      const direction = event.eventType === 'post.liked' ? 1 : -1
      patchFeed((post: FeedPost) => (post.id === postId ? { ...post, likes_count: Math.max(0, post.likes_count + direction) } : post))
      return
    }

    if (event.eventType === 'comment.created') {
      const postId = String(event.payload.postId ?? '')
      if (!postId) return
      patchFeed((post: FeedPost) => (post.id === postId ? { ...post, comments_count: post.comments_count + 1 } : post))
      return
    }

    if (event.eventType === 'post.created') {
      const postId = String(event.payload.postId || event.entityId)
      if (!postId) return
      
      // Fetch the full post details silently in the background
      fetch(`/api/feed/posts/${postId}`)
        .then(res => res.json())
        .then(payload => {
          if (payload.post) {
            mutateFeed((pages) => {
              if (!pages) return pages
              // De-duplicate: check if post already exists in any page
              const exists = pages.some(page => page.data.some(p => p.id === postId))
              if (exists) return pages

              // Inject at the top of the first page
              const newPages = [...pages]
              newPages[0] = {
                ...newPages[0],
                data: [payload.post, ...newPages[0].data]
              }
              return newPages
            }, false)
            
            toast.success('New post from the community', {
              description: payload.post.profiles?.full_name || 'Someone just posted',
              duration: 3000,
            })
          }
        })
        .catch(err => {
          console.error('Failed to fetch realtime post:', err)
          mutateFeed() // Fallback to full refresh on error
        })
      return
    }

    if (event.eventType === 'post.deleted') {
      const postId = String(event.entityId)
      mutateFeed((pages) => {
        if (!pages) return pages
        return pages.map(page => ({
          ...page,
          data: page.data.filter(p => p.id !== postId)
        }))
      }, false)
      return
    }

    if (event.eventType === 'post.updated') {
      mutateFeed() // Simple revalidate for updates
      return
    }

    if (event.eventType === 'follow.created' || event.eventType === 'follow.deleted') {
      mutateMembers()
      mutateOnlineUsers()
    }
  }, [mutateMembers, mutateOnlineUsers, patchFeed])


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
    onError: () => mutateFeed(),
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
      setRealtimeOnline(flattened)
    },
  })

  useEffect(() => {
    if (!observerRef.current || !hasMore || feedLoading) return
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        setSize((previous) => previous + 1)
      }
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
        : pathname
          ? `/api/file?pathname=${encodeURIComponent(pathname)}`
          : null
      if (!imageUrl) throw new Error('Upload completed but no image URL was returned')
      setNewPostImage(imageUrl)
      toast.success('Image uploaded')
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload image')
    } finally {
      setIsUploading(false)
    }
  }, [])

  const optimisticAddPost = useCallback((content: string, imageUrl: string | null, metadata?: Record<string, unknown>) => {
    const optimisticPost: FeedPost = {
      id: `optimistic-${Date.now()}`,
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

    mutateFeed((pages: FeedPage[] | undefined) => {
      if (!pages || pages.length === 0) {
        return [{ data: [optimisticPost], userLikes: [], userBookmarks: [], nextCursor: null }] as FeedPage[]
      }
      return [{ ...pages[0], data: [optimisticPost, ...pages[0].data] }, ...pages.slice(1)]
    }, false)
  }, [mutateFeed, profile, userId])

  const handlePostCreate = useCallback(async (opts?: { asShare?: boolean; sourcePost?: FeedPost | null; contentOverride?: string }) => {
    const content = opts?.contentOverride ?? newPostContent
    if (!userId || !content.trim()) return toast.error('Please write something to post')

    setIsPosting(true)
    trackFeedFunnelEvent({
      funnel: 'feed_engagement',
      step: 'interact',
      traceId: traceIdRef.current,
      metadata: { action: opts?.asShare ? 'share_post' : 'create_post' },
    })
    optimisticAddPost(content.trim(), newPostImage, opts?.asShare && opts.sourcePost ? {
      shared_post_id: opts.sourcePost.id,
      shared_author_name: opts.sourcePost.profiles?.full_name,
      shared_post_excerpt: opts.sourcePost.content.slice(0, 180),
    } : undefined)

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
        }),
      })

      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Failed to create post')

      setNewPostContent('')
      setNewPostImage(null)
      setShareTargetPost(null)
      setShareNote('')
      toast.success(opts?.asShare ? 'Shared to your feed' : 'Post created!')
      mutateFeed()
    } catch (error: any) {
      toast.error(error.message || 'Failed to create post')
      mutateFeed()
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

    patchFeed((post) => (post.id === postId ? { ...post, likes_count: Math.max(0, post.likes_count + (isLiked ? -1 : 1)) } : post))
    mutateFeed((pages: FeedPage[] | undefined) => pages?.map((page: FeedPage) => ({
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

  const handleCommentCreate = useCallback(async (postId: string, content: string) => {
    const trimmed = content.trim()
    if (!trimmed) return
    trackFeedFunnelEvent({
      funnel: 'feed_engagement',
      step: 'interact',
      traceId: traceIdRef.current,
      metadata: { action: 'comment', postId },
    })

    patchFeed((post) => (post.id === postId ? { ...post, comments_count: post.comments_count + 1 } : post))

    try {
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: trimmed }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Failed to comment')
    } catch (error: any) {
      toast.error(error.message || 'Failed to comment')
      mutateFeed()
    }
  }, [mutateFeed, patchFeed])

  const handleBookmark = useCallback(async (postId: string, isBookmarked: boolean) => {
    mutateFeed((pages: FeedPage[] | undefined) => pages?.map((page: FeedPage) => ({
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

  const handleUpdatePost = useCallback(async (postId: string, content: string) => {
    if (!content.trim()) return
    patchFeed((post) => (post.id === postId ? { ...post, content: content.trim() } : post))
    try {
      const response = await fetch(`/api/feed/posts/${postId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim() }),
      })
      if (!response.ok) throw new Error('Failed to update')
      toast.success('Post updated')
      setEditTargetPost(null)
      mutateFeed()
    } catch {
      toast.error('Failed to update post')
      mutateFeed()
    }
  }, [mutateFeed, patchFeed])

  const handleDeletePost = useCallback(async (postId: string) => {
    mutateFeed((pages: FeedPage[] | undefined) => pages?.map((page: FeedPage) => ({ ...page, data: page.data.filter((post: FeedPost) => post.id !== postId) })), false)
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

  const handleShare = async (p: FeedPost) => {
    try {
      const url = `${window.location.origin}/posts/${p.id}`
      await navigator.clipboard.writeText(url)
      toast.success('Link copied to clipboard!', {
        description: 'You can now share this post with your community.',
        icon: <Share2 className="h-4 w-4" />,
      })
    } catch (err) {
      toast.error('Failed to copy link')
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative">
      <style dangerouslySetInnerHTML={{ __html: ANIMATIONS_CSS }} />
      <aside className="hidden lg:block lg:col-span-3">
        <Card className="sticky top-20 glass-card">
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

      <main className="lg:col-span-6 space-y-6">
        <Card className="glass-card shadow-lg border-none">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || undefined} />
                <AvatarFallback>{profile?.full_name?.[0] || 'U'}</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-3">
                <Textarea placeholder="Share an update… use @name for mentions" value={newPostContent} onChange={(e) => setNewPostContent(e.target.value)} className="min-h-[80px] resize-none" />
                {newPostImage && (
                  <div className="relative inline-block">
                    <img src={newPostImage} alt="Upload preview" width={200} height={150} className="rounded-lg object-cover" />
                    <Button size="icon" variant="destructive" className="absolute -top-2 -right-2 h-6 w-6" onClick={() => setNewPostImage(null)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => document.getElementById('post-image-input')?.click()} disabled={isUploading}>
                      {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}<span className="ml-2 hidden sm:inline">Photo</span>
                    </Button>
                    <input id="post-image-input" type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleImageUpload(file); e.target.value = '' }} />
                  </div>
                  <Button onClick={() => handlePostCreate()} disabled={isPosting || !newPostContent.trim()} size="sm">
                    {isPosting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}Post
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white/5 p-1.5 rounded-xl border border-white/5 shadow-inner">
            <div className="flex items-center gap-1 w-full sm:w-auto overflow-x-auto no-scrollbar pb-1 sm:pb-0">
              {['all', 'general', 'announcement', 'event', 'discussion'].map((cat) => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? 'default' : 'ghost'}
                  size="sm"
                  className={cn(
                    'h-8 rounded-lg text-xs font-medium transition-all duration-300 px-3 shrink-0 capitalize',
                    selectedCategory === cat ? 'shadow-md scale-105' : 'text-muted-foreground hover:bg-white/10'
                  )}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat === 'all' ? 'All Feed' : cat}
                </Button>
              ))}
            </div>
            
            <div className="relative w-full sm:w-64 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input 
                placeholder="Search community..." 
                value={feedSearch}
                onChange={(e) => setFeedSearch(e.target.value)}
                className="h-8 pl-9 text-xs bg-muted/50 border-white/5 focus-visible:ring-primary/20 transition-all rounded-lg"
              />
              {feedSearch && (
                <button 
                  onClick={() => setFeedSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted"
                >
                  <X className="h-3 w-3 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4 relative">
          {feedValidating && (
            <div className="pointer-events-none absolute left-0 right-0 top-0 z-10 h-1 overflow-hidden rounded-full">
              <div className="feed-refresh-glow h-full w-1/2 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
            </div>
          )}
          {feedLoading ? (
            <>
              <PostSkeleton />
              <PostSkeleton />
              <PostSkeleton />
            </>
          ) : posts.length === 0 ? (
            <Card><CardContent className="p-8 text-center"><MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" /><h3 className="font-semibold mb-2">No posts yet</h3><p className="text-muted-foreground">Be the first to share something with the community!</p></CardContent></Card>
          ) : (
            posts.map((post: FeedPost, idx: number) => (
              <div key={post.id} className={cn(idx === 0 && !feedLoading ? 'animate-in-post' : '')}>
                <PostCard
                  post={post}
                  isOwner={post.author_id === userId}
                  isLiked={userLikes.has(post.id)}
                  isBookmarked={userBookmarks.has(post.id)}
                  onLike={() => handleLike(post.id, userLikes.has(post.id))}
                  onBookmark={() => handleBookmark(post.id, userBookmarks.has(post.id))}
                  onDelete={() => handleDeletePost(post.id)}
                  onEdit={() => setEditTargetPost(post)}
                  onComment={handleCommentCreate}
                  onOpenShare={() => {
                    setShareTargetPost(post)
                    setShareNote(`Sharing @${post.profiles?.full_name || 'community'}: `)
                    setNewPostContent('')
                  }}
                  onCopyLink={() => handleShare(post)}
                />
              </div>
            ))
          )}

          {isLoadingMore && (
            <>
              <PostSkeleton />
              <PostSkeleton />
            </>
          )}
          <div ref={observerRef} className="h-6" />
        </div>
      </main>

      <aside className="hidden lg:block lg:col-span-3">
        <Card className="sticky top-20 glass-card">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'online' | 'members')}>
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="online" className="text-xs transition-all data-[state=active]:bg-primary/20"><UserCheck className="h-3 w-3 mr-1" />Online ({mergedOnlineUsers.length})</TabsTrigger>
              <TabsTrigger value="members" className="text-xs transition-all data-[state=active]:bg-primary/20"><Users className="h-3 w-3 mr-1" />Members ({members.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="online" className="mt-0 animate-in fade-in duration-300">
              <ScrollArea className="h-[400px]">
                <div className="p-2">
                  {mergedOnlineUsers.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground py-8">No users online</p>
                  ) : (
                    mergedOnlineUsers.map((member: any) => <UserCard key={member.id} user={member} isOnline />)
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
            <TabsContent value="members" className="mt-0 animate-in fade-in duration-300">
              <div className="p-2">
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search members..." value={searchQuery} onChange={(e: any) => setSearchQuery(e.target.value)} className="pl-9 h-9 glass-input" />
                </div>
              </div>
              <ScrollArea className="h-[340px]">
                <div className="p-2 pt-0">
                  {filteredMembers.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground py-8">No members found</p>
                  ) : (
                    filteredMembers.map((member: any) => (
                      <UserCard 
                        key={member.id} 
                        user={member} 
                        isOnline={realtimeOnlineIds.has(member.id) || onlineUsers.some((u: any) => u.id === member.id)} 
                      />
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </Card>

        <Card className="mt-6 glass-card overflow-hidden border-none shadow-md">
          <CardHeader className="pb-2">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" /> Suggested
            </h4>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-white/5">
              {members.slice(0, 4).map((m: any) => (
                <div key={m.id} className="flex items-center gap-3 p-3 hover:bg-white/5 transition-colors group">
                  <Avatar className="h-8 w-8 ring-2 ring-transparent group-hover:ring-primary/20 transition-all">
                    <AvatarImage src={m.avatar_url} />
                    <AvatarFallback>{m.full_name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{m.full_name || 'Member'}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{m.profession || m.role || 'Community'}</p>
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 text-[10px] px-2 hover:bg-primary hover:text-primary-foreground">Follow</Button>
                </div>
              ))}
            </div>
            <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground rounded-none h-9 border-t border-white/5 hover:bg-white/5" onClick={() => setActiveTab('members')}>
              View all members
            </Button>
          </CardContent>
        </Card>

        <Card className="mt-6 glass-card border-none shadow-md">
          <CardHeader className="pb-3 border-b border-white/5">
            <h4 className="text-sm font-semibold">Trending Topics</h4>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-4">
              {[
                { tag: '#Ramadan2026', count: '2.4k posts', trend: 'up' },
                { tag: '#CommunitySpirit', count: '1.8k posts', trend: 'up' },
                { tag: '#FridayKhutbah', count: '950 posts', trend: 'neutral' },
              ].map((item) => (
                <div key={item.tag} className="group flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-all cursor-pointer glass-glint">
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold group-hover:text-primary transition-colors">{item.tag}</p>
                    <p className="text-xs text-muted-foreground">{item.count}</p>
                  </div>
                  {item.trend === 'up' && (
                    <Badge variant="outline" className="h-5 text-[10px] bg-green-500/10 text-green-500 border-none">Hot</Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

      </aside>

      <Dialog open={!!shareTargetPost} onOpenChange={(open) => !open && setShareTargetPost(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Share post with note</DialogTitle></DialogHeader>
          <Textarea value={shareNote} onChange={(e) => setShareNote(e.target.value)} placeholder="Add context, mention people with @name, and share." className="min-h-[100px]" />
          <Card className="bg-muted/40 border-dashed"><CardContent className="pt-4"><p className="text-sm text-muted-foreground">Sharing from</p><p className="font-medium">{shareTargetPost?.profiles?.full_name || 'Community Member'}</p><p className="text-sm line-clamp-3 mt-1">{shareTargetPost?.content}</p></CardContent></Card>
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

      <Dialog open={!!editTargetPost} onOpenChange={(open) => !open && setEditTargetPost(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Post</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={editTargetPost?.content || ''}
              onChange={(e) => editTargetPost && setEditTargetPost({ ...editTargetPost, content: e.target.value })}
              className="min-h-[120px]"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditTargetPost(null)}>Cancel</Button>
              <Button onClick={() => editTargetPost && handleUpdatePost(editTargetPost.id, editTargetPost.content)}>Save Changes</Button>
            </div>
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
  onEdit,
  onComment,
  onOpenShare,
  onCopyLink,
}: {
  post: FeedPost
  isOwner: boolean
  isLiked: boolean
  isBookmarked: boolean
  onLike: () => void
  onBookmark: () => void
  onDelete: () => void
  onEdit: () => void
  onComment: (postId: string, content: string) => Promise<void>
  onOpenShare: () => void
  onCopyLink: () => void
}) {
  const [showComments, setShowComments] = useState(false)
  const [commentInput, setCommentInput] = useState('')
  const [replyPrefix, setReplyPrefix] = useState('')

  const { data: commentsResponse, mutate: mutateComments } = useSWR<{ comments: PostComment[] }>(
    showComments ? `/api/posts/${post.id}/comments` : null,
    fetcher,
    { revalidateOnFocus: false }
  )

  const comments = commentsResponse?.comments ?? []

  const submitComment = async () => {
    const payload = `${replyPrefix}${commentInput}`.trim()
    if (!payload) return

    const optimisticComment: PostComment = {
      id: `temp-${Date.now()}`,
      content: payload,
      created_at: new Date().toISOString(),
      author_id: 'self',
      author: { id: 'self', full_name: 'You', avatar_url: null, role: 'user' },
    }

    mutateComments((current) => ({ comments: [...(current?.comments ?? []), optimisticComment] }), false)
    setCommentInput('')
    setReplyPrefix('')
    await onComment(post.id, payload)
    mutateComments()
  }

  return (
    <Card className="glass-card border-none shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
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
              <Link href={`/profile/${post.author_id}`} className="font-semibold hover:underline truncate block">
                {post.profiles?.full_name || 'Anonymous'}
                {(post.profiles?.role === 'admin' || post.profiles?.role === 'staff') && (
                  <Badge variant="secondary" className="ml-2 h-4 text-[9px] uppercase tracking-wider bg-primary/10 text-primary border-primary/20">
                    Staff
                  </Badge>
                )}
              </Link>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
                {post.metadata?.pinned_at && (
                  <Badge variant="ghost" className="h-4 p-0 px-1 text-[10px] bg-amber-500/10 text-amber-500 font-bold border-none">
                    Pinned
                  </Badge>
                )}
                <span>{post.profiles?.profession || post.profiles?.role || 'Member'}</span>
                <span>·</span>
                <span>{post.created_at && formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {isOwner && (
              <>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={onEdit}><ImageIcon className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <FormattedContent content={post.content} />

        {post.metadata?.shared_post_id && (
          <div className="rounded-md border border-dashed bg-muted/30 p-3 text-sm">
            <p className="text-muted-foreground">Shared post</p>
            <p className="font-medium">{String(post.metadata.shared_author_name || 'Community member')}</p>
            <p className="line-clamp-2">{String(post.metadata.shared_post_excerpt || 'View original content')}</p>
          </div>
        )}

        {post.image_url && !((post as any).media_urls?.length) && (
          <div className="w-full aspect-video rounded-lg overflow-hidden border">
            <img src={post.image_url} alt="Post image" className="h-full w-full object-cover" />
          </div>
        )}

        {(post as any).media_urls?.length > 0 && (
          <div className={cn(
            "grid gap-2 rounded-lg overflow-hidden border bg-muted/20",
            (post as any).media_urls.length === 1 ? "grid-cols-1" : "grid-cols-2"
          )}>
            {(post as any).media_urls.slice(0, 4).map((url: string, i: number) => (
              <div key={i} className={cn(
                "relative aspect-square",
                (post as any).media_urls.length === 3 && i === 0 ? "row-span-2 aspect-auto" : ""
              )}>
                <img src={url} alt={`Post media ${i}`} className="h-full w-full object-cover" />
                {(post as any).media_urls.length > 4 && i === 3 && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-bold text-lg">
                    +{(post as any).media_urls.length - 4}
                  </div>
                )}
              </div>
            ))}
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
            className={cn('gap-2 transition-all active:scale-95 px-3', isLiked && 'text-red-500 bg-red-500/5 hover:bg-red-500/10')} 
            onClick={onLike}
          >
            <Heart className={cn('h-4 w-4 transition-transform', isLiked && 'fill-current heart-pulse')} />
            Like
          </Button>
          <Button variant="ghost" size="sm" className="gap-2 active:scale-95 px-3" onClick={() => setShowComments((v) => !v)}>
            <MessageCircle className="h-4 w-4" />
            Comment
          </Button>
          <Button variant="ghost" size="sm" className="gap-2 active:scale-95 px-3" onClick={onOpenShare}>
            <Repeat2 className="h-4 w-4" />
            Repost
          </Button>
          <Button variant="ghost" size="sm" className="gap-2 active:scale-95 px-3" onClick={onCopyLink}>
            <Share2 className="h-4 w-4" />
            Share
          </Button>
          <Button variant="ghost" size="sm" className={cn('gap-2 active:scale-95 px-3', isBookmarked && 'text-primary bg-primary/5')} onClick={onBookmark}>
            <AtSign className="h-4 w-4" />
            Bookmark
          </Button>
        </div>

        {showComments && (
          <div className="space-y-3 border-t pt-3">
            {replyPrefix && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><Reply className="h-3.5 w-3.5" /><span>Replying with prefix: <strong>{replyPrefix}</strong></span><Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => setReplyPrefix('')}>Clear</Button></div>
            )}
            <div className="flex gap-2">
              <Input value={commentInput} onChange={(e) => setCommentInput(e.target.value)} placeholder="Comment… use @name and hit Enter" onKeyDown={(e) => e.key === 'Enter' && submitComment()} />
              <Button onClick={submitComment} disabled={!commentInput.trim()}><Send className="h-4 w-4" /></Button>
            </div>

            {comments.map((comment) => (
              <div key={comment.id} className="rounded-md bg-muted/40 p-2.5">
                <div className="flex items-center justify-between gap-3">
                  <Link href={`/profile/${comment.author_id}`} className="text-xs font-medium hover:underline">{comment.author?.full_name || 'Member'}</Link>
                  <button className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setReplyPrefix(`@${comment.author?.full_name || 'member'} `)}>Reply</button>
                </div>
                <p className="text-sm mt-1 whitespace-pre-wrap">{comment.content}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
