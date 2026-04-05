"use client"

import Link from 'next/link'
import { 
  ChevronLeft,
  Mail, 
  Phone,
  Calendar,
  Building2,
  ShieldCheck,
  Briefcase,
  GraduationCap,
  Award,
  Clock,
  Globe,
  Users,
  Heart,
  Target,
  CheckCircle2,
  MessageSquare,
  Linkedin,
  Twitter,
  ChevronRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Mosque, ManagementMember, ManagementPosition } from '@/lib/types'

interface ManagementMemberDetailViewProps {
  mosque: Mosque
  member: ManagementMember
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

const positionColors: Record<string, string> = {
  president: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  vice_president: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  secretary: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  treasurer: 'bg-green-500/10 text-green-700 dark:text-green-400',
  trustee: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400',
  board_member: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400',
}

export function ManagementMemberDetailView({ mosque, member }: ManagementMemberDetailViewProps) {
  const termInfo = member.termEndDate 
    ? `${new Date(member.termStartDate).getFullYear()} - ${new Date(member.termEndDate).getFullYear()}`
    : `Since ${new Date(member.termStartDate).getFullYear()}`

  return (
    <div>
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-primary/10 via-primary/5 to-background">
        <div className="absolute inset-0 opacity-5">
          <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="member-pattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                <circle cx="20" cy="20" r="1.5" fill="currentColor"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#member-pattern)" />
          </svg>
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-8 lg:px-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
            <Link href={`/mosques/${mosque.id}`} className="hover:text-foreground transition-colors">
              {mosque.name}
            </Link>
            <ChevronRight className="h-4 w-4" />
            <Link href={`/mosques/${mosque.id}/management`} className="hover:text-foreground transition-colors">
              Management
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground">{member.name}</span>
          </div>

          {/* Profile Header */}
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Photo */}
            <div className="flex-shrink-0">
              <Avatar className="h-40 w-40 rounded-2xl border-4 border-background shadow-xl">
                <AvatarImage src={member.photoUrl} alt={member.name} />
                <AvatarFallback className="rounded-2xl text-4xl bg-primary/10 text-primary">
                  {member.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Basic Info */}
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-foreground">{member.name}</h1>
                {member.isElected && (
                  <Badge variant="outline" className="border-primary/50 text-primary">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Elected
                  </Badge>
                )}
                {member.isActive && (
                  <Badge className="bg-green-500/10 text-green-700 dark:text-green-400">Active</Badge>
                )}
              </div>

              <Badge className={`text-sm mb-3 ${positionColors[member.position] || 'bg-primary/10 text-primary'}`}>
                {positionLabels[member.position]}
              </Badge>

              {member.profession && (
                <p className="text-muted-foreground mb-2 flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  {member.profession}
                </p>
              )}

              {member.department && (
                <p className="text-sm text-muted-foreground mb-4">
                  {member.department} Department
                </p>
              )}

              {/* Quick Stats */}
              <div className="flex flex-wrap gap-4 mt-4">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span>Term: {termInfo}</span>
                </div>
                {member.yearsOfService && (
                  <div className="flex items-center gap-2 text-sm">
                    <Award className="h-4 w-4 text-primary" />
                    <span>{member.yearsOfService}+ Years of Service</span>
                  </div>
                )}
                {member.languages && member.languages.length > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <Globe className="h-4 w-4 text-primary" />
                    <span>{member.languages.join(', ')}</span>
                  </div>
                )}
              </div>

