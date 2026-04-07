"use client"

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import useSWR from 'swr'
import useSWRInfinite from 'swr/infinite'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import {
  Heart, MessageCircle, Share2, ImageIcon, Video, Loader2, Search, Users, UserCheck, Send, X, Trash2, Bookmark, Reply, Repeat2, ArrowUp, Link2, Check,
  MoreHorizontal, Calendar, MapPin, CheckCircle, Quote, Megaphone, HandHeart, BookOpen, Building2, User, Shield, ChevronDown
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { usePresence } from '@/lib/hooks/use-realtime'
import { useRealtimeGateway } from '@/lib/hooks/use-realtime-gateway'
import type { RealtimeEventEnvelope } from '@/backend/realtime/types'
import { cn } from '@/lib/utils'

interface FeedPost {
  id: string
  content: string
  image_url: string | null
  post_type: string
  category: string
  visibility: string
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
    verified?: boolean
  } | null
  metadata?: {
    shared_post_id?: string
    shared_author_name?: string
    shared_post_excerpt?: string
    [key: string]: unknown
  } | null
  eventDetails?: {
    title: string
    date: string
    location: string
  }
  quoteSource?: string
}

interface FeedPage {
  data: FeedPost[]
  userLikes: string[]
  userBookmarks: string[]
  nextCursor: string | null
  totalCount?: number | null
}

const fetcher = async <T,>(url: string): Promise<T> => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json() as Promise<T>
}

