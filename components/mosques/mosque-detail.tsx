"use client"

import Link from 'next/link'
import { useState } from 'react'
import { 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  Clock, 
  Users, 
  Calendar,
  CheckCircle,
  ChevronLeft,
  Share2,
  Navigation,
  Building2,
  GraduationCap,
  BookOpen,
  Award,
  Briefcase,
  Languages,
  Youtube,
  Twitter,
  Facebook,
  Instagram,
  User,
  ShieldCheck,
  Library,
  Plus,
  Search,
  BookMarked,
  Package,
  Filter,
  X,
  BookCopy,
  AlertCircle,
  Check
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  getEventsByMosqueId, 
  getAnnouncementsByMosqueId, 
  getDonationGoalsByMosqueId,
  getPrayerTimesByMosqueId,
  getImamsByMosqueId,
  getManagementByMosqueId
} from '@/lib/data'
import type { Mosque, Imam, ManagementMember, LibraryBook, BookCategory, BookCondition } from '@/lib/types'
import { useLibraryStore, bookCategoryLabels, conditionLabels, itemTypeLabels } from '@/lib/stores'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { cn } from '@/lib/utils'
import { format, isToday, isYesterday } from 'date-fns'

interface MosqueDetailProps {
  mosque: Mosque
}

export function MosqueDetail({ mosque }: MosqueDetailProps) {
  const events = getEventsByMosqueId(mosque.id)
  const announcements = getAnnouncementsByMosqueId(mosque.id)
  const donationGoals = getDonationGoalsByMosqueId(mosque.id)
  const prayerTimes = getPrayerTimesByMosqueId(mosque.id)
  const imams = getImamsByMosqueId(mosque.id)
  const managementTeam = getManagementByMosqueId(mosque.id)

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: mosque.name,
        text: mosque.description,
        url: window.location.href,
      })
    }
  }

  const handleDirections = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${mosque.latitude},${mosque.longitude}`
    window.open(url, '_blank')
  }

  return (
    <div>
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-primary/10 via-primary/5 to-background">
        <div className="absolute inset-0 opacity-5">
          <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="mosque-pattern" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M30 0L60 30L30 60L0 30Z" fill="none" stroke="currentColor" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#mosque-pattern)" />
          </svg>
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-6 sm:py-10 lg:px-8">
          <Link 
            href="/mosques"
            className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 hover:text-primary transition-all mb-8 group active:scale-95"
          >
            <div className="p-1 rounded-lg bg-muted group-hover:bg-primary/10 transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </div>
            Back to Directory
          </Link>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            <div className="flex flex-col sm:flex-row sm:items-center gap-6 text-center sm:text-left items-center sm:items-start">
              <div className="flex h-24 w-24 sm:h-20 sm:w-20 flex-shrink-0 items-center justify-center rounded-[2rem] sm:rounded-2xl bg-primary shadow-2xl shadow-primary/30 text-primary-foreground transform sm:rotate-0 rotate-3">
                <MosqueIcon className="h-12 w-12 sm:h-10 sm:w-10" />
              </div>
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <h1 className="text-3xl sm:text-4xl font-black text-foreground tracking-tighter leading-none">{mosque.name}</h1>
                  {mosque.isVerified && (
                    <Badge className="gap-1.5 bg-emerald-500/10 text-emerald-600 border-emerald-500/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                      <CheckCircle className="h-3.5 w-3.5 fill-emerald-500/10" />
                      Verified
                    </Badge>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-2 text-muted-foreground/80 font-medium">
                  <MapPin className="h-4 w-4 text-primary/60" />
                  <span className="text-sm sm:text-base">{mosque.address}, {mosque.city}</span>
                </div>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest opacity-70 bg-muted/50 px-3 py-1.5 rounded-xl border border-border/40">
                    <Users className="h-3.5 w-3.5" />
                    {mosque.capacity} Capacity
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest opacity-70 bg-muted/50 px-3 py-1.5 rounded-xl border border-border/40">
                    <Calendar className="h-3.5 w-3.5" />
                    Est. {mosque.establishedYear}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <Button onClick={handleDirections} size="lg" className="gap-3 rounded-2xl h-14 sm:h-12 w-full sm:w-auto bg-primary shadow-xl shadow-primary/20 hover:shadow-primary/30 active:scale-95 font-bold">
                <Navigation className="h-5 w-5" />
                Get Directions
              </Button>
              <Button variant="outline" onClick={handleShare} size="lg" className="gap-3 rounded-2xl h-14 sm:h-12 w-full sm:w-auto border-border/60 hover:bg-muted font-bold active:scale-95">
                <Share2 className="h-5 w-5" />
                Share
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-0 sm:px-4 lg:px-8 py-0 sm:py-8">
        <div className="grid gap-0 sm:gap-8 lg:grid-cols-3">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6 sm:space-y-8">
            <Tabs defaultValue="about" className="w-full">
              <div className="overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 sticky top-[64px] z-30 bg-background/80 backdrop-blur-md pt-2 pb-1 border-b border-border/40 sm:border-none sm:static">
                <TabsList className="h-auto p-1 bg-muted/40 rounded-xl gap-1 inline-flex whitespace-nowrap min-w-full sm:min-w-0">
                  <TabsTrigger value="about" className="rounded-lg py-2.5 px-5 font-bold data-[state=active]:bg-background data-[state=active]:shadow-lg active:scale-95 transition-all">About</TabsTrigger>
                  <TabsTrigger value="imams" className="rounded-lg py-2.5 px-5 font-bold data-[state=active]:bg-background data-[state=active]:shadow-lg active:scale-95 transition-all">Imams ({imams.length})</TabsTrigger>
                  <TabsTrigger value="management" className="rounded-lg py-2.5 px-5 font-bold data-[state=active]:bg-background data-[state=active]:shadow-lg active:scale-95 transition-all">Management</TabsTrigger>
                  <TabsTrigger value="library" className="rounded-lg py-2.5 px-5 font-bold data-[state=active]:bg-background data-[state=active]:shadow-lg active:scale-95 transition-all">Library</TabsTrigger>
                  <TabsTrigger value="events" className="rounded-lg py-2.5 px-5 font-bold data-[state=active]:bg-background data-[state=active]:shadow-lg active:scale-95 transition-all">Events ({events.length})</TabsTrigger>
                  <TabsTrigger value="announcements" className="rounded-lg py-2.5 px-5 font-bold data-[state=active]:bg-background data-[state=active]:shadow-lg active:scale-95 transition-all">Announcements</TabsTrigger>
                  <TabsTrigger value="donations" className="rounded-lg py-2.5 px-5 font-bold data-[state=active]:bg-background data-[state=active]:shadow-lg active:scale-95 transition-all">Donations </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="about" className="mt-6 space-y-6 px-4 sm:px-0">
                <Card className="border-border/40 shadow-sm rounded-2xl overflow-hidden">
                  <CardHeader className="bg-muted/30 pb-4 border-b border-border/40">
                    <CardTitle className="text-lg font-black tracking-tight flex items-center gap-2">
                       <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                          <Building2 className="h-4 w-4" />
                       </div>
                       About the Mosque
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <p className="text-muted-foreground leading-relaxed font-medium">
                      {mosque.description}
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-border/40 shadow-sm rounded-2xl overflow-hidden">
                   <CardHeader className="bg-muted/30 pb-4 border-b border-border/40">
                    <CardTitle className="text-lg font-black tracking-tight flex items-center gap-2">
                       <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                          <ShieldCheck className="h-4 w-4" />
                       </div>
                       Available Facilities
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="flex flex-wrap gap-2.5">
                      {mosque.facilities.map((facility) => (
                        <Badge key={facility} variant="secondary" className="text-xs font-bold py-2 px-4 rounded-xl bg-muted/50 border border-border/40 hover:bg-primary/5 hover:text-primary transition-all">
                          {facility}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Map Section */}
                <Card className="border-border/40 shadow-sm rounded-2xl overflow-hidden">
                   <CardHeader className="bg-muted/30 pb-4 border-b border-border/40">
                    <CardTitle className="text-lg font-black tracking-tight flex items-center gap-2">
                       <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                          <MapPin className="h-4 w-4" />
                       </div>
                       Location & Directions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="group relative h-64 sm:h-80 rounded-2xl bg-muted/30 border border-border/40 overflow-hidden flex items-center justify-center transition-all hover:bg-muted/40">
                      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:20px_20px]" />
                      <div className="relative text-center px-6">
                        <div className="h-16 w-16 mx-auto bg-background border border-border/40 rounded-3xl flex items-center justify-center shadow-xl mb-4 group-hover:scale-110 transition-transform">
                           <MapPin className="h-8 w-8 text-primary shadow-primary/20" />
                        </div>
                        <p className="text-sm font-bold text-foreground mb-1 leading-tight">
                          {mosque.address}
                        </p>
                        <p className="text-xs text-muted-foreground font-medium mb-6">
                          {mosque.city}, {mosque.state} {mosque.zipCode}
                        </p>
                        <Button 
                          onClick={handleDirections}
                          className="gap-2 rounded-xl font-bold px-6 shadow-lg shadow-primary/10"
                        >
                          <Navigation className="h-4 w-4" />
                          View on Google Maps
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="imams" className="mt-6">
                <div className="space-y-6">
                  {imams.length === 0 ? (
                    <Card>
                      <CardContent className="py-12 text-center">
                        <User className="h-12 w-12 mx-auto text-muted-foreground/50" />
                        <p className="mt-4 text-muted-foreground">No imam profiles available</p>
                      </CardContent>
                    </Card>
                  ) : (
                    imams.map((imam) => (
                      <ImamProfile key={imam.id} imam={imam} mosqueId={mosque.id} />
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="management" className="mt-6 px-4 sm:px-0 space-y-8">
                {managementTeam.length === 0 ? (
                  <Card className="border-dashed border-border/40 py-20">
                    <CardContent className="text-center">
                      <Users className="h-16 w-16 mx-auto text-muted-foreground/20 mb-4" />
                      <p className="text-muted-foreground font-bold italic">No management directory available yet</p>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    <ManagementOverview team={managementTeam} />
                    <div className="grid gap-6 md:grid-cols-2">
                      {managementTeam.map((member) => (
                        <ManagementMemberCard key={member.id} member={member} mosqueId={mosque.id} />
                      ))}
                    </div>
                  </>
                )}
              </TabsContent>

              <TabsContent value="library" className="mt-6">
                <MosqueLibrary mosqueId={mosque.id} mosqueName={mosque.name} />
              </TabsContent>

              <TabsContent value="events" className="mt-6">
                <div className="space-y-4">
                  {events.length === 0 ? (
                    <Card>
                      <CardContent className="py-12 text-center">
                        <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50" />
                        <p className="mt-4 text-muted-foreground">No upcoming events</p>
                      </CardContent>
                    </Card>
                  ) : (
                    events.map((event) => (
                      <Link key={event.id} href={`/events/${event.id}`}>
                        <Card className="hover:border-primary/30 transition-colors">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <h3 className="font-semibold">{event.title}</h3>
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                  {event.description}
                                </p>
                                <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-4 w-4" />
                                    {new Date(event.startDate).toLocaleDateString()}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-4 w-4" />
                                    {event.startTime}
                                  </span>
                                </div>
                              </div>
                              <Badge variant="secondary">{event.category}</Badge>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="announcements" className="mt-6">
                <div className="space-y-4">
                  {announcements.length === 0 ? (
                    <Card>
                      <CardContent className="py-12 text-center">
                        <Building2 className="h-12 w-12 mx-auto text-muted-foreground/50" />
                        <p className="mt-4 text-muted-foreground">No announcements</p>
                      </CardContent>
                    </Card>
                  ) : (
                    announcements.map((announcement) => (
                      <Card key={announcement.id} className={announcement.isPinned ? 'border-primary/30' : ''}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            {announcement.isPinned && (
                              <Badge variant="default" className="flex-shrink-0">Pinned</Badge>
                            )}
                            <div className="flex-1">
                              <h3 className="font-semibold">{announcement.title}</h3>
                              <p className="text-sm text-muted-foreground mt-1">
                                {announcement.content}
                              </p>
                              <p className="text-xs text-muted-foreground mt-2">
                                {announcement.authorName} - {new Date(announcement.publishDate).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="donations" className="mt-6">
                <div className="space-y-4">
                  {donationGoals.length === 0 ? (
                    <Card>
                      <CardContent className="py-12 text-center">
                        <Building2 className="h-12 w-12 mx-auto text-muted-foreground/50" />
                        <p className="mt-4 text-muted-foreground">No active donation campaigns</p>
                      </CardContent>
                    </Card>
                  ) : (
                    donationGoals.map((goal) => {
                      const progress = (goal.currentAmount / goal.targetAmount) * 100
                      return (
                        <Card key={goal.id}>
                          <CardContent className="p-4">
                            <h3 className="font-semibold">{goal.title}</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              {goal.description}
                            </p>
                            <div className="mt-4">
                              <div className="flex justify-between text-sm mb-2">
                                <span className="font-medium">${goal.currentAmount.toLocaleString()}</span>
                                <span className="text-muted-foreground">of ${goal.targetAmount.toLocaleString()}</span>
                              </div>
                              <div className="h-2 rounded-full bg-muted">
                                <div 
                                  className="h-full rounded-full bg-primary transition-all"
                                  style={{ width: `${Math.min(progress, 100)}%` }}
                                />
                              </div>
                              <p className="text-xs text-muted-foreground mt-2">
                                {progress.toFixed(0)}% funded - ends {new Date(goal.endDate).toLocaleDateString()}
                              </p>
                            </div>
                            <Button className="w-full mt-4">Donate Now</Button>
                          </CardContent>
                        </Card>
                      )
                    })
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column - Sidebar Widgets */}
          <div className="space-y-6 sm:space-y-8 px-4 sm:px-0 mt-8 lg:mt-0">
            {/* Today's Prayer Times Widget */}
            {prayerTimes && (
              <Card className="border-border/40 shadow-2xl shadow-primary/5 rounded-[2rem] overflow-hidden sticky top-[80px]">
                <CardHeader className="bg-gradient-to-br from-primary to-primary/90 text-primary-foreground p-6">
                  <div className="flex items-center justify-between">
                    <div>
                       <h3 className="text-xl font-black tracking-tighter italic">Iqamah Times</h3>
                       <p className="text-[10px] uppercase font-black tracking-[0.3em] opacity-80 mt-1">Today's Schedule</p>
                    </div>
                    <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20">
                       <Clock className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-3 space-y-1.5 mt-2 pb-6">
                  <PrayerTimeRow label="Fajr" time={prayerTimes.fajr} iqama={prayerTimes.fajrIqama} />
                  <PrayerTimeRow label="Dhuhr" time={prayerTimes.dhuhr} iqama={prayerTimes.dhuhrIqama} />
                  <PrayerTimeRow label="Asr" time={prayerTimes.asr} iqama={prayerTimes.asrIqama} />
                  <PrayerTimeRow label="Maghrib" time={prayerTimes.maghrib} iqama={prayerTimes.maghribIqama} />
                  <PrayerTimeRow label="Isha" time={prayerTimes.isha} iqama={prayerTimes.ishaIqama} />
                  {prayerTimes.jummah && (
                    <div className="mt-4 pt-4 border-t border-border/40 px-2">
                      <PrayerTimeRow label="Jummah" time={prayerTimes.jummah} iqama={prayerTimes.jummahIqama} isSpecial />
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Contact Card */}
            <Card className="border-border/40 shadow-sm rounded-3xl overflow-hidden">
               <CardHeader className="pb-3 px-6 pt-6">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Connect With Mosque</h4>
               </CardHeader>
               <CardContent className="px-3 pb-3">
                  <div className="space-y-1">
                    {mosque.phone && (
                      <a href={`tel:${mosque.phone}`} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-muted/80 transition-all active:scale-[0.98] border border-transparent hover:border-border/40 group">
                        <div className="h-10 w-10 shrink-0 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-all">
                           <Phone className="h-5 w-5" />
                        </div>
                        <div className="flex-1 overflow-hidden">
                           <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest leading-none mb-1">Phone</p>
                           <p className="font-bold text-sm truncate">{mosque.phone}</p>
                        </div>
                      </a>
                    )}
                    {mosque.email && (
                      <a href={`mailto:${mosque.email}`} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-muted/80 transition-all active:scale-[0.98] border border-transparent hover:border-border/40 group">
                        <div className="h-10 w-10 shrink-0 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center group-hover:bg-sky-500 group-hover:text-white transition-all">
                           <Mail className="h-5 w-5" />
                        </div>
                        <div className="flex-1 overflow-hidden">
                           <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest leading-none mb-1">Email</p>
                           <p className="font-bold text-sm truncate">{mosque.email}</p>
                        </div>
                      </a>
                    )}
                    {mosque.website && (
                      <a href={mosque.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-4 rounded-2xl hover:bg-muted/80 transition-all active:scale-[0.98] border border-transparent hover:border-border/40 group">
                        <div className="h-10 w-10 shrink-0 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
                           <Globe className="h-5 w-5" />
                        </div>
                        <div className="flex-1 overflow-hidden">
                           <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest leading-none mb-1">Website</p>
                           <p className="font-bold text-sm truncate">Visit Mosque Website</p>
                        </div>
                      </a>
                    )}
                  </div>
               </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

function PrayerTimeRow({ label, time, iqama, isSpecial }: { label: string; time: string; iqama?: string; isSpecial?: boolean }) {
  return (
    <div className={cn(
      "flex items-center justify-between p-3 rounded-xl transition-all",
      isSpecial ? "bg-white/10 text-white" : "hover:bg-muted/50"
    )}>
      <span className="font-bold text-sm tracking-tight">{label}</span>
      <div className="text-right">
        <span className="font-black text-sm tracking-tighter">{time}</span>
        {iqama && (
          <span className={cn(
            "text-[10px] font-bold ml-2",
            isSpecial ? "text-white/60" : "text-muted-foreground/60"
          )}>(Iqama: {iqama})</span>
        )}
      </div>
    </div>
  )
}

function MosqueIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 3c-1.5 2-3 3.5-3 5.5a3 3 0 1 0 6 0c0-2-1.5-3.5-3-5.5z" />
      <path d="M4 21V10a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v11" />
      <path d="M9 21v-4a3 3 0 0 1 6 0v4" />
      <path d="M3 21h18" />
      <path d="M4 10l8-6 8 6" />
    </svg>
  )
}

// Imam Profile Component
function ImamProfile({ imam, mosqueId }: { imam: Imam; mosqueId: string }) {
  return (
    <Card className="border-border/40 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
      <CardContent className="p-0">
        {/* Header with Photo and Basic Info */}
        <div className="flex flex-col sm:flex-row gap-0 sm:gap-6">
          <div className="relative group overflow-hidden bg-muted/30 sm:bg-transparent">
            <Avatar className="h-48 w-full sm:h-32 sm:w-32 rounded-none sm:rounded-2xl transition-transform duration-500 group-hover:scale-110">
              <AvatarImage src={imam.photoUrl} alt={imam.name} className="object-cover" />
              <AvatarFallback className="rounded-none sm:rounded-2xl text-4xl sm:text-2xl bg-primary/10 text-primary font-black">
                {imam.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent sm:hidden" />
            <div className="absolute bottom-4 left-4 sm:hidden">
               <Badge className="bg-primary shadow-lg">{imam.title}</Badge>
            </div>
          </div>
          
          <div className="flex-1 p-6">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
              <div>
                <Link href={`/mosques/${mosqueId}/imam/${imam.id}`} className="hover:text-primary transition-colors group">
                  <h3 className="text-2xl font-bold text-foreground tracking-tight group-hover:translate-x-1 transition-transform">{imam.name}</h3>
                </Link>
                <div className="hidden sm:block mt-1">
                  <Badge variant="secondary" className="font-bold tracking-tight">{imam.title}</Badge>
                </div>
              </div>
              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                {imam.yearsOfExperience}+ Years Exp
              </Badge>
            </div>
            
            <p className="mt-4 text-muted-foreground leading-relaxed text-sm sm:text-base line-clamp-3 font-medium opacity-90">
              {imam.biography}
            </p>

            {/* Contact Info */}
            <div className="mt-6 flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-6">
              {imam.contactEmail && (
                <a href={`mailto:${imam.contactEmail}`} className="flex items-center gap-2 text-sm font-bold text-primary/80 hover:text-primary transition-all active:scale-95">
                  <div className="p-1.5 rounded-lg bg-primary/5">
                    <Mail className="h-4 w-4" />
                  </div>
                  {imam.contactEmail}
                </a>
              )}
              {imam.officeHours && (
                <span className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                  <div className="p-1.5 rounded-lg bg-muted">
                    <Clock className="h-4 w-4" />
                  </div>
                  Hours: {imam.officeHours}
                </span>
              )}
            </div>

            {/* Social Media & Actions */}
            <div className="mt-6 flex flex-row items-center justify-between border-t border-border/40 pt-4 gap-4">
              {imam.socialMedia && (
                <div className="flex gap-2.5">
                  {imam.socialMedia.youtube && (
                    <a href={imam.socialMedia.youtube} target="_blank" rel="noopener noreferrer" className="p-3 rounded-xl bg-muted/50 hover:bg-primary/10 hover:text-primary transition-all active:scale-90">
                      <Youtube className="h-5 w-5" />
                    </a>
                  )}
                  {imam.socialMedia.twitter && (
                    <a href={imam.socialMedia.twitter} target="_blank" rel="noopener noreferrer" className="p-3 rounded-xl bg-muted/50 hover:bg-primary/10 hover:text-primary transition-all active:scale-90">
                      <Twitter className="h-5 w-5" />
                    </a>
                  )}
                  {imam.socialMedia.facebook && (
                    <a href={imam.socialMedia.facebook} target="_blank" rel="noopener noreferrer" className="p-3 rounded-xl bg-muted/50 hover:bg-primary/10 hover:text-primary transition-all active:scale-90">
                      <Facebook className="h-5 w-5" />
                    </a>
                  )}
                  {imam.socialMedia.instagram && (
                    <a href={imam.socialMedia.instagram} target="_blank" rel="noopener noreferrer" className="p-3 rounded-xl bg-muted/50 hover:bg-primary/10 hover:text-primary transition-all active:scale-90">
                      <Instagram className="h-5 w-5" />
                    </a>
                  )}
                </div>
              )}

              <Link href={`/mosques/${mosqueId}/imam/${imam.id}`} className="flex-shrink-0 animate-in fade-in slide-in-from-right-2 duration-1000">
                <Button variant="default" size="sm" className="rounded-xl font-bold px-6 shadow-lg shadow-primary/20 transition-all active:scale-95">
                  Full Profile
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Detailed Information Accordion */}
        <div className="px-6 pb-6">
          <Accordion type="multiple" className="w-full">
            {/* Education */}
            <AccordionItem value="education" className="border-border/40">
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/5 text-primary">
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  <span className="font-bold tracking-tight">Education & Qualifications</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="space-y-4 pt-2">
                  {imam.education.map((edu, index) => (
                    <div key={index} className="flex gap-4 p-4 rounded-2xl bg-muted/20 border border-border/40">
                      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <GraduationCap className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm">{edu.degree} in {edu.field}</h4>
                        <p className="text-xs text-muted-foreground font-medium">{edu.institution}</p>
                        <p className="text-[10px] text-muted-foreground/60 font-black uppercase tracking-widest mt-1.5">{edu.location} • {edu.year}</p>
                      </div>
                    </div>
                  ))}
                  
                  {imam.certifications && imam.certifications.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-border/40">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-3 ml-1">Certifications</h4>
                      <div className="flex flex-wrap gap-2">
                        {imam.certifications.map((cert, index) => (
                          <Badge key={index} variant="outline" className="rounded-lg border-border/60 bg-muted/10 font-bold px-3 py-1">{cert}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Specializations */}
            <AccordionItem value="specializations" className="border-border/40">
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/5 text-primary">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <span className="font-bold tracking-tight">Specializations & Languages</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="grid gap-6 pt-2">
                  <div>
                     <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-3 ml-1">Expertise</h4>
                    <div className="flex flex-wrap gap-2">
                      {imam.specializations.map((spec, index) => (
                        <Badge key={index} className="bg-primary/5 text-primary border-primary/20 font-bold px-4 py-1.5 rounded-xl">{spec}</Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-border/40">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-3 ml-1">Languages</h4>
                    <div className="flex flex-wrap gap-3">
                      {imam.languages.map((lang, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm font-bold bg-muted/40 px-4 py-2 rounded-xl border border-border/40">
                           <Languages className="h-4 w-4 text-primary/60" />
                           {lang}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </CardContent>
    </Card>
  )
}

// Management Overview Component
function ManagementOverview({ team }: { team: ManagementMember[] }) {
  const boardMembers = team.filter(m => ['president', 'vice_president', 'secretary', 'treasurer', 'trustee', 'board_member'].includes(m.position))
  const committeeHeads = team.filter(m => !['president', 'vice_president', 'secretary', 'treasurer', 'trustee', 'board_member'].includes(m.position))
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Mosque Leadership Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="text-center p-4 rounded-lg bg-primary/5">
            <p className="text-3xl font-bold text-primary">{team.length}</p>
            <p className="text-sm text-muted-foreground">Total Members</p>
          </div>
          <div className="text-center p-4 rounded-lg bg-muted">
            <p className="text-3xl font-bold">{boardMembers.length}</p>
            <p className="text-sm text-muted-foreground">Board Members</p>
          </div>
          <div className="text-center p-4 rounded-lg bg-muted">
            <p className="text-3xl font-bold">{committeeHeads.length}</p>
            <p className="text-sm text-muted-foreground">Committee Heads</p>
          </div>
          <div className="text-center p-4 rounded-lg bg-muted">
            <p className="text-3xl font-bold">{team.filter(m => m.isElected).length}</p>
            <p className="text-sm text-muted-foreground">Elected Positions</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Management Member Card Component
function ManagementMemberCard({ member, mosqueId }: { member: ManagementMember; mosqueId: string }) {
  const positionLabels: Record<string, string> = {
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
    women_coordinator: 'Women\'s Coordinator',
    facilities_manager: 'Facilities Manager',
    security_head: 'Security Head',
    other: 'Staff Member'
  }

  return (
    <Card className="hover:border-primary/40 shadow-sm hover:shadow-md transition-all active:scale-[0.98] group overflow-hidden border-border/40 rounded-2xl">
      <CardContent className="p-5 flex items-center sm:items-start gap-4 sm:gap-6">
        <div className="relative shrink-0">
          <Avatar className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl border-2 border-primary/5 shadow-inner transition-transform group-hover:scale-105 duration-500">
            <AvatarImage src={member.photoUrl} alt={member.name} className="object-cover" />
            <AvatarFallback className="rounded-2xl bg-primary/5 text-primary text-xl font-black">
              {member.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-emerald-500 border-2 border-background shadow-sm" />
        </div>
        
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2">
            <Link href={`/mosques/${mosqueId}/management/${member.id}`} className="hover:text-primary transition-colors block">
              <h4 className="text-base sm:text-lg font-black truncate tracking-tight leading-tight">{member.name}</h4>
            </Link>
            <Badge variant="secondary" className="w-fit text-[9px] font-black uppercase tracking-widest bg-muted/60 text-muted-foreground border-transparent rounded-lg px-2 py-0.5">
              {positionLabels[member.position] || member.position}
            </Badge>
          </div>

          {member.department && (
            <p className="text-[10px] font-bold text-primary/60 uppercase tracking-widest mt-1 opacity-80">{member.department}</p>
          )}
          
          <div className="mt-4 flex flex-wrap gap-4 border-t border-border/40 pt-3 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:flex">
            <a href={`mailto:${member.email}`} className="flex items-center gap-2 text-[11px] font-bold text-muted-foreground hover:text-primary transition-all">
              <Mail className="h-3.5 w-3.5 opacity-60" />
              <span className="truncate">{member.email}</span>
            </a>
            {member.phone && (
              <a href={`tel:${member.phone}`} className="flex items-center gap-2 text-[11px] font-bold text-muted-foreground hover:text-primary transition-all">
                <Phone className="h-3.5 w-3.5 opacity-60" />
                {member.phone}
              </a>
            )}
          </div>

          <div className="mt-4 sm:mt-2 flex items-center justify-between sm:justify-start gap-4">
            <Link href={`/mosques/${mosqueId}/management/${member.id}`} className="flex-1 sm:flex-none">
              <Button variant="outline" size="sm" className="w-full sm:w-auto text-[11px] font-black uppercase tracking-widest h-9 rounded-xl border-border/60 hover:bg-primary/5 hover:text-primary hover:border-primary/20 transition-all active:scale-95">
                View Bio
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Mosque Library Component
function MosqueLibrary({ mosqueId, mosqueName }: { mosqueId: string; mosqueName: string }) {
  const { 
    getBooksByMosque, 
    getItemsByMosque, 
    addBook,
    getPendingBooks
  } = useLibraryStore()
  
  const [activeTab, setActiveTab] = useState<'books' | 'items'>('books')
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [selectedBook, setSelectedBook] = useState<LibraryBook | null>(null)
  
  // Form state for adding new book
  const [newBook, setNewBook] = useState({
    title: '',
    author: '',
    isbn: '',
    category: 'general_islamic' as BookCategory,
    language: 'English',
    description: '',
    publisher: '',
    publishYear: new Date().getFullYear(),
    totalCopies: 1,
    location: '',
    condition: 'good' as BookCondition,
    tags: '',
    isReferenceOnly: false
  })
  
  const books = getBooksByMosque(mosqueId)
  const items = getItemsByMosque(mosqueId)
  const pendingBooks = getPendingBooks(mosqueId)
  
  // Filter books
  const filteredBooks = books.filter(book => {
    const matchesSearch = book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         book.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (book.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())))
    const matchesCategory = categoryFilter === 'all' || book.category === categoryFilter
    return matchesSearch && matchesCategory
  })
  
  // Filter items
  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.category.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })
  
  const handleAddBook = () => {
    if (!newBook.title || !newBook.author || !newBook.location) {
      toast.error('Please fill in all required fields')
      return
    }
    
    addBook({
      mosqueId,
      title: newBook.title,
      author: newBook.author,
      isbn: newBook.isbn || undefined,
      category: newBook.category,
      language: newBook.language,
      description: newBook.description || undefined,
      publisher: newBook.publisher || undefined,
      publishYear: newBook.publishYear || undefined,
      totalCopies: newBook.totalCopies,
      availableCopies: newBook.totalCopies,
      location: newBook.location,
      condition: newBook.condition,
      addedBy: 'current-user',
      addedByName: 'Community Member',
      status: 'pending_approval',
      tags: newBook.tags ? newBook.tags.split(',').map(t => t.trim()) : undefined,
      isReferencOnly: newBook.isReferenceOnly
    })
    
    toast.success('Book submitted for approval', {
      description: 'Your book suggestion will be reviewed by the library admin.'
    })
    
    setIsAddDialogOpen(false)
    setNewBook({
      title: '',
      author: '',
      isbn: '',
      category: 'general_islamic',
      language: 'English',
      description: '',
      publisher: '',
      publishYear: new Date().getFullYear(),
      totalCopies: 1,
      location: '',
      condition: 'good',
      tags: '',
      isReferenceOnly: false
    })
  }
  
  const categories = Object.entries(bookCategoryLabels)
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Library className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Mosque Library & Inventory</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Browse books and items available at {mosqueName}
                </p>
              </div>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Suggest Book
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Suggest a New Book</DialogTitle>
                  <DialogDescription>
                    Submit a book suggestion to the library. It will be reviewed by the library admin before being added.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="grid gap-4 py-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="title">Book Title *</Label>
                      <Input
                        id="title"
                        value={newBook.title}
                        onChange={(e) => setNewBook({ ...newBook, title: e.target.value })}
                        placeholder="Enter book title"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="author">Author *</Label>
                      <Input
                        id="author"
                        value={newBook.author}
                        onChange={(e) => setNewBook({ ...newBook, author: e.target.value })}
                        placeholder="Enter author name"
                      />
                    </div>
                  </div>
                  
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="category">Category *</Label>
                      <Select
                        value={newBook.category}
                        onValueChange={(value) => setNewBook({ ...newBook, category: value as BookCategory })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="language">Language</Label>
                      <Select
                        value={newBook.language}
                        onValueChange={(value) => setNewBook({ ...newBook, language: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="English">English</SelectItem>
                          <SelectItem value="Arabic">Arabic</SelectItem>
                          <SelectItem value="Arabic/English">Arabic/English</SelectItem>
                          <SelectItem value="Urdu">Urdu</SelectItem>
                          <SelectItem value="Turkish">Turkish</SelectItem>
                          <SelectItem value="French">French</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="isbn">ISBN (Optional)</Label>
                      <Input
                        id="isbn"
                        value={newBook.isbn}
                        onChange={(e) => setNewBook({ ...newBook, isbn: e.target.value })}
                        placeholder="978-..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="publisher">Publisher</Label>
                      <Input
                        id="publisher"
                        value={newBook.publisher}
                        onChange={(e) => setNewBook({ ...newBook, publisher: e.target.value })}
                        placeholder="Publisher name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="publishYear">Year</Label>
                      <Input
                        id="publishYear"
                        type="number"
                        value={newBook.publishYear}
                        onChange={(e) => setNewBook({ ...newBook, publishYear: parseInt(e.target.value) })}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={newBook.description}
                      onChange={(e) => setNewBook({ ...newBook, description: e.target.value })}
                      placeholder="Brief description of the book..."
                      rows={3}
                    />
                  </div>
                  
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="copies">Number of Copies</Label>
                      <Input
                        id="copies"
                        type="number"
                        min={1}
                        value={newBook.totalCopies}
                        onChange={(e) => setNewBook({ ...newBook, totalCopies: parseInt(e.target.value) || 1 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="condition">Condition</Label>
                      <Select
                        value={newBook.condition}
                        onValueChange={(value) => setNewBook({ ...newBook, condition: value as BookCondition })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select condition" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(conditionLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location">Shelf Location *</Label>
                      <Input
                        id="location"
                        value={newBook.location}
                        onChange={(e) => setNewBook({ ...newBook, location: e.target.value })}
                        placeholder="e.g., Shelf A-1"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="tags">Tags (comma-separated)</Label>
                    <Input
                      id="tags"
                      value={newBook.tags}
                      onChange={(e) => setNewBook({ ...newBook, tags: e.target.value })}
                      placeholder="e.g., beginner, recommended, classic"
                    />
                  </div>
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddBook}>
                    Submit for Approval
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Stats */}
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="rounded-lg bg-primary/5 p-4 text-center">
              <BookMarked className="h-6 w-6 mx-auto text-primary mb-2" />
              <p className="text-2xl font-bold">{books.length}</p>
              <p className="text-xs text-muted-foreground">Total Books</p>
            </div>
            <div className="rounded-lg bg-muted p-4 text-center">
              <BookCopy className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
              <p className="text-2xl font-bold">{books.reduce((acc, b) => acc + b.availableCopies, 0)}</p>
              <p className="text-xs text-muted-foreground">Available Copies</p>
            </div>
            <div className="rounded-lg bg-muted p-4 text-center">
              <Package className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
              <p className="text-2xl font-bold">{items.length}</p>
              <p className="text-xs text-muted-foreground">Other Items</p>
            </div>
            <div className="rounded-lg bg-muted p-4 text-center">
              <AlertCircle className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
              <p className="text-2xl font-bold">{pendingBooks.length}</p>
              <p className="text-xs text-muted-foreground">Pending Approval</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Tabs and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
            <div className="flex gap-2">
              <Button
                variant={activeTab === 'books' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('books')}
                className="gap-2"
              >
                <BookOpen className="h-4 w-4" />
                Books ({books.length})
              </Button>
              <Button
                variant={activeTab === 'items' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('items')}
                className="gap-2"
              >
                <Package className="h-4 w-4" />
                Items ({items.length})
              </Button>
            </div>
            
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-[200px]"
                />
              </div>
              {activeTab === 'books' && (
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[180px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          
          {/* Books Grid */}
          {activeTab === 'books' && (
            filteredBooks.length === 0 ? (
              <div className="py-12 text-center">
                <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/50" />
                <p className="mt-4 text-muted-foreground">
                  {searchQuery || categoryFilter !== 'all' 
                    ? 'No books match your search criteria' 
                    : 'No books in the library yet'}
                </p>
                <Button 
                  variant="outline" 
                  className="mt-4 gap-2"
                  onClick={() => setIsAddDialogOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                  Be the first to suggest a book
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredBooks.map((book) => (
                  <BookCard 
                    key={book.id} 
                    book={book} 
                    onClick={() => setSelectedBook(book)}
                  />
                ))}
              </div>
            )
          )}
          
          {/* Items Grid */}
          {activeTab === 'items' && (
            filteredItems.length === 0 ? (
              <div className="py-12 text-center">
                <Package className="h-12 w-12 mx-auto text-muted-foreground/50" />
                <p className="mt-4 text-muted-foreground">
                  {searchQuery ? 'No items match your search' : 'No inventory items available'}
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredItems.map((item) => (
                  <Card key={item.id} className="hover:border-primary/30 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-muted">
                          <Package className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold truncate">{item.name}</h4>
                          <p className="text-sm text-muted-foreground">{item.category}</p>
                          <div className="mt-2 flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {item.availableQuantity} / {item.quantity} available
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            Location: {item.location}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )
          )}
        </CardContent>
      </Card>
      
      {/* Book Detail Dialog */}
      <Dialog open={!!selectedBook} onOpenChange={() => setSelectedBook(null)}>
        <DialogContent className="max-w-2xl">
          {selectedBook && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">{selectedBook.title}</DialogTitle>
                <DialogDescription>by {selectedBook.author}</DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge>{bookCategoryLabels[selectedBook.category]}</Badge>
                  <Badge variant="outline">{selectedBook.language}</Badge>
                  <Badge variant="outline">{conditionLabels[selectedBook.condition]}</Badge>
                  {selectedBook.isReferencOnly && (
                    <Badge variant="secondary">Reference Only</Badge>
                  )}
                </div>
                
                {selectedBook.description && (
                  <p className="text-muted-foreground">{selectedBook.description}</p>
                )}
                
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-sm">
                      <span className="font-medium">Publisher:</span>{' '}
                      {selectedBook.publisher || 'N/A'}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Year:</span>{' '}
                      {selectedBook.publishYear || 'N/A'}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">ISBN:</span>{' '}
                      {selectedBook.isbn || 'N/A'}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm">
                      <span className="font-medium">Location:</span>{' '}
                      {selectedBook.location}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Available:</span>{' '}
                      {selectedBook.availableCopies} of {selectedBook.totalCopies} copies
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Added by:</span>{' '}
                      {selectedBook.addedByName}
                    </p>
                  </div>
                </div>
                
                {selectedBook.tags && selectedBook.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {selectedBook.tags.map((tag, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
                
                <div className="flex gap-2 pt-4">
                  {!selectedBook.isReferencOnly && selectedBook.availableCopies > 0 ? (
                    <Button className="flex-1 gap-2">
                      <Check className="h-4 w-4" />
                      Request to Borrow
                    </Button>
                  ) : (
                    <Button className="flex-1" disabled>
                      {selectedBook.isReferencOnly ? 'Reference Only' : 'Not Available'}
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => setSelectedBook(null)}>
                    Close
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Book Card Component
function BookCard({ book, onClick }: { book: LibraryBook; onClick: () => void }) {
  return (
    <Card 
      className="hover:border-primary/30 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <BookOpen className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold line-clamp-2">{book.title}</h4>
            <p className="text-sm text-muted-foreground truncate">{book.author}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              <Badge variant="secondary" className="text-xs">
                {bookCategoryLabels[book.category]}
              </Badge>
              {book.availableCopies === 0 && (
                <Badge variant="destructive" className="text-xs">
                  Unavailable
                </Badge>
              )}
              {book.isReferencOnly && (
                <Badge variant="outline" className="text-xs">
                  Ref Only
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {book.availableCopies} of {book.totalCopies} available
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

