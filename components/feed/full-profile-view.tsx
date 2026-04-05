"use client"

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  User,
  MapPin,
  Calendar,
  Link as LinkIcon,
  Mail,
  Phone,
  Building2,
  BookOpen,
  Shield,
  Edit,
  Settings,
  Camera,
  CheckCircle,
  Users,
  FileText,
  Heart,
  X,
  Globe,
  Briefcase,
  GraduationCap,
  Languages,
  ArrowLeft,
  MessageCircle,
  Share2,
  MoreHorizontal,
  Image as ImageIcon,
  Grid3X3,
  Radio,
  Video
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useFeedStore, type UserProfile, type CommunityMember, type Post, type PostAuthor } from '@/lib/stores'
import { useCurrentUser } from './user-switcher'
import { useRouter } from 'next/navigation'

interface FullProfileViewProps {
  profile: UserProfile | CommunityMember | PostAuthor
  onClose: () => void
}

export function FullProfileView({ profile, onClose }: FullProfileViewProps) {
  const { userProfile, updateProfile, posts, followUser, unfollowUser, communityMembers } = useFeedStore()
  const { currentUser } = useCurrentUser()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('posts')
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editForm, setEditForm] = useState<Partial<UserProfile>>({})

  // Get full profile data if we only have PostAuthor
  const fullProfile = useMemo(() => {
    // Check if it's the current user
    if (profile.id === currentUser.id) {
      return userProfile
    }
    // Check community members
    const member = communityMembers.find(m => m.id === profile.id)
    if (member) return member
    // Return what we have
    return profile
  }, [profile, currentUser.id, userProfile, communityMembers])

  const userPosts = posts.filter(p => p.author.id === fullProfile.id)
  const isCurrentUser = fullProfile.id === currentUser.id
  const isFollowing = 'following' in userProfile ? userProfile.following.includes(fullProfile.id) : false

  const handleFollow = () => {
    if (isFollowing) {
      unfollowUser(fullProfile.id)
      toast.success(`Unfollowed ${fullProfile.name}`)
    } else {
      followUser(fullProfile.id)
      toast.success(`Following ${fullProfile.name}`)
    }
  }

  const handleSaveProfile = () => {
    updateProfile(editForm)
    setIsEditDialogOpen(false)
    setEditForm({})
    toast.success('Profile updated successfully!')
  }

  const getRoleIcon = (role?: string) => {
    switch (role) {
      case 'imam': return <BookOpen className="h-4 w-4" />
      case 'mosque': return <Building2 className="h-4 w-4" />
      case 'shura': return <Shield className="h-4 w-4" />
      default: return <User className="h-4 w-4" />
    }
  }

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case 'imam': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
      case 'mosque': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
      case 'shura': return 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400'
      default: return 'bg-primary/10 text-primary'
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }

  const formatPostDate = (dateString: string) => {
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
    <div className="fixed inset-0 z-50 bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex items-center gap-4 px-4 h-14">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold truncate">{fullProfile.name}</h1>
            <p className="text-xs text-muted-foreground">{userPosts.length} posts</p>
          </div>
          {isCurrentUser && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setEditForm(fullProfile as UserProfile)
                setIsEditDialogOpen(true)
              }}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-3.5rem)]">
        <div className="max-w-3xl mx-auto pb-20">
          {/* Cover Image */}
          <div className="h-40 sm:h-52 bg-gradient-to-br from-primary/30 via-primary/20 to-primary/5 relative">
            {('coverImage' in fullProfile) && (fullProfile as any).coverImage && (
              <img 
                src={(fullProfile as any).coverImage} 
                alt="" 
                className="w-full h-full object-cover"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
          </div>

          {/* Profile Info */}
          <div className="relative px-4 sm:px-6">
            {/* Avatar */}
            <div className="relative -mt-16 sm:-mt-20 mb-4">
              <Avatar className="h-28 w-28 sm:h-36 sm:w-36 ring-4 ring-background shadow-lg">
                <AvatarImage src={fullProfile.avatar} />
                <AvatarFallback className="bg-primary text-primary-foreground text-3xl sm:text-4xl font-bold">
                  {fullProfile.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              {'isOnline' in fullProfile && fullProfile.isOnline && (
                <span className="absolute bottom-2 right-2 h-5 w-5 rounded-full bg-green-500 ring-4 ring-background" />
              )}
            </div>

            {/* Name and Actions */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-2xl sm:text-3xl font-bold">{fullProfile.name}</h2>
                  {'verified' in fullProfile && fullProfile.verified && (
                    <CheckCircle className="h-6 w-6 text-primary fill-primary/20" />
                  )}
                </div>
                <p className="text-muted-foreground">@{fullProfile.username}</p>
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  {'role' in fullProfile && fullProfile.role && (
                    <Badge variant="secondary" className={cn("gap-1.5 text-sm", getRoleBadgeColor(fullProfile.role))}>
                      {getRoleIcon(fullProfile.role)}
                      {fullProfile.role.charAt(0).toUpperCase() + fullProfile.role.slice(1)}
                    </Badge>
                  )}
                  {'position' in fullProfile && fullProfile.position && (
                    <Badge variant="outline">{fullProfile.position}</Badge>
                  )}
                </div>
              </div>
              
              {!isCurrentUser && (
                <div className="flex gap-2">
                  <Button 
                    variant={isFollowing ? "outline" : "default"}
                    onClick={handleFollow}
                    className="min-w-[100px]"
                  >
                    {isFollowing ? 'Following' : 'Follow'}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => router.push(`/messages?userId=${fullProfile.id}`)}
                  >
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Bio */}
            {'bio' in fullProfile && fullProfile.bio && (
              <p className="text-base leading-relaxed mb-4">{fullProfile.bio}</p>
            )}

            {/* Info Row */}
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground mb-4">
              {'location' in fullProfile && fullProfile.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {fullProfile.location}
                </span>
              )}
              {('connectedMosqueName' in fullProfile || 'mosqueName' in fullProfile) && (
                <Link 
                  href={`/mosques/${'connectedMosqueId' in fullProfile ? fullProfile.connectedMosqueId : (fullProfile as CommunityMember).mosqueId}`}
                  className="flex items-center gap-1.5 text-primary hover:underline"
                >
                  <Building2 className="h-4 w-4" />
                  {'connectedMosqueName' in fullProfile ? fullProfile.connectedMosqueName : (fullProfile as CommunityMember).mosqueName}
                </Link>
              )}
              {'joinedDate' in fullProfile && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  Joined {formatDate(fullProfile.joinedDate)}
                </span>
              )}
            </div>

            {/* Stats */}
            <div className="flex items-center gap-6 py-4 border-y border-border mb-4">
              <button className="hover:underline text-center">
                <span className="block text-xl font-bold">{'postsCount' in fullProfile ? fullProfile.postsCount : userPosts.length}</span>
                <span className="text-sm text-muted-foreground">Posts</span>
              </button>
              <button className="hover:underline text-center">
                <span className="block text-xl font-bold">{'followersCount' in fullProfile ? fullProfile.followersCount : 0}</span>
                <span className="text-sm text-muted-foreground">Followers</span>
              </button>
              <button className="hover:underline text-center">
                <span className="block text-xl font-bold">{'followingCount' in fullProfile ? fullProfile.followingCount : 0}</span>
                <span className="text-sm text-muted-foreground">Following</span>
              </button>
            </div>

            {/* Additional Info */}
            {('profession' in fullProfile) && ((fullProfile as any).profession || (fullProfile as any).education || (fullProfile as any).languages) && (
              <div className="space-y-3 mb-6">
                <h3 className="font-semibold">About</h3>
                <div className="space-y-2 text-sm">
                  {(fullProfile as any).profession && (
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <Briefcase className="h-4 w-4 flex-shrink-0" />
                      <span>{(fullProfile as any).profession}</span>
                    </div>
                  )}
                  {(fullProfile as any).education && (
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <GraduationCap className="h-4 w-4 flex-shrink-0" />
                      <span>{(fullProfile as any).education}</span>
                    </div>
                  )}
                  {(fullProfile as any).languages && (fullProfile as any).languages.length > 0 && (
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <Languages className="h-4 w-4 flex-shrink-0" />
                      <span>{(fullProfile as any).languages.join(', ')}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
              <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
                <TabsTrigger 
                  value="posts" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Posts
                </TabsTrigger>
                <TabsTrigger 
                  value="media" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
                >
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Media
                </TabsTrigger>
                <TabsTrigger 
                  value="activity" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
                >
                  <Radio className="h-4 w-4 mr-2" />
                  Activity
                </TabsTrigger>
              </TabsList>

              {/* Posts Tab */}
              <TabsContent value="posts" className="mt-4 space-y-4">
                {userPosts.length === 0 ? (
                  <div className="py-12 text-center">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground/30" />
                    <h3 className="mt-4 text-lg font-semibold">No posts yet</h3>
                    <p className="text-muted-foreground mt-1">
                      {isCurrentUser 
                        ? "Share your first post with the community!" 
                        : `${fullProfile.name} hasn't posted anything yet.`}
                    </p>
                  </div>
                ) : (
                  userPosts.map(post => (
                    <ProfilePostCard key={post.id} post={post} formatDate={formatPostDate} />
                  ))
                )}
              </TabsContent>

              {/* Media Tab */}
              <TabsContent value="media" className="mt-4">
                {userPosts.filter(p => p.images && p.images.length > 0).length === 0 ? (
                  <div className="py-12 text-center">
                    <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground/30" />
                    <h3 className="mt-4 text-lg font-semibold">No media yet</h3>
                    <p className="text-muted-foreground mt-1">Photos and videos will appear here.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-1">
                    {userPosts
                      .filter(p => p.images && p.images.length > 0)
                      .flatMap(p => p.images || [])
                      .map((image, idx) => (
                        <div key={idx} className="aspect-square bg-muted rounded-sm overflow-hidden">
                          <img src={image} alt="" className="w-full h-full object-cover" />
                        </div>
                      ))}
                  </div>
                )}
              </TabsContent>

              {/* Activity Tab */}
              <TabsContent value="activity" className="mt-4">
                <div className="py-12 text-center">
                  <Radio className="h-12 w-12 mx-auto text-muted-foreground/30" />
                  <h3 className="mt-4 text-lg font-semibold">Activity</h3>
                  <p className="text-muted-foreground mt-1">Spaces and meetings participated in will appear here.</p>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </ScrollArea>

      {/* Edit Profile Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>Update your profile information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                value={editForm.name || ''}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="Your name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Username</label>
              <Input
                value={editForm.username || ''}
                onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                placeholder="username"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Bio</label>
              <Textarea
                value={editForm.bio || ''}
                onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                placeholder="Tell us about yourself..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Location</label>
              <Input
                value={editForm.location || ''}
                onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                placeholder="City, Country"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Profession</label>
              <Input
                value={editForm.profession || ''}
                onChange={(e) => setEditForm({ ...editForm, profession: e.target.value })}
                placeholder="Your profession"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveProfile}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Simple post card for profile view
function ProfilePostCard({ post, formatDate }: { post: Post; formatDate: (date: string) => string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>
        
        {post.images && post.images.length > 0 && (
          <div className="mt-3 grid gap-2 rounded-lg overflow-hidden">
            {post.images.slice(0, 4).map((image, idx) => (
              <img key={idx} src={image} alt="" className="w-full rounded-lg object-cover max-h-64" />
            ))}
          </div>
        )}

        <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
          <span>{formatDate(post.createdAt)}</span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Heart className="h-4 w-4" /> {post.likes}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="h-4 w-4" /> {post.comments.length}
            </span>
            <span className="flex items-center gap-1">
              <Share2 className="h-4 w-4" /> {post.shares}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

