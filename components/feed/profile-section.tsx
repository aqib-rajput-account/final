"use client"

import { useState } from 'react'
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
  Languages
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useFeedStore, type UserProfile, type CommunityMember, type Post } from '@/lib/stores'
import { FullProfileView } from './full-profile-view'

interface ProfileSectionProps {
  profile?: UserProfile | CommunityMember
  isCurrentUser?: boolean
  isCompact?: boolean
  onViewProfile?: () => void
}

export function ProfileSection({ 
  profile: externalProfile, 
  isCurrentUser = false,
  isCompact = false,
  onViewProfile 
}: ProfileSectionProps) {
  const { userProfile, updateProfile, posts, followUser, unfollowUser } = useFeedStore()
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isFullProfileOpen, setIsFullProfileOpen] = useState(false)
  const [editForm, setEditForm] = useState<Partial<UserProfile>>({})
  
  const profile = externalProfile || userProfile
  const userPosts = posts.filter(p => p.author.id === profile.id)
  const isFollowing = userProfile.following.includes(profile.id)

  const handleFollow = () => {
    if (isFollowing) {
      unfollowUser(profile.id)
      toast.success(`Unfollowed ${profile.name}`)
    } else {
      followUser(profile.id)
      toast.success(`Following ${profile.name}`)
    }
  }

  const handleSaveProfile = () => {
    updateProfile(editForm)
    setIsEditDialogOpen(false)
    setEditForm({})
    toast.success('Profile updated successfully!')
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'imam': return <BookOpen className="h-4 w-4" />
      case 'mosque': return <Building2 className="h-4 w-4" />
      case 'shura': return <Shield className="h-4 w-4" />
      default: return <User className="h-4 w-4" />
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'imam': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
      case 'mosque': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
      case 'shura': return 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400'
      default: return 'bg-primary/10 text-primary'
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }

  // Compact card view for sidebar
  if (isCompact) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 ring-2 ring-primary/10">
              <AvatarImage src={profile.avatar} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {profile.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-sm truncate">{profile.name}</span>
                {profile.verified && (
                  <CheckCircle className="h-4 w-4 text-primary fill-primary/20 flex-shrink-0" />
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">@{profile.username}</p>
            </div>
          </div>
          
          {profile.bio && (
            <p className="mt-3 text-sm text-muted-foreground line-clamp-2">{profile.bio}</p>
          )}

          <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
            <span><strong className="text-foreground">{profile.followersCount}</strong> followers</span>
            <span><strong className="text-foreground">{profile.followingCount}</strong> following</span>
          </div>

          <Button 
            className="w-full mt-3" 
            variant="outline" 
            size="sm"
            onClick={() => setIsFullProfileOpen(true)}
          >
            View Profile
          </Button>
        </CardContent>

        {/* Full Profile View */}
        {isFullProfileOpen && (
          <FullProfileView
            profile={profile}
            onClose={() => setIsFullProfileOpen(false)}
          />
        )}

        {/* Edit Profile Dialog */}
        <EditProfileDialog
          isOpen={isEditDialogOpen}
          onClose={() => setIsEditDialogOpen(false)}
          editForm={editForm}
          setEditForm={setEditForm}
          onSave={handleSaveProfile}
          profile={profile as UserProfile}
        />
      </Card>
    )
  }

  // Full profile view
  return (
    <Card className="overflow-hidden">
      {/* Cover Image */}
      <div className="h-32 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/5 relative">
        {(profile as UserProfile).coverImage && (
          <img 
            src={(profile as UserProfile).coverImage} 
            alt="" 
            className="w-full h-full object-cover"
          />
        )}
        {isCurrentUser && (
          <Button 
            variant="secondary" 
            size="sm" 
            className="absolute top-2 right-2 gap-1.5"
            onClick={() => {
              setEditForm(profile as UserProfile)
              setIsEditDialogOpen(true)
            }}
          >
            <Edit className="h-3.5 w-3.5" />
            Edit Profile
          </Button>
        )}
      </div>

      <CardContent className="relative pt-0">
        {/* Avatar */}
        <div className="relative -mt-12 mb-3">
          <Avatar className="h-24 w-24 ring-4 ring-background">
            <AvatarImage src={profile.avatar} />
            <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
              {profile.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          {'isOnline' in profile && profile.isOnline && (
            <span className="absolute bottom-1 right-1 h-4 w-4 rounded-full bg-green-500 ring-2 ring-background" />
          )}
        </div>

        {/* Name and Role */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold">{profile.name}</h2>
              {profile.verified && (
                <CheckCircle className="h-5 w-5 text-primary fill-primary/20" />
              )}
            </div>
            <p className="text-muted-foreground">@{profile.username}</p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Badge variant="secondary" className={cn("gap-1.5", getRoleBadgeColor(profile.role))}>
                {getRoleIcon(profile.role)}
                {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
              </Badge>
              {'position' in profile && profile.position && (
                <Badge variant="outline">{profile.position}</Badge>
              )}
            </div>
          </div>
          
          {!isCurrentUser && profile.id !== userProfile.id && (
            <Button 
              variant={isFollowing ? "outline" : "default"}
              onClick={handleFollow}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </Button>
          )}
        </div>

        {/* Bio */}
        {profile.bio && (
          <p className="mt-4 text-sm leading-relaxed">{profile.bio}</p>
        )}

        {/* Info */}
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
          {profile.location && (
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              {profile.location}
            </span>
          )}
          {('connectedMosqueName' in profile || 'mosqueName' in profile) && (
            <Link 
              href={`/mosques/${'connectedMosqueId' in profile ? profile.connectedMosqueId : (profile as CommunityMember).mosqueId}`}
              className="flex items-center gap-1.5 text-primary hover:underline"
            >
              <Building2 className="h-4 w-4" />
              {'connectedMosqueName' in profile ? profile.connectedMosqueName : (profile as CommunityMember).mosqueName}
            </Link>
          )}
          <span className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            Joined {formatDate(profile.joinedDate)}
          </span>
        </div>

        {/* Stats */}
        <div className="mt-4 flex items-center gap-6 text-sm">
          <button className="hover:underline">
            <strong className="text-foreground">{profile.postsCount}</strong>{' '}
            <span className="text-muted-foreground">posts</span>
          </button>
          <button className="hover:underline">
            <strong className="text-foreground">{profile.followersCount}</strong>{' '}
            <span className="text-muted-foreground">followers</span>
          </button>
          <button className="hover:underline">
            <strong className="text-foreground">{profile.followingCount}</strong>{' '}
            <span className="text-muted-foreground">following</span>
          </button>
        </div>

        {/* Additional Info (for UserProfile) */}
        {'profession' in profile && (profile.profession || profile.education || profile.languages) && (
          <>
            <Separator className="my-4" />
            <div className="space-y-2 text-sm">
              {profile.profession && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Briefcase className="h-4 w-4" />
                  <span>{profile.profession}</span>
                </div>
              )}
              {profile.education && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <GraduationCap className="h-4 w-4" />
                  <span>{profile.education}</span>
                </div>
              )}
              {profile.languages && profile.languages.length > 0 && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Languages className="h-4 w-4" />
                  <span>{profile.languages.join(', ')}</span>
                </div>
              )}
            </div>
          </>
        )}

        {/* Social Links */}
        {'socialLinks' in profile && profile.socialLinks && Object.keys(profile.socialLinks).length > 0 && (
          <>
            <Separator className="my-4" />
            <div className="flex gap-2">
              {profile.socialLinks.twitter && (
                <Button variant="outline" size="icon" asChild>
                  <a href={profile.socialLinks.twitter} target="_blank" rel="noopener noreferrer">
                    <Globe className="h-4 w-4" />
                  </a>
                </Button>
              )}
              {profile.socialLinks.linkedin && (
                <Button variant="outline" size="icon" asChild>
                  <a href={profile.socialLinks.linkedin} target="_blank" rel="noopener noreferrer">
                    <Globe className="h-4 w-4" />
                  </a>
                </Button>
              )}
              {profile.socialLinks.youtube && (
                <Button variant="outline" size="icon" asChild>
                  <a href={profile.socialLinks.youtube} target="_blank" rel="noopener noreferrer">
                    <Globe className="h-4 w-4" />
                  </a>
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>

      {/* Edit Profile Dialog */}
      <EditProfileDialog
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        editForm={editForm}
        setEditForm={setEditForm}
        onSave={handleSaveProfile}
        profile={profile as UserProfile}
      />
    </Card>
  )
}

// Edit Profile Dialog Component
interface EditProfileDialogProps {
  isOpen: boolean
  onClose: () => void
  editForm: Partial<UserProfile>
  setEditForm: (form: Partial<UserProfile>) => void
  onSave: () => void
  profile: UserProfile
}

function EditProfileDialog({
  isOpen,
  onClose,
  editForm,
  setEditForm,
  onSave,
  profile
}: EditProfileDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Edit Profile</DialogTitle>
          <DialogDescription>
            Update your profile information
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={editForm.avatar || profile.avatar} />
              <AvatarFallback className="bg-primary text-primary-foreground text-lg font-semibold">
                {(editForm.name || profile.name).split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <Button variant="outline" size="sm">
              <Camera className="mr-2 h-4 w-4" />
              Change Photo
            </Button>
          </div>

          <div className="space-y-2">
            <label htmlFor="edit-name" className="text-sm font-medium">Name</label>
            <Input
              id="edit-name"
              value={editForm.name || profile.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="edit-username" className="text-sm font-medium">Username</label>
            <Input
              id="edit-username"
              value={editForm.username || profile.username}
              onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="edit-bio" className="text-sm font-medium">Bio</label>
            <Textarea
              id="edit-bio"
              value={editForm.bio || profile.bio || ''}
              onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
              placeholder="Tell us about yourself..."
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="edit-profession" className="text-sm font-medium">Profession</label>
            <Input
              id="edit-profession"
              value={editForm.profession || profile.profession || ''}
              onChange={(e) => setEditForm({ ...editForm, profession: e.target.value })}
              placeholder="Your profession"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="edit-education" className="text-sm font-medium">Education</label>
            <Input
              id="edit-education"
              value={editForm.education || profile.education || ''}
              onChange={(e) => setEditForm({ ...editForm, education: e.target.value })}
              placeholder="Your education"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="edit-location" className="text-sm font-medium">Location</label>
            <Input
              id="edit-location"
              value={editForm.location || profile.location || ''}
              onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
              placeholder="City, State"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="edit-email" className="text-sm font-medium">Email</label>
            <Input
              id="edit-email"
              type="email"
              value={editForm.email || profile.email || ''}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="edit-phone" className="text-sm font-medium">Phone</label>
            <Input
              id="edit-phone"
              value={editForm.phone || profile.phone || ''}
              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="edit-website" className="text-sm font-medium">Website</label>
            <Input
              id="edit-website"
              value={editForm.website || profile.website || ''}
              onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
              placeholder="https://yourwebsite.com"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

