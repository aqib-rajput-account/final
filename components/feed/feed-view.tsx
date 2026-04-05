"use client"

import { useState, useMemo } from 'react'
import { 
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  MoreHorizontal,
  Send,
  ImagePlus,
  X,
  Calendar,
  MapPin,
  CheckCircle,
  Quote,
  Megaphone,
  HandHeart,
  Filter,
  TrendingUp,
  Clock,
  Trash2,
  Edit,
  BookOpen,
  Building2,
  User,
  Shield
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useFeedStore, currentUser, type Post, type PostAuthor } from '@/lib/stores'
import { FullProfileView } from './full-profile-view'
import { useCurrentUser } from './user-switcher'

export function FeedView() {
  const [selectedProfile, setSelectedProfile] = useState<PostAuthor | null>(null)
  const { 
    posts, 
    addPost, 
    updatePost, 
    deletePost, 
    likePost, 
    unlikePost, 
    bookmarkPost, 
    unbookmarkPost,
    sharePost,
    addComment,
    deleteComment,
    likeComment,
    unlikeComment
  } = useFeedStore()
  
  const [activeFilter, setActiveFilter] = useState('all')
  const [sortBy, setSortBy] = useState('recent')
  const [newPostContent, setNewPostContent] = useState('')
  const [newPostType, setNewPostType] = useState<Post['type']>('text')
  const [newPostCategory, setNewPostCategory] = useState<Post['category']>('general')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingPost, setEditingPost] = useState<Post | null>(null)
  const [editContent, setEditContent] = useState('')

  const filteredPosts = useMemo(() => {
    let result = [...posts]
    
    // Filter by category/type
    if (activeFilter !== 'all') {
      if (activeFilter === 'bookmarks') {
        result = result.filter(p => p.bookmarkedBy.includes(currentUser.id))
      } else if (activeFilter === 'my-posts') {
        result = result.filter(p => p.author.id === currentUser.id)
      } else {
        result = result.filter(p => p.category === activeFilter || p.type === activeFilter)
      }
    }
    
    // Sort
    if (sortBy === 'recent') {
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    } else if (sortBy === 'popular') {
      result.sort((a, b) => (b.likes + b.comments.length + b.shares) - (a.likes + a.comments.length + a.shares))
    }
    
    return result
  }, [posts, activeFilter, sortBy])

  const handleCreatePost = () => {
    if (!newPostContent.trim()) {
      toast.error('Please enter some content for your post')
      return
    }

    addPost({
      author: currentUser,
      content: newPostContent,
      type: newPostType,
      category: newPostCategory
    })

    setNewPostContent('')
    setNewPostType('text')
    setNewPostCategory('general')
    setIsCreateDialogOpen(false)
    toast.success('Post created successfully!')
  }

  const handleEditPost = () => {
    if (!editingPost || !editContent.trim()) return

    updatePost(editingPost.id, { content: editContent })
    setEditingPost(null)
    setEditContent('')
    toast.success('Post updated successfully!')
  }

  const handleDeletePost = (postId: string) => {
    deletePost(postId)
    toast.success('Post deleted')
  }

  const handleLike = (postId: string) => {
    const post = posts.find(p => p.id === postId)
    if (post?.likedBy.includes(currentUser.id)) {
      unlikePost(postId, currentUser.id)
    } else {
      likePost(postId, currentUser.id)
    }
  }

  const handleBookmark = (postId: string) => {
    const post = posts.find(p => p.id === postId)
    if (post?.bookmarkedBy.includes(currentUser.id)) {
      unbookmarkPost(postId, currentUser.id)
      toast.success('Removed from bookmarks')
    } else {
      bookmarkPost(postId, currentUser.id)
      toast.success('Added to bookmarks')
    }
  }

  const handleShare = (postId: string) => {
    sharePost(postId)
    navigator.clipboard?.writeText(`${window.location.origin}/feed?post=${postId}`)
    toast.success('Link copied to clipboard!')
  }

  const getPostTypeIcon = (type: Post['type']) => {
    switch (type) {
      case 'quote': return <Quote className="h-4 w-4" />
      case 'announcement': return <Megaphone className="h-4 w-4" />
      case 'event': return <Calendar className="h-4 w-4" />
      case 'prayer-request': return <HandHeart className="h-4 w-4" />
      default: return null
    }
  }

  const getRoleIcon = (role?: PostAuthor['role']) => {
    switch (role) {
      case 'imam': return <BookOpen className="h-3 w-3" />
      case 'mosque': return <Building2 className="h-3 w-3" />
      case 'shura': return <Shield className="h-3 w-3" />
      default: return <User className="h-3 w-3" />
    }
  }

  const getRoleBadgeColor = (role?: PostAuthor['role']) => {
    switch (role) {
      case 'imam': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
      case 'mosque': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
      case 'shura': return 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400'
      default: return ''
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="space-y-6">
      {/* Create Post Card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={currentUser.avatar} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {currentUser.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <button
                onClick={() => setIsCreateDialogOpen(true)}
                className="w-full rounded-full border border-input bg-muted/50 px-4 py-2.5 text-left text-sm text-muted-foreground hover:bg-muted transition-colors"
              >
                {"What's on your mind? Share with the community..."}
              </button>
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="gap-2 text-muted-foreground"
                  onClick={() => { setNewPostType('image'); setIsCreateDialogOpen(true) }}
                >
                  <ImagePlus className="h-4 w-4 text-primary" />
                  Photo
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="gap-2 text-muted-foreground"
                  onClick={() => { setNewPostType('event'); setIsCreateDialogOpen(true) }}
                >
                  <Calendar className="h-4 w-4 text-amber-500" />
                  Event
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="gap-2 text-muted-foreground"
                  onClick={() => { setNewPostType('prayer-request'); setIsCreateDialogOpen(true) }}
                >
                  <HandHeart className="h-4 w-4 text-rose-500" />
                  Dua Request
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="gap-2 text-muted-foreground"
                  onClick={() => { setNewPostType('quote'); setIsCreateDialogOpen(true) }}
                >
                  <Quote className="h-4 w-4 text-teal-500" />
                  Quote
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Tabs value={activeFilter} onValueChange={setActiveFilter} className="w-full sm:w-auto">
          <TabsList className="grid w-full grid-cols-4 sm:flex sm:w-auto">
            <TabsTrigger value="all" className="text-xs sm:text-sm">All</TabsTrigger>
            <TabsTrigger value="islamic" className="text-xs sm:text-sm">Islamic</TabsTrigger>
            <TabsTrigger value="community" className="text-xs sm:text-sm">Community</TabsTrigger>
            <TabsTrigger value="bookmarks" className="text-xs sm:text-sm">Saved</TabsTrigger>
          </TabsList>
        </Tabs>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Recent
              </span>
            </SelectItem>
            <SelectItem value="popular">
              <span className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Popular
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Posts Feed */}
      <div className="space-y-4">
        {filteredPosts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">No posts found</h3>
              <p className="mt-2 text-muted-foreground">
                {activeFilter === 'bookmarks' 
                  ? "You haven't saved any posts yet"
                  : activeFilter === 'my-posts'
                  ? "You haven't created any posts yet"
                  : "Be the first to share something with the community!"}
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)} className="mt-4">
                Create Post
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onLike={() => handleLike(post.id)}
              onBookmark={() => handleBookmark(post.id)}
              onShare={() => handleShare(post.id)}
              onEdit={() => { setEditingPost(post); setEditContent(post.content) }}
              onDelete={() => handleDeletePost(post.id)}
              onAddComment={(content) => addComment(post.id, { authorId: currentUser.id, author: currentUser, content })}
              onDeleteComment={(commentId) => deleteComment(post.id, commentId)}
              onLikeComment={(commentId) => {
                const comment = post.comments.find(c => c.id === commentId)
                if (comment?.likedBy.includes(currentUser.id)) {
                  unlikeComment(post.id, commentId, currentUser.id)
                } else {
                  likeComment(post.id, commentId, currentUser.id)
                }
              }}
              onViewProfile={(author) => setSelectedProfile(author)}
              isLiked={post.likedBy.includes(currentUser.id)}
              isBookmarked={post.bookmarkedBy.includes(currentUser.id)}
              isOwnPost={post.author.id === currentUser.id}
              formatDate={formatDate}
              getPostTypeIcon={getPostTypeIcon}
              getRoleIcon={getRoleIcon}
              getRoleBadgeColor={getRoleBadgeColor}
            />
          ))
        )}
      </div>

      {/* Create Post Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Post</DialogTitle>
            <DialogDescription>Share something with the community</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={currentUser.avatar} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {currentUser.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-sm">{currentUser.name}</p>
                <p className="text-xs text-muted-foreground">@{currentUser.username}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Select value={newPostType} onValueChange={(v) => setNewPostType(v as Post['type'])}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Post type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="image">Photo</SelectItem>
                  <SelectItem value="quote">Quote</SelectItem>
                  <SelectItem value="event">Event</SelectItem>
                  <SelectItem value="prayer-request">Dua Request</SelectItem>
                  <SelectItem value="announcement">Announcement</SelectItem>
                </SelectContent>
              </Select>

              <Select value={newPostCategory} onValueChange={(v) => setNewPostCategory(v as Post['category'])}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="islamic">Islamic</SelectItem>
                  <SelectItem value="community">Community</SelectItem>
                  <SelectItem value="education">Education</SelectItem>
                  <SelectItem value="event">Event</SelectItem>
                  <SelectItem value="mosque">Mosque</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Textarea
              placeholder={
                newPostType === 'prayer-request' 
                  ? "Share your prayer request..." 
                  : newPostType === 'quote'
                  ? "Share an Islamic quote or verse..."
                  : newPostType === 'event'
                  ? "Describe your event..."
                  : "What's on your mind?"
              }
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              rows={5}
              className="resize-none"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreatePost}>
              Post
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Post Dialog */}
      <Dialog open={!!editingPost} onOpenChange={(open) => !open && setEditingPost(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Post</DialogTitle>
          </DialogHeader>
          <Textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={5}
            className="resize-none"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPost(null)}>
              Cancel
            </Button>
            <Button onClick={handleEditPost}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Full Profile View */}
      {selectedProfile && (
        <FullProfileView
          profile={selectedProfile}
          onClose={() => setSelectedProfile(null)}
        />
      )}
    </div>
  )
}