              {/* Contact & Social */}
              <div className="flex flex-wrap gap-3 mt-6">
                <Button asChild>
                  <a href={`mailto:${member.email}`}>
                    <Mail className="h-4 w-4 mr-2" />
                    Email
                  </a>
                </Button>
                {member.phone && (
                  <Button variant="outline" asChild>
                    <a href={`tel:${member.phone}`}>
                      <Phone className="h-4 w-4 mr-2" />
                      Call
                    </a>
                  </Button>
                )}
                {member.socialMedia?.linkedin && (
                  <Button variant="outline" size="icon" asChild>
                    <a href={member.socialMedia.linkedin} target="_blank" rel="noopener noreferrer">
                      <Linkedin className="h-4 w-4" />
                    </a>
                  </Button>
                )}
                {member.socialMedia?.twitter && (
                  <Button variant="outline" size="icon" asChild>
                    <a href={member.socialMedia.twitter} target="_blank" rel="noopener noreferrer">
                      <Twitter className="h-4 w-4" />
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="w-full justify-start flex-wrap">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="responsibilities">Responsibilities</TabsTrigger>
            {member.achievements && member.achievements.length > 0 && (
              <TabsTrigger value="achievements">Achievements</TabsTrigger>
            )}
            {member.education && member.education.length > 0 && (
              <TabsTrigger value="background">Background</TabsTrigger>
            )}
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-6 space-y-6">
            {/* Personal Statement */}
            {member.personalStatement && (
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    Personal Statement
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <blockquote className="italic text-muted-foreground leading-relaxed border-l-4 border-primary pl-4">
                    "{member.personalStatement}"
                  </blockquote>
                </CardContent>
              </Card>
            )}

            {/* Biography */}
            {member.biography && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    About {member.name.split(' ')[0]}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    {member.biography}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Skills */}
            {member.skills && member.skills.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    Skills & Expertise
                  </CardTitle>
                  <CardDescription>Professional skills brought to the role</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {member.skills.map((skill, index) => (
                      <Badge key={index} variant="secondary" className="py-1.5 px-3">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Committees */}
            {member.committees && member.committees.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Committee Memberships
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {member.committees.map((committee, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                          <ShieldCheck className="h-5 w-5 text-primary" />
                        </div>
                        <span className="font-medium">{committee}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Contact Card */}
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <a 
                    href={`mailto:${member.email}`}
                    className="flex items-center gap-3 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <Mail className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{member.email}</p>
                    </div>
                  </a>
                  {member.phone && (
                    <a 
                      href={`tel:${member.phone}`}
                      className="flex items-center gap-3 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <Phone className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <p className="font-medium">{member.phone}</p>
                      </div>
                    </a>
                  )}
                </div>
                {(member.availability || member.officeHours) && (
                  <div className="pt-4 border-t">
                    {member.officeHours && (
                      <div className="flex items-start gap-3 mb-3">
                        <Clock className="h-5 w-5 text-primary mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">Office Hours</p>
                          <p className="font-medium">{member.officeHours}</p>
                        </div>
                      </div>
                    )}
                    {member.availability && (
                      <div className="flex items-start gap-3">
                        <Calendar className="h-5 w-5 text-primary mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">Availability</p>
                          <p className="font-medium">{member.availability}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Responsibilities Tab */}
          <TabsContent value="responsibilities" className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-primary" />
                  Role Responsibilities
                </CardTitle>
                <CardDescription>
                  Key duties and responsibilities as {positionLabels[member.position]}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {member.responsibilities.map((responsibility, index) => (
                    <div key={index} className="flex items-start gap-4 p-4 rounded-lg border bg-card">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold flex-shrink-0">
                        {index + 1}
                      </div>
                      <p className="pt-1">{responsibility}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Achievements Tab */}
          {member.achievements && member.achievements.length > 0 && (
            <TabsContent value="achievements" className="mt-6 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-primary" />
                    Notable Achievements
                  </CardTitle>
                  <CardDescription>
                    Key accomplishments during service
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {member.achievements.map((achievement, index) => (
                      <div key={index} className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10 flex-shrink-0">
                          <Award className="h-5 w-5 text-amber-600" />
                        </div>
                        <p className="pt-2">{achievement}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Background Tab */}
          {member.education && member.education.length > 0 && (
            <TabsContent value="background" className="mt-6 space-y-6">
              {/* Education */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-primary" />
                    Education
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {member.education.map((edu, index) => (
                      <div key={index} className="flex gap-4 pb-4 border-b last:border-0 last:pb-0">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
                          <GraduationCap className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-semibold">{edu.degree}</h4>
                          <p className="text-muted-foreground">{edu.institution}</p>
                          {edu.field && (
                            <p className="text-sm text-muted-foreground">{edu.field}</p>
                          )}
                          {edu.year && (
                            <p className="text-sm text-primary">{edu.year}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Previous Roles */}
              {member.previousRoles && member.previousRoles.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      Previous Roles
                    </CardTitle>
                    <CardDescription>Service history in community organizations</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="relative">
                      <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />
                      <div className="space-y-6">
                        {member.previousRoles.map((role, index) => (
                          <div key={index} className="relative flex gap-4 pl-12">
                            <div className="absolute left-4 top-1 h-4 w-4 rounded-full border-2 border-primary bg-background" />
                            <div>
                              <h4 className="font-semibold">{role.position}</h4>
                              <p className="text-muted-foreground">{role.organization}</p>
                              <p className="text-sm text-primary">{role.years}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          )}
        </Tabs>

        {/* Back to Management */}
        <div className="mt-8 pt-8 border-t">
          <Link href={`/mosques/${mosque.id}/management`}>
            <Button variant="outline">
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back to Management Team
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
