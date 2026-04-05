"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Building2,
  Calendar,
  Users,
  ClipboardCheck,
  FileText,
  UserPlus,
  Star,
  TrendingUp,
  ArrowUpRight,
  AlertCircle,
  CheckCircle2,
  Clock,
  MapPin,
} from "lucide-react"
import Link from "next/link"
import { 
  shuraMembers, 
  mosqueVisits, 
  shuraMeetings, 
  mosqueRegistrations, 
  mosqueAssessments,
  imamAppointments,
  getScheduledVisits,
  getUpcomingMeetings,
  getPendingRegistrations
} from "@/lib/data"
import { mockMosques } from "@/lib/data"

export default function ShuraDashboardPage() {
  const totalMosques = mockMosques.length
  const scheduledVisits = getScheduledVisits()
  const upcomingMeetings = getUpcomingMeetings()
  const pendingRegistrations = getPendingRegistrations()
  const pendingAppointments = imamAppointments.filter(a => 
    a.status !== 'approved' && a.status !== 'rejected' && a.status !== 'appointed'
  )

  const excellentMosques = mosqueAssessments.filter(a => a.status === 'excellent').length
  const needsImprovementMosques = mosqueAssessments.filter(a => a.status === 'needs_improvement').length

  const stats = [
    {
      title: "Affiliated Mosques",
      value: totalMosques,
      icon: Building2,
      description: `${excellentMosques} excellent, ${needsImprovementMosques} need attention`,
      trend: "up",
    },
    {
      title: "Scheduled Visits",
      value: scheduledVisits.length,
      icon: ClipboardCheck,
      description: "Upcoming mosque inspections",
      trend: "neutral",
    },
    {
      title: "Pending Registrations",
      value: pendingRegistrations.length,
      icon: FileText,
      description: "Awaiting review & approval",
      trend: "up",
    },
    {
      title: "Imam Appointments",
      value: pendingAppointments.length,
      icon: UserPlus,
      description: "Applications in progress",
      trend: "neutral",
    },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
      case 'confirmed': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      case 'completed': return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
      case 'pending_review': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
      case 'under_review': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
    }
  }

  const getAssessmentColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-green-600'
      case 'good': return 'text-blue-600'
      case 'satisfactory': return 'text-yellow-600'
      case 'needs_improvement': return 'text-orange-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Shura Council Dashboard</h1>
          <p className="text-muted-foreground">
            Oversight and governance of all affiliated mosques
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/shura/visits/new">
            <Button variant="outline">
              <ClipboardCheck className="mr-2 h-4 w-4" />
              Schedule Visit
            </Button>
          </Link>
          <Link href="/shura/meetings/new">
            <Button>
              <Calendar className="mr-2 h-4 w-4" />
              New Meeting
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                {stat.trend === "up" && (
                  <TrendingUp className="h-3 w-3 text-green-600" />
                )}
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Alerts Section */}
      {(needsImprovementMosques > 0 || pendingRegistrations.length > 0) && (
        <Card className="border-orange-200 dark:border-orange-900/50 bg-orange-50/50 dark:bg-orange-900/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              Action Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {needsImprovementMosques > 0 && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-background">
                  <span className="text-sm">{needsImprovementMosques} mosque(s) need improvement - follow-up visits required</span>
                  <Link href="/shura/assessments">
                    <Button variant="outline" size="sm">Review</Button>
                  </Link>
                </div>
              )}
              {pendingRegistrations.length > 0 && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-background">
                  <span className="text-sm">{pendingRegistrations.length} new mosque registration(s) awaiting review</span>
                  <Link href="/shura/registrations">
                    <Button variant="outline" size="sm">Review</Button>
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Visits */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Upcoming Visits</CardTitle>
              <CardDescription>Scheduled mosque inspections and meetings</CardDescription>
            </div>
            <Link href="/shura/visits">
              <Button variant="ghost" size="sm">
                View All
                <ArrowUpRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {scheduledVisits.slice(0, 4).map((visit) => {
                const mosque = mockMosques.find(m => m.id === visit.mosqueId)
                const shuraMember = shuraMembers.find(s => s.id === visit.shuraMemberId)
                return (
                  <div key={visit.id} className="flex items-start gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <ClipboardCheck className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="font-medium leading-none">{mosque?.name || 'Unknown Mosque'}</p>
                      <p className="text-sm text-muted-foreground">
                        {visit.visitType.replace(/_/g, ' ')} - {shuraMember?.name}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(visit.scheduledDate).toLocaleDateString()} at {visit.scheduledTime}
                      </p>
                    </div>
                    <Badge className={getStatusColor(visit.status)}>
                      {visit.status}
                    </Badge>
                  </div>
                )
              })}
              {scheduledVisits.length === 0 && (
                <p className="text-center text-muted-foreground py-4">No scheduled visits</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Meetings */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Upcoming Meetings</CardTitle>
              <CardDescription>Council meetings and consultations</CardDescription>
            </div>
            <Link href="/shura/meetings">
              <Button variant="ghost" size="sm">
                View All
                <ArrowUpRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingMeetings.slice(0, 4).map((meeting) => (
                <div key={meeting.id} className="flex items-start gap-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                    meeting.isVirtual ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-green-100 dark:bg-green-900/30'
                  }`}>
                    <Calendar className={`h-5 w-5 ${
                      meeting.isVirtual ? 'text-blue-600' : 'text-green-600'
                    }`} />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="font-medium leading-none">{meeting.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {meeting.meetingType.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(meeting.date).toLocaleDateString()} - {meeting.startTime} to {meeting.endTime}
                    </p>
                  </div>
                  <Badge variant={meeting.isVirtual ? "outline" : "secondary"}>
                    {meeting.isVirtual ? 'Online' : 'In-Person'}
                  </Badge>
                </div>
              ))}
              {upcomingMeetings.length === 0 && (
                <p className="text-center text-muted-foreground py-4">No upcoming meetings</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Mosque Assessments Overview */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Mosque Performance Overview</CardTitle>
            <CardDescription>Assessment ratings across affiliated mosques</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {mosqueAssessments.map((assessment) => {
              const mosque = mockMosques.find(m => m.id === assessment.mosqueId)
              return (
                <div key={assessment.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{mosque?.name || 'Unknown'}</span>
                      {assessment.certificationLevel && (
                        <Badge variant="outline" className="capitalize">
                          {assessment.certificationLevel}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Star className={`h-4 w-4 ${getAssessmentColor(assessment.status)}`} />
                      <span className="text-sm font-medium">{assessment.overallRating}/5</span>
                      <span className={`text-xs capitalize ${getAssessmentColor(assessment.status)}`}>
                        ({assessment.status.replace(/_/g, ' ')})
                      </span>
                    </div>
                  </div>
                  <Progress value={assessment.overallRating * 20} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    Last visit: {new Date(assessment.lastVisitDate).toLocaleDateString()} - 
                    Total visits: {assessment.totalVisits}
                  </p>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Shura Members */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Shura Members</CardTitle>
              <CardDescription>{shuraMembers.filter(m => m.isActive).length} active members</CardDescription>
            </div>
            <Link href="/shura/members">
              <Button variant="ghost" size="sm">
                View All
                <ArrowUpRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {shuraMembers.slice(0, 5).map((member) => (
                <div key={member.id} className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={member.photoUrl} alt={member.name} />
                    <AvatarFallback className="text-xs">
                      {member.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-0.5">
                    <p className="text-sm font-medium leading-none">{member.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {member.title.replace(/_/g, ' ')}
                    </p>
                  </div>
                  {member.isActive && (
                    <span className="h-2 w-2 rounded-full bg-green-500" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Registrations */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Registration Applications</CardTitle>
            <CardDescription>Mosques seeking to join the network</CardDescription>
          </div>
          <Link href="/shura/registrations">
            <Button variant="ghost" size="sm">
              View All
              <ArrowUpRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mosqueRegistrations.slice(0, 4).map((reg) => (
              <div key={reg.id} className="flex items-start gap-4 p-4 rounded-lg border">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{reg.mosqueName}</p>
                    <Badge className={getStatusColor(reg.status)}>
                      {reg.status.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {reg.city}, {reg.state}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Contact: {reg.contactPerson} - Capacity: {reg.estimatedCapacity}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Submitted: {new Date(reg.submittedDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  {reg.status === 'pending_review' && (
                    <Button size="sm">Review</Button>
                  )}
                  {reg.status === 'visit_scheduled' && (
                    <Button size="sm" variant="outline">View Visit</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

