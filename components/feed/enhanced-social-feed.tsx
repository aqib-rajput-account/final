'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import useSWR from 'swr'
import { useAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
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
  MoreHorizontal,
  Trash2
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import Image from 'next/image'
import { formatDistanceToNow } from 'date-fns'
import { useRealtimeSubscription, usePresence } from '@/lib/hooks/use-realtime'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    const error = new Error('Failed to fetch')
    throw error
  }
  return res.json()
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

function UserCard({ user: member, isOnline = false }: { user: any; isOnline?: boolean }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
      <div className="relative">
        <Avatar className="h-10 w-10">
          <AvatarImage src={member.avatar_url} alt={member.full_name} />
          <AvatarFallback>{member.full_name?.[0] || 'U'}</AvatarFallback>
        </Avatar>
        {isOnline && (
          <span className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 border-2 border-background rounded-full" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <Link href={`/profile/${member.id}`} className="font-medium text-sm hover:underline truncate block">
          {member.full_name || 'Anonymous'}
        </Link>
        <p className="text-xs text-muted-foreground truncate">
          {member.profession || member.role || 'Member'}
        </p>
      </div>
      {isOnline && (
        <Badge variant="secondary" className="text-xs shrink-0">Online</Badge>
      )}
    </div>
  )
}

export function EnhancedSocialFeed() {
  const { userId, profile } = useAuth()
  const [newPostContent, setNewPostContent] = useState('')
  const [newPostImage, setNewPostImage] = useState<string | null>(null)
  const [isPosting, setIsPosting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'feed' | 'online' | 'members'>('feed')
  const [realtimeOnline, setRealtimeOnline] = useState<Record<string, any>>({})

  // Fetch feed posts with SWR for auto-refresh - defined first so realtime can use mutateFeed
  const { data: feedData, mutate: mutateFeed, isLoading: feedLoading, error: feedError } = useSWR(
    userId ? '/api/feed/posts?limit=20&offset=0' : null,
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
      refreshInterval: 15000,
    }
  )

  // Fetch online users with SWR
  const { data: onlineUsersData, mutate: mutateOnlineUsers } = useSWR(
    userId ? '/api/users/online' : null,
    fetcher,
    {
      revalidateOnFocus: true,
      dedupingInterval: 10000,
      refreshInterval: 30000,
    }
  )

  // Fetch community members with SWR
  const { data: membersData, mutate: mutateMembers } = useSWR(
    userId ? '/api/users/community' : null,
    fetcher,
    {
      revalidateOnFocus: true,
      dedupingInterval: 10000,
      refreshInterval: 60000,
    }
  )

  const posts = feedData?.data || []
  const onlineUsers = onlineUsersData?.data || []
  const members = membersData?.data || []
  const userLikes = feedData?.userLikes || []

  // Filter members based on search
  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return members
    const query = searchQuery.toLowerCase()
    return members.filter((member: any) =>
      member.full_name?.toLowerCase().includes(query) ||
      member.profession?.toLowerCase().includes(query) ||
      member.role?.toLowerCase().includes(query)
    )
  }, [members, searchQuery])

  const realtimeOnlineIds = useMemo(
    () => new Set(Object.keys(realtimeOnline)),
    [realtimeOnline]
  )

  const mergedOnlineUsers = useMemo(() => {
    const byId = new Map<string, any>()

    onlineUsers.forEach((member: any) => byId.set(member.id, member))
    members
      .filter((member: any) => realtimeOnlineIds.has(member.id))
      .forEach((member: any) => byId.set(member.id, member))

    return Array.from(byId.values())
  }, [members, onlineUsers, realtimeOnlineIds])

  const handleImageUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB')
      return
    }

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      const { pathname } = await response.json()
      // For private blob storage, use the file API route
      const imageUrl = `/api/file?pathname=${encodeURIComponent(pathname)}`
      setNewPostImage(imageUrl)
      toast.success('Image uploaded')
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload image')
    } finally {
      setIsUploading(false)
    }
  }, [])

  const handlePostCreate = useCallback(async () => {
    if (!userId || !newPostContent.trim()) {
      toast.error('Please write something to post')
      return
    }

    setIsPosting(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('posts')
        .insert({
          author_id: userId,
          content: newPostContent.trim(),
          image_url: newPostImage,
          is_published: true,
        })

      if (error) throw error

      setNewPostContent('')
      setNewPostImage(null)
      toast.success('Post created!')
      mutateFeed()
    } catch (error: any) {
      toast.error(error.message || 'Failed to create post')
    } finally {
      setIsPosting(false)
    }
  }, [userId, newPostContent, newPostImage, mutateFeed])

  const handleLike = useCallback(async (postId: string, isLiked: boolean) => {
    if (!userId) {
      toast.error('Please sign in to like posts')
      return
    }

    try {
      const supabase = createClient()
      if (isLiked) {
        await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', userId)
      } else {
        await supabase
          .from('post_likes')
          .insert({ post_id: postId, user_id: userId })
      }
      mutateFeed()
    } catch (error: any) {
      toast.error('Failed to update like')
    }
  }, [userId, mutateFeed])

  const handleDeletePost = useCallback(async (postId: string) => {
    if (!userId) return

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId)
        .eq('author_id', userId)

      if (error) throw error
      toast.success('Post deleted')
      mutateFeed()
    } catch (error: any) {
      toast.error('Failed to delete post')
    }
  }, [userId, mutateFeed])

  useRealtimeSubscription({
    table: 'posts',
    event: '*',
    enabled: !!userId,
    onChange: () => {
      mutateFeed()
    },
  })

  useRealtimeSubscription({
    table: 'post_likes',
    event: '*',
    enabled: !!userId,
    onChange: () => {
      mutateFeed()
    },
  })

  useRealtimeSubscription({
    table: 'post_comments',
    event: '*',
    enabled: !!userId,
    onChange: () => {
      mutateFeed()
    },
  })

  useRealtimeSubscription({
    table: 'profiles',
    event: '*',
    enabled: !!userId,
    onChange: () => {
      mutateMembers()
      mutateOnlineUsers()
    },
  })

  usePresence({
    channelName: 'community-presence',
    userId: userId || '',
    userInfo: {
      full_name: profile?.full_name,
      avatar_url: profile?.avatar_url,
      role: profile?.role,
    },
    enabled: !!userId,
    onSync: (state) => {
      const flattened = Object.entries(state).reduce<Record<string, any>>((acc, [key, presences]) => {
        if (presences.length > 0) {
          acc[key] = presences[0]
        }
        return acc
      }, {})

      setRealtimeOnline(flattened)
    },
  })

  // Show login prompt if not authenticated
  if (!userId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Users className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Join the Community</h2>
        <p className="text-muted-foreground mb-6 max-w-md">
          Sign in to connect with other members, share posts, and stay updated with the community.
        </p>
        <div className="flex gap-3">
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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Sidebar - User Profile */}
      <aside className="hidden lg:block lg:col-span-3">
        <Card className="sticky top-20">
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center">
              <Avatar className="h-20 w-20 mb-4">
                <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || undefined} />
                <AvatarFallback className="text-2xl">
                  {profile?.full_name?.[0] || 'U'}
                </AvatarFallback>
              </Avatar>
              <h3 className="font-semibold text-lg">{profile?.full_name || 'Welcome!'}</h3>
              <p className="text-sm text-muted-foreground mb-2">{(profile as any)?.profession || 'Community Member'}</p>
              <Badge variant="secondary" className="capitalize">{profile?.role || 'member'}</Badge>
              
              <div className="w-full mt-6 pt-4 border-t space-y-2">
                <Link href="/profile" className="block">
                  <Button variant="outline" className="w-full" size="sm">View Profile</Button>
                </Link>
                <Link href="/settings" className="block">
                  <Button variant="ghost" className="w-full" size="sm">Settings</Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </aside>

      {/* Main Feed */}
      <main className="lg:col-span-6 space-y-6">
        {/* Create Post Card */}
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-3">
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || undefined} />
                <AvatarFallback>{profile?.full_name?.[0] || 'U'}</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-3">
                <Textarea
                  placeholder="What's on your mind?"
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  className="min-h-[80px] resize-none"
                />
                
                {newPostImage && (
                  <div className="relative inline-block">
                    <Image
                      src={newPostImage}
                      alt="Upload preview"
                      width={200}
                      height={150}
                      className="rounded-lg object-cover"
                    />
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute -top-2 -right-2 h-6 w-6"
                      onClick={() => setNewPostImage(null)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => document.getElementById('post-image-input')?.click()}
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ImageIcon className="h-4 w-4" />
                      )}
                      <span className="ml-2 hidden sm:inline">Photo</span>
                    </Button>
                    <input
                      id="post-image-input"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleImageUpload(file)
                        e.target.value = ''
                      }}
                    />
                  </div>
                  <Button 
                    onClick={handlePostCreate} 
                    disabled={isPosting || !newPostContent.trim()}
                    size="sm"
                  >
                    {isPosting ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Post
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Posts Feed */}
        <div className="space-y-4">
          {feedLoading ? (
            <>
              <PostSkeleton />
              <PostSkeleton />
              <PostSkeleton />
            </>
          ) : feedError ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">Failed to load posts. Please try again.</p>
                <Button variant="outline" className="mt-4" onClick={() => mutateFeed()}>
                  Retry
                </Button>
              </CardContent>
            </Card>
          ) : posts.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold mb-2">No posts yet</h3>
                <p className="text-muted-foreground">Be the first to share something with the community!</p>
              </CardContent>
            </Card>
          ) : (
            posts.map((post: any) => {
              const isLiked = userLikes.includes(post.id)
              const isOwner = post.author_id === userId
              
              return (
                <Card key={post.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Link href={`/profile/${post.author_id}`}>
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={post.profiles?.avatar_url} alt={post.profiles?.full_name} />
                            <AvatarFallback>{post.profiles?.full_name?.[0] || 'U'}</AvatarFallback>
                          </Avatar>
                        </Link>
                        <div>
                          <Link href={`/profile/${post.author_id}`} className="font-semibold hover:underline">
                            {post.profiles?.full_name || 'Anonymous'}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            {post.created_at && formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      {isOwner && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeletePost(post.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="whitespace-pre-wrap">{post.content}</p>
                    
                    {post.image_url && (
                      <div className="relative w-full aspect-video rounded-lg overflow-hidden">
                        <Image
                          src={post.image_url}
                          alt="Post image"
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}

                    <div className="flex items-center gap-4 pt-2 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleLike(post.id, isLiked)}
                        className={isLiked ? 'text-red-500' : ''}
                      >
                        <Heart className={`h-4 w-4 mr-1 ${isLiked ? 'fill-current' : ''}`} />
                        {post.likes_count || 0}
                      </Button>
                      <Button variant="ghost" size="sm">
                        <MessageCircle className="h-4 w-4 mr-1" />
                        {post.comments_count || 0}
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Share2 className="h-4 w-4 mr-1" />
                        Share
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      </main>

      {/* Right Sidebar - Online & Members */}
      <aside className="hidden lg:block lg:col-span-3">
        <Card className="sticky top-20">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="online" className="text-xs">
                <UserCheck className="h-3 w-3 mr-1" />
                Online ({mergedOnlineUsers.length})
              </TabsTrigger>
              <TabsTrigger value="members" className="text-xs">
                <Users className="h-3 w-3 mr-1" />
                Members ({members.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="online" className="mt-0">
              <ScrollArea className="h-[400px]">
                <div className="p-2">
                  {mergedOnlineUsers.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground py-8">No users online</p>
                  ) : (
                    mergedOnlineUsers.map((member: any) => (
                      <UserCard key={member.id} user={member} isOnline={true} />
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="members" className="mt-0">
              <div className="p-2">
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search members..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9"
                  />
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
      </aside>
    </div>
  )
}
