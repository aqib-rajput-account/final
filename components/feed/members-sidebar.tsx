"use client"

import { useState } from 'react'
import Link from 'next/link'
import {
  Users,
  Search,
  Building2,
  BookOpen,
  Shield,
  User,
  CheckCircle,
  ChevronRight,
  ExternalLink,
  Filter
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { useFeedStore, type CommunityMember } from '@/lib/stores'
import { FullProfileView } from './full-profile-view'

interface MembersSidebarProps {
  mosqueId?: string
  className?: string
}

export function MembersSidebar({ mosqueId, className }: MembersSidebarProps) {
  const { communityMembers, getOnlineMembers, getMembersByMosque } = useFeedStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRole, setFilterRole] = useState<string>('all')
  const [selectedMember, setSelectedMember] = useState<CommunityMember | null>(null)
  const [isMembersSheetOpen, setIsMembersSheetOpen] = useState(false)

  const onlineMembers = getOnlineMembers()
  
  const filteredMembers = communityMembers.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         member.username.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = filterRole === 'all' || member.role === filterRole
    const matchesMosque = !mosqueId || member.mosqueId === mosqueId
    return matchesSearch && matchesRole && matchesMosque
  })

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'imam': return <BookOpen className="h-3 w-3" />
      case 'mosque': return <Building2 className="h-3 w-3" />
      case 'shura': return <Shield className="h-3 w-3" />
      default: return <User className="h-3 w-3" />
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'imam': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
      case 'mosque': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
      case 'shura': return 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Online Members Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              Online Now
            </CardTitle>
            <Badge variant="secondary" className="text-xs">
              {onlineMembers.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {onlineMembers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No members online
            </p>
          ) : (
            <div className="space-y-3">
              {onlineMembers.slice(0, 5).map(member => (
                <button
                  key={member.id}
                  onClick={() => setSelectedMember(member)}
                  className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="relative">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={member.avatar} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {member.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-background" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-medium truncate">{member.name}</span>
                      {member.verified && (
                        <CheckCircle className="h-3.5 w-3.5 text-primary fill-primary/20" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {member.position || `@${member.username}`}
                    </p>
                  </div>
                </button>
              ))}
              {onlineMembers.length > 5 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full text-xs"
                  onClick={() => setIsMembersSheetOpen(true)}
                >
                  View all {onlineMembers.length} online
                  <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Community Members Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users className="h-4 w-4" />
              Community Members
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 text-xs"
              onClick={() => setIsMembersSheetOpen(true)}
            >
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            {/* Imams */}
            {communityMembers.filter(m => m.role === 'imam').slice(0, 2).map(member => (
              <MemberCard 
                key={member.id} 
                member={member} 
                onClick={() => setSelectedMember(member)}
                getRoleIcon={getRoleIcon}
                getRoleBadgeColor={getRoleBadgeColor}
              />
            ))}
            
            {/* Shura */}
            {communityMembers.filter(m => m.role === 'shura').slice(0, 1).map(member => (
              <MemberCard 
                key={member.id} 
                member={member} 
                onClick={() => setSelectedMember(member)}
                getRoleIcon={getRoleIcon}
                getRoleBadgeColor={getRoleBadgeColor}
              />
            ))}

            {/* Management/Active Users */}
            {communityMembers.filter(m => m.position && m.role === 'user').slice(0, 2).map(member => (
              <MemberCard 
                key={member.id} 
                member={member} 
                onClick={() => setSelectedMember(member)}
                getRoleIcon={getRoleIcon}
                getRoleBadgeColor={getRoleBadgeColor}
              />
            ))}

            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={() => setIsMembersSheetOpen(true)}
            >
              <Users className="h-4 w-4 mr-1.5" />
              View All Members
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* All Members Sheet */}
      <Sheet open={isMembersSheetOpen} onOpenChange={setIsMembersSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Community Members
            </SheetTitle>
          </SheetHeader>

          <div className="mt-4 space-y-4">
            {/* Search and Filter */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search members..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="imam">Imams</SelectItem>
                  <SelectItem value="shura">Shura</SelectItem>
                  <SelectItem value="user">Members</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Members List */}
            <Tabs defaultValue="all">
              <TabsList className="w-full">
                <TabsTrigger value="all" className="flex-1">All</TabsTrigger>
                <TabsTrigger value="online" className="flex-1">Online</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-4">
                <ScrollArea className="h-[calc(100vh-280px)]">
                  <div className="space-y-2 pr-4">
                    {filteredMembers.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No members found
                      </p>
                    ) : (
                      filteredMembers.map(member => (
                        <MemberListItem
                          key={member.id}
                          member={member}
                          onClick={() => {
                            setSelectedMember(member)
                            setIsMembersSheetOpen(false)
                          }}
                          getRoleIcon={getRoleIcon}
                          getRoleBadgeColor={getRoleBadgeColor}
                        />
                      ))
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="online" className="mt-4">
                <ScrollArea className="h-[calc(100vh-280px)]">
                  <div className="space-y-2 pr-4">
                    {onlineMembers.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No members online
                      </p>
                    ) : (
                      onlineMembers.map(member => (
                        <MemberListItem
                          key={member.id}
                          member={member}
                          onClick={() => {
                            setSelectedMember(member)
                            setIsMembersSheetOpen(false)
                          }}
                          getRoleIcon={getRoleIcon}
                          getRoleBadgeColor={getRoleBadgeColor}
                        />
                      ))
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        </SheetContent>
      </Sheet>

      {/* Full Profile View */}
      {selectedMember && (
        <FullProfileView
          profile={selectedMember}
          onClose={() => setSelectedMember(null)}
        />
      )}
    </div>
  )
}

// Helper Components
interface MemberCardProps {
  member: CommunityMember
  onClick: () => void
  getRoleIcon: (role: string) => React.ReactNode
  getRoleBadgeColor: (role: string) => string
}

function MemberCard({ member, onClick, getRoleIcon, getRoleBadgeColor }: MemberCardProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
    >
      <div className="relative">
        <Avatar className="h-10 w-10">
          <AvatarImage src={member.avatar} />
          <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
            {member.name.split(' ').map(n => n[0]).join('')}
          </AvatarFallback>
        </Avatar>
        {member.isOnline && (
          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-background" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium truncate">{member.name}</span>
          {member.verified && (
            <CheckCircle className="h-3.5 w-3.5 text-primary fill-primary/20" />
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <Badge variant="secondary" className={cn("text-xs h-5 gap-1", getRoleBadgeColor(member.role))}>
            {getRoleIcon(member.role)}
            {member.role === 'user' ? (member.position || 'Member') : member.role.charAt(0).toUpperCase() + member.role.slice(1)}
          </Badge>
        </div>
      </div>
    </button>
  )
}

interface MemberListItemProps {
  member: CommunityMember
  onClick: () => void
  getRoleIcon: (role: string) => React.ReactNode
  getRoleBadgeColor: (role: string) => string
}

function MemberListItem({ member, onClick, getRoleIcon, getRoleBadgeColor }: MemberListItemProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left"
    >
      <div className="relative">
        <Avatar className="h-12 w-12">
          <AvatarImage src={member.avatar} />
          <AvatarFallback className="bg-primary/10 text-primary">
            {member.name.split(' ').map(n => n[0]).join('')}
          </AvatarFallback>
        </Avatar>
        {member.isOnline && (
          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 ring-2 ring-background" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-medium truncate">{member.name}</span>
          {member.verified && (
            <CheckCircle className="h-4 w-4 text-primary fill-primary/20" />
          )}
        </div>
        <p className="text-sm text-muted-foreground truncate">@{member.username}</p>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="secondary" className={cn("text-xs", getRoleBadgeColor(member.role))}>
            {getRoleIcon(member.role)}
            <span className="ml-1">
              {member.role === 'user' ? (member.position || 'Member') : member.role.charAt(0).toUpperCase() + member.role.slice(1)}
            </span>
          </Badge>
          <span className="text-xs text-muted-foreground">{member.mosqueName}</span>
        </div>
      </div>
      <ChevronRight className="h-5 w-5 text-muted-foreground" />
    </button>
  )
}

