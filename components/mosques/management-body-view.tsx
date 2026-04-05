"use client"

import Link from 'next/link'
import { 
  ChevronLeft,
  Mail, 
  Phone,
  Calendar,
  Users,
  Building2,
  ShieldCheck,
  Crown,
  Briefcase,
  UserCircle,
  ChevronDown,
  ExternalLink
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import type { Mosque, ManagementMember, ManagementPosition } from '@/lib/types'

interface ManagementBodyViewProps {
  mosque: Mosque
  team: ManagementMember[]
}

const positionLabels: Record<ManagementPosition, string> = {
  president: 'President',
  vice_president: 'Vice President',
  secretary: 'Secretary',
  treasurer: 'Treasurer',
  trustee: 'Trustee',
  board_member: 'Board Member',
  committee_head: 'Committee Head',
  volunteer_coordinator: 'Volunteer Coordinator',
  education_director: 'Education Director',
  youth_director: 'Youth Director',
  women_coordinator: "Women's Coordinator",
  facilities_manager: 'Facilities Manager',
  security_head: 'Security Head',
  other: 'Staff Member'
}

const positionOrder: ManagementPosition[] = [
  'president',
  'vice_president', 
  'secretary',
  'treasurer',
  'trustee',
  'board_member',
  'education_director',
  'youth_director',
  'women_coordinator',
  'volunteer_coordinator',
  'facilities_manager',
  'security_head',
  'committee_head',
  'other'
]

export function ManagementBodyView({ mosque, team }: ManagementBodyViewProps) {
  // Sort team by position order
  const sortedTeam = [...team].sort((a, b) => {
    return positionOrder.indexOf(a.position) - positionOrder.indexOf(b.position)
  })

  // Group by category
  const executiveBoard = sortedTeam.filter(m => 
    ['president', 'vice_president', 'secretary', 'treasurer'].includes(m.position)
  )
  const trustees = sortedTeam.filter(m => 
    ['trustee', 'board_member'].includes(m.position)
  )
  const departmentHeads = sortedTeam.filter(m => 
    !['president', 'vice_president', 'secretary', 'treasurer', 'trustee', 'board_member'].includes(m.position)
  )

  return (
    <div>
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-primary/10 via-primary/5 to-background">
        <div className="absolute inset-0 opacity-5">
          <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="mgmt-pattern" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M30 0L60 30L30 60L0 30Z" fill="none" stroke="currentColor" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#mgmt-pattern)" />
          </svg>
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-8 lg:px-8">
          <Link 
            href={`/mosques/${mosque.id}`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to {mosque.name}
          </Link>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <ShieldCheck className="h-8 w-8" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-foreground">Management Body</h1>
                  <p className="text-muted-foreground">{mosque.name}</p>
                </div>
              </div>
            </div>

            <Button variant="outline" asChild>
              <a href={`mailto:${mosque.email}`}>
                <Mail className="h-4 w-4 mr-2" />
                Contact Administration
              </a>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
        {/* Overview Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Users className="h-8 w-8 mx-auto text-primary mb-2" />
                <p className="text-3xl font-bold">{team.length}</p>
                <p className="text-sm text-muted-foreground">Total Members</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Crown className="h-8 w-8 mx-auto text-amber-500 mb-2" />
                <p className="text-3xl font-bold">{executiveBoard.length}</p>
                <p className="text-sm text-muted-foreground">Executive Board</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <ShieldCheck className="h-8 w-8 mx-auto text-blue-500 mb-2" />
                <p className="text-3xl font-bold">{trustees.length}</p>
                <p className="text-sm text-muted-foreground">Trustees</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Briefcase className="h-8 w-8 mx-auto text-green-500 mb-2" />
                <p className="text-3xl font-bold">{departmentHeads.length}</p>
                <p className="text-sm text-muted-foreground">Department Heads</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Organizational Structure */}
        <div className="space-y-8">
          {/* Executive Board */}
          {executiveBoard.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                  <Crown className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Executive Board</h2>
                  <p className="text-sm text-muted-foreground">Key leadership and decision makers</p>
                </div>
              </div>
              
              <div className="grid gap-6 md:grid-cols-2">
                {executiveBoard.map((member) => (
                  <ManagementMemberDetailCard key={member.id} member={member} mosqueId={mosque.id} featured />
                ))}
              </div>
            </section>
          )}

          {/* Trustees / Board Members */}
          {trustees.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                  <ShieldCheck className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Board of Trustees</h2>
                  <p className="text-sm text-muted-foreground">Oversight and governance</p>
                </div>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {trustees.map((member) => (
                  <ManagementMemberDetailCard key={member.id} member={member} mosqueId={mosque.id} />
                ))}
              </div>
            </section>
          )}

          {/* Department Heads / Committee Members */}
          {departmentHeads.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                  <Briefcase className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Department Heads & Coordinators</h2>
                  <p className="text-sm text-muted-foreground">Day-to-day operations and programs</p>
                </div>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {departmentHeads.map((member) => (
                  <ManagementMemberDetailCard key={member.id} member={member} mosqueId={mosque.id} />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Organizational Info */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              About Our Management Structure
            </CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none text-muted-foreground">
            <p>
              {mosque.name} is governed by an elected board of directors and supported by dedicated committee 
              members and volunteers. Our management structure ensures transparency, accountability, and 
              community participation in all mosque affairs.
            </p>
            <div className="grid gap-4 md:grid-cols-3 mt-6 not-prose">
              <div className="p-4 rounded-lg bg-muted/50">
                <h4 className="font-semibold mb-2">Elections</h4>
                <p className="text-sm text-muted-foreground">
                  Board members are elected by the community every 2-3 years through a democratic process.
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <h4 className="font-semibold mb-2">Meetings</h4>
                <p className="text-sm text-muted-foreground">
                  Regular board meetings are held monthly. General assembly meetings are open to all members.
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <h4 className="font-semibold mb-2">Get Involved</h4>
                <p className="text-sm text-muted-foreground">
                  Community members are encouraged to join committees and volunteer for mosque activities.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact All */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Contact Management</CardTitle>
            <CardDescription>Reach out to our administrative team</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Button asChild>
                <a href={`mailto:${mosque.email}`}>
                  <Mail className="h-4 w-4 mr-2" />
                  General Inquiries
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href={`tel:${mosque.phone}`}>
                  <Phone className="h-4 w-4 mr-2" />
                  {mosque.phone}
                </a>
              </Button>
              <Button variant="outline" asChild>
                <Link href={`/mosques/${mosque.id}`}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Mosque Details
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

interface ManagementMemberDetailCardProps {
  member: ManagementMember
  mosqueId: string
  featured?: boolean
}

function ManagementMemberDetailCard({ member, mosqueId, featured = false }: ManagementMemberDetailCardProps) {
  const termInfo = member.termEndDate 
    ? `Term: ${new Date(member.termStartDate).getFullYear()} - ${new Date(member.termEndDate).getFullYear()}`
    : `Since ${new Date(member.termStartDate).getFullYear()}`

  return (
    <Card className={featured ? 'border-primary/20' : ''}>
      <CardContent className={featured ? 'p-6' : 'p-4'}>
        <div className={featured ? 'flex flex-col sm:flex-row gap-6' : 'flex gap-4'}>
          <Avatar className={featured ? 'h-24 w-24' : 'h-16 w-16'}>
            <AvatarImage src={member.photoUrl} alt={member.name} />
            <AvatarFallback className="bg-primary/10 text-primary text-lg">
              {member.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <Link href={`/mosques/${mosqueId}/management/${member.id}`} className="hover:text-primary transition-colors">
                <h3 className={featured ? 'text-lg font-semibold' : 'font-semibold'}>{member.name}</h3>
              </Link>
              {member.isElected && (
                <Badge variant="outline" className="text-xs">Elected</Badge>
              )}
            </div>
            
            <Badge variant="secondary" className="mb-2">
              {positionLabels[member.position]}
            </Badge>
            
            {member.department && (
              <p className="text-xs text-muted-foreground mb-2">{member.department}</p>
            )}
            
            {featured && member.biography && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                {member.biography}
              </p>
            )}
            
            {/* Contact Info */}
            <div className={featured ? 'mt-4 space-y-2' : 'mt-3 space-y-1'}>
              <a 
                href={`mailto:${member.email}`} 
                className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
              >
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="truncate">{member.email}</span>
              </a>
              {member.phone && (
                <a 
                  href={`tel:${member.phone}`} 
                  className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                >
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  {member.phone}
                </a>
              )}
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                {termInfo}
              </p>
            </div>

            {/* View Full Profile Button */}
            <Link href={`/mosques/${mosqueId}/management/${member.id}`} className="mt-3 inline-block">
              <Button variant="outline" size="sm" className="text-xs">
                View Full Profile
              </Button>
            </Link>

            {/* Responsibilities */}
            {member.responsibilities && member.responsibilities.length > 0 && (
              <Accordion type="single" collapsible className="mt-3">
                <AccordionItem value="responsibilities" className="border-none">
                  <AccordionTrigger className="text-sm py-2 hover:no-underline">
                    <span className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      View Responsibilities ({member.responsibilities.length})
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <ul className="space-y-2 pt-2">
                      {member.responsibilities.map((resp, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <span className="text-primary mt-0.5">-</span>
                          {resp}
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