interface PostCardProps {
  post: Post
  onLike: () => void
  onBookmark: () => void
  onShare: () => void
  onEdit: () => void
  onDelete: () => void
  onAddComment: (content: string) => void
  onDeleteComment: (commentId: string) => void
  onLikeComment: (commentId: string) => void
  onViewProfile: (author: PostAuthor) => void
  isLiked: boolean
  isBookmarked: boolean
  isOwnPost: boolean
  formatDate: (date: string) => string
  getPostTypeIcon: (type: Post['type']) => React.ReactNode
  getRoleIcon: (role?: PostAuthor['role']) => React.ReactNode
  getRoleBadgeColor: (role?: PostAuthor['role']) => string
}

function PostCard({ 
  post, 
  onLike, 
  onBookmark, 
  onShare, 
  onEdit, 
  onDelete,
  onAddComment,
  onDeleteComment,
  onLikeComment,
  onViewProfile,
  isLiked, 
  isBookmarked, 
  isOwnPost,
  formatDate,
  getPostTypeIcon,
  getRoleIcon,
  getRoleBadgeColor
}: PostCardProps) {
  const [showComments, setShowComments] = useState(false)
  const [newComment, setNewComment] = useState('')

  const handleSubmitComment = () => {
    if (!newComment.trim()) return
    onAddComment(newComment)
    setNewComment('')
    toast.success('Comment added!')
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => onViewProfile(post.author)}
              className="focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-full transition-transform hover:scale-105"
            >
              <Avatar className="h-11 w-11 cursor-pointer">
                <AvatarImage src={post.author.avatar} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {post.author.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
            </button>
            <div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => onViewProfile(post.author)}
                  className="font-semibold text-sm hover:underline focus:outline-none focus:underline"
                >
                  {post.author.name}
                </button>
                {post.author.verified && (
                  <CheckCircle className="h-4 w-4 text-primary fill-primary/20" />
                )}
                {post.author.role && post.author.role !== 'user' && (
                  <Badge variant="secondary" className={cn("text-xs gap-1", getRoleBadgeColor(post.author.role))}>
                    {getRoleIcon(post.author.role)}
                    {post.author.role.charAt(0).toUpperCase() + post.author.role.slice(1)}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <button 
                  onClick={() => onViewProfile(post.author)}
                  className="hover:underline focus:outline-none focus:underline"
                >
                  @{post.author.username}
                </button>
                <span>·</span>
                <span>{formatDate(post.createdAt)}</span>
              </div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onBookmark}>
                <Bookmark className={cn("h-4 w-4 mr-2", isBookmarked && "fill-current")} />
                {isBookmarked ? 'Remove from saved' : 'Save post'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onShare}>
                <Share2 className="h-4 w-4 mr-2" />
                Copy link
              </DropdownMenuItem>
              {isOwnPost && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onEdit}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit post
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onDelete} className="text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete post
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        {/* Post type badge */}
        {post.type !== 'text' && (
          <div className="mb-3">
            <Badge variant="outline" className="gap-1.5">
              {getPostTypeIcon(post.type)}
              {post.type === 'prayer-request' ? 'Dua Request' : post.type.charAt(0).toUpperCase() + post.type.slice(1)}
            </Badge>
          </div>
        )}

        {/* Content */}
        <p className="text-sm whitespace-pre-wrap leading-relaxed">{post.content}</p>

        {/* Event details */}
        {post.eventDetails && (
          <div className="mt-3 rounded-lg border bg-muted/50 p-3">
            <h4 className="font-semibold text-sm">{post.eventDetails.title}</h4>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(post.eventDetails.date).toLocaleDateString()}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {post.eventDetails.location}
              </span>
            </div>
          </div>
        )}

        {/* Quote source */}
        {post.quoteSource && (
          <p className="mt-2 text-xs text-muted-foreground italic">
            — {post.quoteSource}
          </p>
        )}

        {/* Images */}
        {post.images && post.images.length > 0 && (
          <div className="mt-3 rounded-lg overflow-hidden">
            <img 
              src={post.images[0]} 
              alt="" 
              className="w-full object-cover max-h-96"
            />
          </div>
        )}
      </CardContent>

      <CardFooter className="flex flex-col pt-0">
        {/* Stats */}
        <div className="flex items-center justify-between w-full py-2 border-y border-border/50 text-xs text-muted-foreground">
          <span>{post.likes} likes</span>
          <div className="flex gap-4">
            <span>{post.comments.length} comments</span>
            <span>{post.shares} shares</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between w-full pt-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className={cn("gap-2", isLiked && "text-rose-500")}
            onClick={onLike}
          >
            <Heart className={cn("h-4 w-4", isLiked && "fill-current")} />
            Like
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-2"
            onClick={() => setShowComments(!showComments)}
          >
            <MessageCircle className="h-4 w-4" />
            Comment
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-2"
            onClick={onShare}
          >
            <Share2 className="h-4 w-4" />
            Share
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className={cn("gap-2", isBookmarked && "text-primary")}
            onClick={onBookmark}
          >
            <Bookmark className={cn("h-4 w-4", isBookmarked && "fill-current")} />
          </Button>
        </div>

        {/* Comments section */}
        {showComments && (
          <div className="w-full mt-3 pt-3 border-t border-border/50 space-y-3">
            {/* Add comment */}
            <div className="flex items-start gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={currentUser.avatar} />
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {currentUser.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 flex gap-2">
                <Input
                  placeholder="Write a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmitComment()}
                  className="h-9 text-sm"
                />
                <Button size="sm" onClick={handleSubmitComment} disabled={!newComment.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Comments list */}
            {post.comments.length > 0 && (
              <div className="space-y-3">
                {post.comments.map((comment) => (
                  <div key={comment.id} className="flex items-start gap-2">
                    <button 
                      onClick={() => onViewProfile(comment.author)}
                      className="focus:outline-none rounded-full"
                    >
                      <Avatar className="h-8 w-8 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all">
                        <AvatarImage src={comment.author.avatar} />
                        <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                          {comment.author.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                    <div className="flex-1">
                      <div className="rounded-lg bg-muted/50 px-3 py-2">
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => onViewProfile(comment.author)}
                            className="font-medium text-xs hover:underline"
                          >
                            {comment.author.name}
                          </button>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(comment.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm mt-1">{comment.content}</p>
                      </div>
                      <div className="flex items-center gap-3 mt-1 px-1">
                        <button 
                          onClick={() => onLikeComment(comment.id)}
                          className={cn(
                            "text-xs text-muted-foreground hover:text-foreground",
                            comment.likedBy.includes(currentUser.id) && "text-rose-500"
                          )}
                        >
                          Like {comment.likes > 0 && `(${comment.likes})`}
                        </button>
                        {comment.authorId === currentUser.id && (
                          <button 
                            onClick={() => onDeleteComment(comment.id)}
                            className="text-xs text-muted-foreground hover:text-destructive"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardFooter>
    </Card>
  )
}