function PostSkeleton() {
  return (
    <Card className="feed-glass post-enter">
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

function UserCard({ user: member, isOnline = false, currentUserId, onFollowToggle }: any) {
  const [isFollowing, setIsFollowing] = useState(member.isFollowing || false)
  const [isToggling, setIsToggling] = useState(false)
  const isSelf = currentUserId === member.id

  const handleFollowToggle = useCallback(async () => {
    if (!currentUserId || isSelf || isToggling) return
    const next = !isFollowing
    setIsFollowing(next)
    setIsToggling(true)
    try {
      const res = await fetch(`/api/users/${member.id}/follow`, { method: next ? 'POST' : 'DELETE' })
      if (!res.ok) throw new Error('Failed')
      onFollowToggle?.(member.id, next)
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
      {currentUserId && !isSelf && (
        <Button variant={isFollowing ? 'secondary' : 'outline'} size="sm" className="h-7 px-2 text-xs shrink-0 rounded-full" onClick={handleFollowToggle} disabled={isToggling}>
          {isToggling ? <Loader2 className="h-3 w-3 animate-spin" /> : isFollowing ? <><UserCheck className="h-3 w-3 mr-1" />Following</> : "Follow"}
        </Button>
      )}
    </div>
  )
}

export function EnhancedSocialFeed() {
  const { userId, profile, resolvedRole } = useAuth()
  const [activeTab, setActiveTab] = useState<'all' | 'following' | 'announcements' | 'prayer-requests'>('all')
  const [postSearchQuery, setPostSearchQuery] = useState('')
  const [isComposeExpanded, setIsComposeExpanded] = useState(false)
  const [newPostContent, setNewPostContent] = useState('')
  const [newPostType, setNewPostType] = useState('text')
  const [newPostCategory, setNewPostCategory] = useState('general')
  const [newPostImage, setNewPostImage] = useState<string | null>(null)
  const [isPosting, setIsPosting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [newPostsCount, setNewPostsCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  
  const observerRef = useRef<HTMLDivElement | null>(null)

  const getKey = useCallback((pageIndex: number, previousPageData: FeedPage | null) => {
    if (!userId) return null
    if (previousPageData && !previousPageData.nextCursor) return null
    const params = new URLSearchParams({ limit: '20' })
    if (pageIndex > 0 && previousPageData?.nextCursor) params.set('cursor', previousPageData.nextCursor)
    return `/api/feed/posts?${params.toString()}`
  }, [userId])

  const { data: feedPages, mutate: mutateFeed, size, setSize, isLoading: feedLoading, isValidating: feedValidating } = useSWRInfinite<FeedPage>(getKey, fetcher, { keepPreviousData: true })

  const { data: onlineUsersData } = useSWR(userId ? '/api/users/online' : null, fetcher, { keepPreviousData: true })
  const membersUrl = useMemo(() => {
    if (!userId) return null
    const params = new URLSearchParams()
    if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim())
    return `/api/users/community${params.size ? `?${params.toString()}` : ''}`
  }, [userId, debouncedSearch])
  const { data: membersData, mutate: mutateMembers } = useSWR(membersUrl, fetcher, { keepPreviousData: true })
  
  const posts = useMemo(() => {
    let allPosts = feedPages?.flatMap((page) => page.data) ?? []
    if (postSearchQuery.trim()) {
      const q = postSearchQuery.toLowerCase()
      allPosts = allPosts.filter((p) => p.content.toLowerCase().includes(q) || p.profiles?.full_name?.toLowerCase().includes(q))
    }
    if (activeTab === 'prayer-requests') allPosts = allPosts.filter(p => p.post_type === 'prayer-request')
    if (activeTab === 'announcements') allPosts = allPosts.filter(p => p.post_type === 'announcement' || p.category === 'announcement')
    // 'following' filter relies on backend or we mock it if API doesn't support it yet
    return allPosts
  }, [feedPages, postSearchQuery, activeTab])

  const userLikes = useMemo(() => new Set(feedPages?.flatMap((page) => page.userLikes) ?? []), [feedPages])
  const userBookmarks = useMemo(() => new Set(feedPages?.flatMap((page) => page.userBookmarks) ?? []), [feedPages])
  const onlineUsers = (onlineUsersData as any)?.data || []
  const members = (membersData as any)?.data || []
  const hasMore = !!feedPages?.[feedPages.length - 1]?.nextCursor
  const isLoadingMore = feedValidating && feedPages && feedPages.length === size && hasMore

  const patchFeed = useCallback((fn: (post: FeedPost) => FeedPost) => {
    mutateFeed((pages) => !pages ? pages : pages.map((page) => ({ ...page, data: page.data.map(fn) })), false)
  }, [mutateFeed])

  const handleRealtimeEvent = useCallback((event: RealtimeEventEnvelope) => {
    const isSelf = event.actorUserId === userId
    if (event.eventType === 'post.liked' || event.eventType === 'post.unliked') {
      if (isSelf) return
      const postId = String(event.payload.postId ?? event.entityId)
      const direction = event.eventType === 'post.liked' ? 1 : -1
      patchFeed((post) => post.id === postId ? { ...post, likes_count: Math.max(0, post.likes_count + direction) } : post)
    } else if (event.eventType === 'comment.created') {
      if (isSelf) return
      const postId = String(event.payload.postId ?? '')
      if (postId) patchFeed((post) => post.id === postId ? { ...post, comments_count: post.comments_count + 1 } : post)
    } else if (event.eventType === 'post.created') {
      if (!isSelf) setNewPostsCount(p => p + 1)
    } else if (event.eventType === 'post.deleted') {
      const postId = String(event.payload.postId ?? event.entityId)
      mutateFeed((pages) => pages?.map(page => ({ ...page, data: page.data.filter(p => p.id !== postId) })), false)
    }
  }, [mutateFeed, patchFeed, userId])

  useRealtimeGateway({ enabled: !!userId, feedStreamId: 'home', onEvent: handleRealtimeEvent })
  usePresence({ channelName: 'community-presence', userId: userId || '', enabled: !!userId })

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

  const refreshFeedPosts = async () => {
    setNewPostsCount(0)
    try {
      const freshPage: FeedPage = await fetcher('/api/feed/posts?limit=20')
      mutateFeed(pages => {
        if (!pages) return [freshPage]
        const existingIds = new Set(pages.flatMap(p => p.data.map(post => post.id)))
        const newP = freshPage.data.filter(p => !existingIds.has(p.id))
        return newP.length ? [{ ...pages[0], data: [...newP, ...pages[0].data] }, ...pages.slice(1)] : pages
      }, false)
    } catch { mutateFeed() }
  }

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) return toast.error('Please select an image or video file')
    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      if (!res.ok) throw new Error()
      const { url } = await res.json()
      setNewPostImage(url)
    } catch { toast.error('Upload failed') }
    finally { setIsUploading(false) }
  }

  const handlePostCreate = async () => {
    if (!newPostContent.trim()) return toast.error('Empty post')
    setIsPosting(true)
    const tempId = `optimistic-${Date.now()}`
    const opt: FeedPost = {
      id: tempId, content: newPostContent.trim(), image_url: newPostImage, created_at: new Date().toISOString(), author_id: userId || '', likes_count: 0, comments_count: 0, post_type: newPostType, category: newPostCategory, visibility: 'public',
      profiles: { id: userId || '', full_name: profile?.full_name || 'You', avatar_url: profile?.avatar_url || null, profession: (profile as any)?.profession || null, role: profile?.role || 'user' }
    }
    
    mutateFeed(pages => pages ? [{ ...pages[0], data: [opt, ...pages[0].data] }, ...pages.slice(1)] : [{ data: [opt], userLikes: [], userBookmarks: [], nextCursor: null }], false)
    
    try {
      const res = await fetch('/api/feed/posts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: newPostContent.trim(), image_url: newPostImage, post_type: newPostType, category: newPostCategory }) })
      const { post } = await res.json()
      mutateFeed(pages => pages?.map(p => ({ ...p, data: p.data.map(px => px.id === tempId ? { ...post, content: post.body, likes_count: post.like_count||0, comments_count: post.comment_count||0 } : px) })), false)
      setNewPostContent('')
      setNewPostImage(null)
      setIsComposeExpanded(false)
      toast.success('Post created!')
    } catch {
      mutateFeed()
      toast.error('Failed to post')
    } finally { setIsPosting(false) }
  }

  const handleLike = async (postId: string, isLiked: boolean) => {
    patchFeed(p => p.id === postId ? { ...p, likes_count: Math.max(0, p.likes_count + (isLiked ? -1 : 1)) } : p)
    mutateFeed(pages => pages?.map(p => ({ ...p, userLikes: isLiked ? p.userLikes.filter(id => id !== postId) : [...new Set([...p.userLikes, postId])] })), false)
    try { await fetch(`/api/posts/${postId}/like`, { method: isLiked ? 'DELETE' : 'POST' }) } catch { mutateFeed() }
  }

  const handleBookmark = async (postId: string, isBookmarked: boolean) => {
    mutateFeed(pages => pages?.map(p => ({ ...p, userBookmarks: isBookmarked ? p.userBookmarks.filter(id => id !== postId) : [...new Set([...p.userBookmarks, postId])] })), false)
    try { await fetch('/api/feed/bookmarks', { method: isBookmarked ? 'DELETE' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ postId }) }) } catch { mutateFeed() }
  }

  const handleDeletePost = async (postId: string) => {
    mutateFeed(pages => pages?.map(p => ({ ...p, data: p.data.filter(x => x.id !== postId) })), false)
    try { await fetch(`/api/feed/posts/${postId}`, { method: 'DELETE' }); toast.success('Deleted') } catch { mutateFeed(); toast.error('Failed to delete') }
  }

  if (!userId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Users className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Join the Community</h2>
        <Button asChild className="rounded-full mt-4"><Link href="/sign-in">Sign In</Link></Button>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-20">
      {/* Left Sidebar */}
      <aside className="hidden lg:block lg:col-span-3 space-y-6">
        <Card className="sticky top-20 feed-glass border-border/40 shadow-sm overflow-hidden">
          <div className="h-20 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent"></div>
          <CardContent className="p-6 pt-0 relative flex flex-col items-center text-center">
            <Avatar className="h-24 w-24 border-4 border-background -mt-12 mb-3 shadow-sm">
              <AvatarImage src={profile?.avatar_url || ''} />
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl">{profile?.full_name?.[0]}</AvatarFallback>
            </Avatar>
            <h3 className="font-bold text-lg">{profile?.full_name || 'Welcome'}</h3>
            <p className="text-xs text-muted-foreground mb-3">{profile?.email}</p>
            <Badge variant="secondary" className="capitalize rounded-full px-3">{resolvedRole || 'Member'}</Badge>
            <Link href="/profile" className="w-full mt-4"><Button variant="outline" className="w-full rounded-full">My Profile</Button></Link>
          </CardContent>
        </Card>
      </aside>

      {/* Main Feed */}
      <main className="lg:col-span-6 space-y-4">
        {/* Compose */}
        <Card className={cn("feed-glass border-border/40 transition-all duration-300", isComposeExpanded ? "shadow-md" : "shadow-sm")}>
          <CardContent className="p-4">
            <div className="flex gap-3">
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarImage src={profile?.avatar_url || ''} />
                <AvatarFallback>{profile?.full_name?.[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-3">
                <Textarea 
                  placeholder="What's happening in your community?" 
                  className={cn("resize-none border-none bg-transparent focus-visible:ring-0 p-2 text-base transition-all", isComposeExpanded ? "min-h-[100px]" : "min-h-[40px]")}
                  onFocus={() => setIsComposeExpanded(true)}
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                />
                {(isComposeExpanded || newPostImage) && (
                  <div className="animate-in fade-in slide-in-from-top-2">
                    {newPostImage && (
                      <div className="relative inline-block mb-3">
                        {newPostImage.match(/\.(mp4|webm|mov|quicktime)$/i) ? (
                           <video src={newPostImage} controls className="rounded-xl max-h-48 object-cover border border-border/50" />
                        ) : (
                           <img src={newPostImage} alt="Upload" className="rounded-xl max-h-48 object-cover border border-border/50" />
                        )}
                        <Button size="icon" variant="destructive" className="absolute top-2 right-2 h-7 w-7 rounded-full shadow-sm" onClick={() => setNewPostImage(null)}><X className="h-3 w-3" /></Button>
                      </div>
                    )}
                    
                    <div className="flex flex-wrap gap-2 mb-3">
                      {['text','announcement','prayer-request','quote','event'].map((type) => (
                        <Badge 
                          key={type} 
                          variant={newPostType === type ? 'default' : 'secondary'} 
                          className="cursor-pointer hover:bg-primary/80 capitalize rounded-full px-3 py-1 text-xs"
                          onClick={() => setNewPostType(type)}
                        >
                          {type.replace('-', ' ')}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex items-center justify-between border-t border-border/50 pt-3">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="rounded-full text-primary hover:bg-primary/10" onClick={() => document.getElementById('img-upload')?.click()} title="Upload Image or Video" disabled={isUploading}>
                          {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><ImageIcon className="h-5 w-5 mr-1" /><Video className="h-5 w-5" /></>}
                        </Button>
                        <input id="img-upload" type="file" accept="image/*,video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if(f) handleImageUpload(f) }} />
                      </div>
                      <div className="flex items-center gap-3">
                        <Button variant="ghost" size="sm" className="rounded-full text-xs" onClick={() => { setIsComposeExpanded(false); setNewPostContent(''); setNewPostImage(null) }}>Cancel</Button>
                        <Button className="rounded-full px-6 font-semibold shadow-sm" onClick={handlePostCreate} disabled={!newPostContent.trim() || isPosting || isUploading}>
                          {isPosting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Post"}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <div className="flex bg-background/80 backdrop-blur top-14 sticky z-20 py-2 border-b border-border/40">
          {['all', 'following', 'announcements', 'prayer-requests'].map((tab) => (
             <button 
               key={tab} 
               onClick={() => setActiveTab(tab as any)}
               className={cn(
                 "px-4 py-2 text-sm font-semibold capitalize transition-all relative flex-1 text-center border-b-2",
                 activeTab === tab ? "text-primary border-primary" : "text-muted-foreground border-transparent hover:text-foreground hover:bg-muted/30"
               )}
             >
               {tab.replace('-', ' ')}
             </button>
          ))}
        </div>

        {/* New Posts Banner */}
        {newPostsCount > 0 && (
          <div className="flex justify-center sticky top-32 z-30 animate-in fade-in slide-in-from-top-4">
            <Button className="rounded-full shadow-lg bg-primary hover:bg-primary/90 hover:scale-105 transition-all text-sm font-bold" onClick={refreshFeedPosts}>
              <ArrowUp className="w-4 h-4 mr-2" /> {newPostsCount} New Post{newPostsCount>1?'s':''}
            </Button>
          </div>
        )}

        {/* Posts */}
        <div className="space-y-4">
          {feedLoading && posts.length === 0 ? <><PostSkeleton /><PostSkeleton /></> : 
           posts.length === 0 ? <div className="text-center py-20 text-muted-foreground">No posts found.</div> :
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
             />
           ))}
          {isLoadingMore && <PostSkeleton />}
          <div ref={observerRef} className="h-10" />
        </div>
      </main>

      {/* Right Sidebar */}
      <aside className="hidden lg:block lg:col-span-3 space-y-6">
        <Card className="sticky top-20 feed-glass border-border/40 shadow-sm">
          <CardHeader className="pb-2 border-b border-border/40">
             <h3 className="font-semibold flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> Community</h3>
          </CardHeader>
          <CardContent className="p-0">
             <ScrollArea className="h-[400px] p-2">
                {members.slice(0, 10).map((member: any) => (
                  <UserCard key={member.id} user={member} currentUserId={userId} isOnline={onlineUsers.some((u:any) => u.id === member.id)} onFollowToggle={() => mutateMembers()} />
                ))}
             </ScrollArea>
          </CardContent>
        </Card>
      </aside>
    </div>
  )
}

function PostCard({ post, isOwner, isLiked, isBookmarked, onLike, onBookmark, onDelete }: any) {
  const [copied, setCopied] = useState(false)
  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/feed?post=${post.id}`)
    setCopied(true)
    toast.success('Link copied')
    setTimeout(() => setCopied(false), 2000)
  }

  const getPostTypeIcon = (type: string) => {
    switch (type) {
      case 'quote': return <Quote className="h-3 w-3" />
      case 'announcement': return <Megaphone className="h-3 w-3" />
      case 'event': return <Calendar className="h-3 w-3" />
      case 'prayer-request': return <HandHeart className="h-3 w-3" />
      default: return null
    }
  }

  const getRoleColor = (role: string) => {
    switch(role) {
      case 'imam': return 'bg-amber-100 text-amber-800 border-amber-200'
      case 'shura': return 'bg-teal-100 text-teal-800 border-teal-200'
      case 'mosque': return 'bg-emerald-100 text-emerald-800 border-emerald-200'
      default: return 'bg-muted text-muted-foreground border-border'
    }
  }

  return (
    <Card className="feed-glass border-border/40 shadow-sm post-enter overflow-hidden group">
      <CardHeader className="p-4 pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
             <Link href={`/profile/${post.author_id}`}>
                <Avatar className="h-11 w-11 hover:ring-2 hover:ring-primary/50 transition-all cursor-pointer">
                   <AvatarImage src={post.profiles?.avatar_url} />
                   <AvatarFallback className="bg-primary/10 text-primary font-bold">{post.profiles?.full_name?.[0]}</AvatarFallback>
                </Avatar>
             </Link>
             <div>
                <div className="flex items-center gap-1.5">
                   <Link href={`/profile/${post.author_id}`} className="font-semibold text-[15px] hover:underline hover:text-primary transition-colors">
                     {post.profiles?.full_name}
                   </Link>
                   {post.profiles?.verified && <CheckCircle className="h-4 w-4 text-primary fill-primary/10" />}
                   {post.profiles?.role !== 'user' && post.profiles?.role && (
                     <Badge variant="outline" className={cn("text-[10px] px-1.5 h-4 ml-1", getRoleColor(post.profiles.role))}>
                        {post.profiles.role.toUpperCase()}
                     </Badge>
                   )}
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                   {post.created_at ? formatDistanceToNow(new Date(post.created_at)) + ' ago' : 'Just now'}
                   {post.visibility !== 'public' && <span className="opacity-70">&middot; {post.visibility}</span>}
                </p>
             </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl border-border/50">
              <DropdownMenuItem onClick={handleCopyLink}><Link2 className="h-4 w-4 mr-2" /> Copy link</DropdownMenuItem>
              {isOwner && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onDelete} className="text-destructive focus:bg-destructive/10"><Trash2 className="h-4 w-4 mr-2" /> Delete</DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent className="px-4 py-2">
         {post.post_type !== 'text' && (
           <Badge variant="secondary" className="mb-3 capitalize gap-1.5 rounded-full px-2.5 py-0.5 border-primary/20 bg-primary/5 text-primary text-xs">
             {getPostTypeIcon(post.post_type)} {post.post_type.replace('-',' ')}
           </Badge>
         )}
         
         <div className="text-[15px] leading-relaxed whitespace-pre-wrap font-normal">{post.content}</div>
         
         {post.quoteSource && (
           <p className="mt-3 text-sm italic text-muted-foreground border-l-2 border-primary/30 pl-3 py-1">
              — {post.quoteSource}
           </p>
         )}

         {post.image_url && (
           <div className="mt-4 -mx-4 sm:mx-0 overflow-hidden sm:rounded-xl">
             {post.image_url.match(/\.(mp4|webm|mov|quicktime)$/i) ? (
               <video src={post.image_url} controls className="w-full max-h-[500px] bg-black" />
             ) : (
               <img src={post.image_url} className="w-full object-cover max-h-[500px] hover:opacity-95 transition-opacity" loading="lazy" alt="Post attachment" />
             )}
           </div>
         )}
      </CardContent>

      <CardFooter className="px-4 py-3 flex items-center justify-between border-t border-border/30 bg-muted/10">
         <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className={cn("rounded-full gap-2 px-3 hover:bg-rose-500/10 hover:text-rose-600 transition-colors", isLiked && "text-rose-600")} onClick={onLike}>
               <Heart className={cn("h-4 w-4", isLiked && "fill-rose-600 like-bounce")} />
               <span className="text-xs font-medium">{post.likes_count > 0 ? post.likes_count : 'Like'}</span>
            </Button>
            <Button variant="ghost" size="sm" className="rounded-full gap-2 px-3 hover:bg-blue-500/10 hover:text-blue-600 transition-colors">
               <MessageCircle className="h-4 w-4" />
               <span className="text-xs font-medium">{post.comments_count > 0 ? post.comments_count : 'Comment'}</span>
            </Button>
            <Button variant="ghost" size="sm" className="rounded-full hidden sm:flex gap-2 px-3 hover:bg-green-500/10 hover:text-green-600 transition-colors" onClick={handleCopyLink}>
               <Share2 className="h-4 w-4" />
               <span className="text-xs font-medium">Share</span>
            </Button>
         </div>
         <Button variant="ghost" size="icon" className={cn("rounded-full h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors", isBookmarked && "text-primary")} onClick={onBookmark}>
            <Bookmark className={cn("h-4 w-4", isBookmarked && "fill-current")} />
         </Button>
      </CardFooter>
    </Card>
  )
}
