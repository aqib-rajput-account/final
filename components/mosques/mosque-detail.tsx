"use client";

import Link from "next/link";
import type { ElementType, ReactNode } from "react";
import { useDeferredValue, useMemo, useState } from "react";
import {
  Bell,
  BookMarked,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  Clock,
  ExternalLink,
  Globe,
  Library,
  Mail,
  MapPin,
  MessageSquare,
  Navigation,
  Package,
  Phone,
  Plus,
  Search,
  Share2,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  bookCategoryLabels,
  conditionLabels,
  itemTypeLabels,
  useLibraryStore,
} from "@/lib/stores";
import type { PublicMosquePageData, PublicManagementTeam } from "@/lib/mosques/public";
import type { BookCategory, BookCondition, LibraryBook, LibraryItem } from "@/lib/types";
import { cn } from "@/lib/utils";

interface MosqueDetailProps {
  data: PublicMosquePageData;
}

const announcementPriorityTone: Record<string, string> = {
  urgent: "border-red-500/20 bg-red-500/10 text-red-600",
  high: "border-amber-500/20 bg-amber-500/10 text-amber-600",
  normal: "border-primary/20 bg-primary/10 text-primary",
  low: "border-muted-foreground/20 bg-muted text-muted-foreground",
};

export function MosqueDetail({ data }: MosqueDetailProps) {
  const { mosque, prayerTimes, imams, announcements, events, donations, recentPosts, managementTeams, stats } =
    data;

  const destinationQuery =
    mosque.latitude && mosque.longitude
      ? `${mosque.latitude},${mosque.longitude}`
      : [mosque.address, mosque.city, mosque.state, mosque.country].filter(Boolean).join(", ");
  const mapsQuery = encodeURIComponent(destinationQuery);
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${mapsQuery}`;
  const mapEmbedUrl = `https://maps.google.com/maps?q=${mapsQuery}&z=15&output=embed`;
  const prayerDateLabel = prayerTimes ? formatDate(prayerTimes.date) : null;
  const prayerDateIsToday = prayerTimes ? prayerTimes.date === new Date().toISOString().slice(0, 10) : false;

  const totalRaised = donations.reduce((sum, donation) => sum + donation.amount, 0);

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: mosque.name,
          text: mosque.description ?? mosque.name,
          url: window.location.href,
        });
        return;
      }

      await navigator.clipboard.writeText(window.location.href);
      toast.success("Mosque link copied to clipboard");
    } catch {
      toast.error("Unable to share this page right now");
    }
  };

  const openDirections = () => {
    window.open(directionsUrl, "_blank");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section - Clean minimal design */}
      <div className="relative border-b border-border/30 bg-[#f0f5f3]">
        {/* Subtle diamond pattern */}
        <div className="absolute inset-0 opacity-[0.4]">
          <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="mosque-diamond-pattern" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
                <path d="M16 0L32 16L16 32L0 16Z" fill="none" stroke="#166534" strokeWidth="0.3" strokeOpacity="0.15" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#mosque-diamond-pattern)" />
          </svg>
        </div>

        <div className="relative mx-auto max-w-6xl px-4 py-5 lg:px-6">
          {/* Back Link */}
          <Link
            href="/mosques"
            className="group mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary/80"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Back to Directory</span>
          </Link>

          {/* Main Hero Content */}
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-5">
              {/* Mosque Icon */}
              <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-primary/10">
                <MosqueIcon className="h-8 w-8 text-primary" />
              </div>

              {/* Mosque Info */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                    {mosque.name}
                  </h1>
                  {mosque.is_verified && (
                    <Badge variant="outline" className="gap-1.5 rounded-full border-primary/40 bg-transparent px-3 py-0.5 text-xs font-medium text-primary">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Verified
                    </Badge>
                  )}
                </div>

                {/* Location Row */}
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 text-muted-foreground/70" />
                  <span>{mosque.address}, {mosque.city}, {mosque.state} {mosque.zip_code}</span>
                </div>

                {/* Meta Info Row */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {mosque.capacity && (
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="h-4 w-4 text-muted-foreground/70" />
                      Capacity: {mosque.capacity.toLocaleString()}
                    </span>
                  )}
                  {mosque.established_year && (
                    <span>Est. {mosque.established_year}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-shrink-0 items-center gap-2">
              <Button
                onClick={openDirections}
                className="h-10 gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <Navigation className="h-4 w-4" />
                Get Directions
              </Button>
              <Button
                onClick={handleShare}
                variant="outline"
                className="h-10 gap-2 rounded-lg border-border bg-white px-5 text-sm font-medium text-foreground hover:bg-muted/50"
              >
                <Share2 className="h-4 w-4" />
                Share
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-6xl px-4 py-8 lg:px-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* Left Column - Main Content */}
          <div className="space-y-5">
            {/* About Card */}
            <Card className="rounded-xl border-border/50 bg-white shadow-sm">
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold text-foreground">About</h2>
                <p className="mt-3 leading-relaxed text-muted-foreground">
                  {mosque.description || "A welcoming community mosque serving the heart of the area with daily prayers, educational programs, and community services."}
                </p>
              </CardContent>
            </Card>

            {/* Facilities Card */}
            <Card className="rounded-xl border-border/50 bg-white shadow-sm">
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold text-foreground">Facilities</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {(mosque.facilities ?? []).length > 0 ? (
                    mosque.facilities?.map((facility) => (
                      <Badge
                        key={facility}
                        variant="outline"
                        className="rounded-lg border-border bg-white px-3 py-1.5 text-sm font-normal text-foreground"
                      >
                        {facility}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Facilities will appear here once they are added.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Location Card */}
            <Card className="rounded-xl border-border/50 bg-white shadow-sm">
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold text-foreground">Location</h2>
                <div className="mt-4 overflow-hidden rounded-xl bg-[#f5f0e6]">
                  <div className="flex h-56 flex-col items-center justify-center p-6 text-center">
                    <MapPin className="mb-3 h-8 w-8 text-muted-foreground/60" strokeWidth={1.5} />
                    <p className="font-medium text-foreground">{mosque.address}</p>
                    <p className="text-muted-foreground">{mosque.city}, {mosque.state} {mosque.zip_code}</p>
                    <a
                      href={directionsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 text-sm font-medium text-primary hover:underline"
                    >
                      Open in Google Maps
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Hidden tabs for additional content */}
            <Tabs defaultValue="overview" className="w-full">
              <div className="hidden">
                <TabsList className="inline-flex h-auto min-w-full gap-1 bg-transparent p-0 sm:min-w-0">
                  <PrimaryTab value="overview" label="Overview" />
                  <PrimaryTab value="people" label="People" />
                  <PrimaryTab value="programs" label="Programs" />
                  <PrimaryTab value="community" label="Community" />
                  <PrimaryTab value="library" label="Library" />
                </TabsList>
              </div>

              <TabsContent value="overview" className="mt-0">
                <Tabs defaultValue="about" className="space-y-6">
                  <SubTabList>
                    <TabsTrigger value="about">About</TabsTrigger>
                    <TabsTrigger value="prayer">Prayer Times</TabsTrigger>
                    <TabsTrigger value="visit">Visit & Map</TabsTrigger>
                  </SubTabList>

                  <TabsContent value="about" className="hidden space-y-4">
                    {/* Content moved to cards above */}
                  </TabsContent>

                  <TabsContent value="prayer" className="space-y-4">
                    <Card className="rounded-xl border-border/50 bg-white shadow-sm">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h2 className="text-lg font-semibold text-foreground">Prayer Schedule</h2>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {prayerDateLabel
                                ? prayerDateIsToday
                                  ? `Today's posted timetable for ${prayerDateLabel}`
                                  : `Latest available timetable for ${prayerDateLabel}`
                                : "Prayer times have not been published yet."}
                            </p>
                          </div>
                          <Button variant="outline" size="sm" className="rounded-lg border-border" asChild>
                            <Link href="/prayer-times">Full Times</Link>
                          </Button>
                        </div>
                        <div className="mt-5">
                          {prayerTimes ? (
                            <div className="space-y-0">
                              <PrayerTimeCard label="Fajr" adhan={prayerTimes.fajr_adhan} iqama={prayerTimes.fajr_iqama} />
                              <PrayerTimeCard label="Dhuhr" adhan={prayerTimes.dhuhr_adhan} iqama={prayerTimes.dhuhr_iqama} />
                              <PrayerTimeCard label="Asr" adhan={prayerTimes.asr_adhan} iqama={prayerTimes.asr_iqama} />
                              <PrayerTimeCard label="Maghrib" adhan={prayerTimes.maghrib_adhan} iqama={prayerTimes.maghrib_iqama} />
                              <PrayerTimeCard label="Isha" adhan={prayerTimes.isha_adhan} iqama={prayerTimes.isha_iqama} />
                              {prayerTimes.jummah_time && (
                                <>
                                  <Separator className="my-3" />
                                  <PrayerTimeCard
                                    label="Jummah"
                                    adhan={prayerTimes.jummah_time}
                                    iqama={prayerTimes.jummah_iqama}
                                  />
                                </>
                              )}
                            </div>
                          ) : (
                            <EmptyState
                              title="No prayer schedule published"
                              description="The mosque team has not posted prayer times yet."
                            />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="visit" className="hidden space-y-4">
                    {/* Content moved to Location card above */}
                  </TabsContent>
                </Tabs>
              </TabsContent>

                        <div className="grid gap-3 md:grid-cols-2">
                          <InfoRow label="Address" value={`${mosque.address}, ${mosque.city}, ${mosque.state}${mosque.zip_code ? ` ${mosque.zip_code}` : ""}`} />
                          <InfoRow label="Country" value={mosque.country} />
                          <InfoRow label="Phone" value={mosque.phone} href={mosque.phone ? `tel:${mosque.phone}` : undefined} />
                          <InfoRow label="Email" value={mosque.email} href={mosque.email ? `mailto:${mosque.email}` : undefined} />
                          <InfoRow
                            label="Website"
                            value={mosque.website}
                            href={mosque.website ? normalizeExternalUrl(mosque.website) : undefined}
                          />
                          <InfoRow
                            label="Directions"
                            value="Open in Google Maps"
                            href={directionsUrl}
                            external
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </TabsContent>

              <TabsContent value="people" className="mt-6">
                <Tabs defaultValue="imams" className="space-y-6">
                  <SubTabList>
                    <TabsTrigger value="imams">Imams</TabsTrigger>
                    <TabsTrigger value="teams">Teams</TabsTrigger>
                  </SubTabList>

                  <TabsContent value="imams" className="space-y-6">
                    {imams.length === 0 ? (
                      <EmptyState title="No imam profiles yet" description="The mosque has not published imam profiles yet." />
                    ) : (
                      <div className="grid gap-6 md:grid-cols-2">
                        {imams.map((imam) => (
                          <Card key={imam.id} className="rounded-3xl border-border/50">
                            <CardContent className="p-6">
                              <div className="flex items-start justify-between gap-4">
                                <div>
                                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/70">
                                    {imam.title || "Imam"}
                                  </p>
                                  <h3 className="mt-2 text-xl font-black tracking-tight">{imam.name}</h3>
                                  <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-muted-foreground">
                                    {imam.bio || "Biography coming soon."}
                                  </p>
                                </div>
                                {imam.is_active ? (
                                  <Badge className="rounded-full border-emerald-500/20 bg-emerald-500/10 text-emerald-600">
                                    Active
                                  </Badge>
                                ) : null}
                              </div>

                              <div className="mt-5 flex flex-wrap gap-2">
                                {(imam.languages ?? []).slice(0, 3).map((language) => (
                                  <Badge key={language} variant="outline" className="rounded-full px-3 py-1">
                                    {language}
                                  </Badge>
                                ))}
                                {(imam.specializations ?? []).slice(0, 2).map((specialization) => (
                                  <Badge key={specialization} variant="secondary" className="rounded-full px-3 py-1">
                                    {specialization}
                                  </Badge>
                                ))}
                              </div>

                              <div className="mt-6 flex flex-wrap gap-3">
                                <Button asChild className="rounded-xl">
                                  <Link href={`/mosques/${mosque.id}/imam/${imam.id}`}>View Profile</Link>
                                </Button>
                                {imam.email ? (
                                  <Button variant="outline" asChild className="rounded-xl">
                                    <a href={`mailto:${imam.email}`}>Email Imam</a>
                                  </Button>
                                ) : null}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="teams" className="space-y-6">
                    {managementTeams.length === 0 ? (
                      <EmptyState
                        title="No management teams published"
                        description="Management teams will appear here once the mosque operations structure is published."
                      />
                    ) : (
                      <>
                        <div className="grid gap-6 md:grid-cols-2">
                          {managementTeams.map((team) => (
                            <ManagementTeamCard key={team.id} team={team} mosqueId={mosque.id} />
                          ))}
                        </div>
                        <div className="flex justify-end">
                          <Button variant="outline" asChild className="rounded-xl">
                            <Link href={`/mosques/${mosque.id}/management`}>View Full Management Directory</Link>
                          </Button>
                        </div>
                      </>
                    )}
                  </TabsContent>
                </Tabs>
              </TabsContent>

              <TabsContent value="programs" className="mt-6">
                <Tabs defaultValue="events" className="space-y-6">
                  <SubTabList>
                    <TabsTrigger value="events">Events</TabsTrigger>
                    <TabsTrigger value="announcements">Announcements</TabsTrigger>
                  </SubTabList>

                  <TabsContent value="events" className="space-y-4">
                    {events.length === 0 ? (
                      <EmptyState
                        title="No upcoming programs scheduled"
                        description="New events will appear here as soon as the mosque publishes them."
                      />
                    ) : (
                      events.map((event) => (
                        <Link key={event.id} href={`/events/${event.id}`}>
                          <Card className="rounded-3xl border-border/50 transition-colors hover:border-primary/30">
                            <CardContent className="p-5">
                              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                <div className="space-y-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <Badge variant="secondary" className="rounded-full px-3 py-1 capitalize">
                                      {formatLabel(event.event_type)}
                                    </Badge>
                                    {event.is_recurring ? (
                                      <Badge variant="outline" className="rounded-full px-3 py-1">
                                        Recurring
                                      </Badge>
                                    ) : null}
                                  </div>
                                  <h3 className="text-lg font-black tracking-tight">{event.title}</h3>
                                  <p className="text-sm leading-relaxed text-muted-foreground">
                                    {event.description || "Event details will be shared soon."}
                                  </p>
                                </div>

                                <div className="space-y-2 text-sm text-muted-foreground sm:text-right">
                                  <p className="font-semibold text-foreground">{formatDate(event.start_date)}</p>
                                  <p>{formatTime(event.start_date)}</p>
                                  <p>{event.location || mosque.name}</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      ))
                    )}
                  </TabsContent>

                  <TabsContent value="announcements" className="space-y-4">
                    {announcements.length === 0 ? (
                      <EmptyState
                        title="No announcements posted"
                        description="The latest notices and updates from the mosque will show here."
                      />
                    ) : (
                      announcements.map((announcement) => (
                        <Card key={announcement.id} className="rounded-3xl border-border/50">
                          <CardContent className="p-5">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      "rounded-full px-3 py-1 capitalize",
                                      announcementPriorityTone[announcement.priority] ?? announcementPriorityTone.normal
                                    )}
                                  >
                                    {announcement.priority}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {formatDate(announcement.published_at)}
                                  </span>
                                </div>
                                <h3 className="text-lg font-black tracking-tight">{announcement.title}</h3>
                                <p className="text-sm leading-relaxed text-muted-foreground">{announcement.content}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </TabsContent>
                </Tabs>
              </TabsContent>

              <TabsContent value="community" className="mt-6">
                <Tabs defaultValue="posts" className="space-y-6">
                  <SubTabList>
                    <TabsTrigger value="posts">Posts</TabsTrigger>
                    <TabsTrigger value="donations">Donations</TabsTrigger>
                  </SubTabList>

                  <TabsContent value="posts" className="space-y-4">
                    {recentPosts.length === 0 ? (
                      <EmptyState
                        title="No community posts yet"
                        description="When the mosque posts updates to the community feed, they will show up here."
                      />
                    ) : (
                      recentPosts.map((post) => (
                        <Card key={post.id} className="rounded-3xl border-border/50">
                          <CardContent className="space-y-4 p-5">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-foreground">
                                  {post.author?.full_name || "Mosque community"}
                                </p>
                                <p className="text-xs text-muted-foreground">{formatDate(post.created_at)}</p>
                              </div>
                              <Badge variant="outline" className="rounded-full capitalize">
                                {post.category || post.post_type || "update"}
                              </Badge>
                            </div>
                            <p className="text-sm leading-relaxed text-muted-foreground">{post.content}</p>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </TabsContent>

                  <TabsContent value="donations" className="space-y-6">
                    <div className="grid gap-4 sm:grid-cols-3">
                      <Card className="rounded-3xl border-border/50">
                        <CardContent className="p-5 text-center">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/70">
                            Total Raised
                          </p>
                          <p className="mt-3 text-3xl font-black tracking-tight text-primary">
                            {formatCurrency(totalRaised)}
                          </p>
                        </CardContent>
                      </Card>
                      <Card className="rounded-3xl border-border/50">
                        <CardContent className="p-5 text-center">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/70">
                            Donations
                          </p>
                          <p className="mt-3 text-3xl font-black tracking-tight">
                            {donations.length}
                          </p>
                        </CardContent>
                      </Card>
                      <Card className="rounded-3xl border-border/50">
                        <CardContent className="p-5 text-center">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/70">
                            Latest Gift
                          </p>
                          <p className="mt-3 text-3xl font-black tracking-tight">
                            {donations[0] ? formatCurrency(donations[0].amount) : formatCurrency(0)}
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    {donations.length === 0 ? (
                      <EmptyState
                        title="No completed donations yet"
                        description="Donation activity will appear here once it is recorded by the mosque."
                      />
                    ) : (
                      donations.map((donation) => (
                        <Card key={donation.id} className="rounded-3xl border-border/50">
                          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="font-semibold text-foreground capitalize">
                                {formatLabel(donation.donation_type || "general")}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {formatDate(donation.created_at)}{donation.is_anonymous ? " • Anonymous donor" : ""}
                              </p>
                            </div>
                            <Badge className="w-fit rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary">
                              {formatCurrency(donation.amount)}
                            </Badge>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </TabsContent>
                </Tabs>
              </TabsContent>

              <TabsContent value="library" className="mt-6">
                <MosqueLibrary mosqueId={mosque.id} mosqueName={mosque.name} />
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-4">
            <Card className="overflow-hidden rounded-2xl border-border/40 shadow-sm lg:sticky lg:top-[88px]">
              <CardHeader className="border-b border-border/30 bg-gradient-to-br from-primary via-primary to-primary/90 px-5 py-4 text-primary-foreground">
                <CardTitle className="flex items-center gap-2.5 text-lg font-bold tracking-tight">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15">
                    <Clock className="h-4 w-4" />
                  </div>
                  Quick Prayer View
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 p-4">
                {prayerTimes ? (
                  <>
                    <QuickPrayerRow label="Fajr" value={prayerTimes.fajr_iqama || prayerTimes.fajr_adhan} />
                    <QuickPrayerRow label="Dhuhr" value={prayerTimes.dhuhr_iqama || prayerTimes.dhuhr_adhan} />
                    <QuickPrayerRow label="Asr" value={prayerTimes.asr_iqama || prayerTimes.asr_adhan} />
                    <QuickPrayerRow label="Maghrib" value={prayerTimes.maghrib_iqama || prayerTimes.maghrib_adhan} />
                    <QuickPrayerRow label="Isha" value={prayerTimes.isha_iqama || prayerTimes.isha_adhan} />
                    {prayerTimes.jummah_time && (
                      <>
                        <Separator className="my-2" />
                        <QuickPrayerRow label="Jummah" value={prayerTimes.jummah_iqama || prayerTimes.jummah_time} highlight />
                      </>
                    )}
                  </>
                ) : (
                  <div className="rounded-xl bg-muted/50 px-4 py-6 text-center">
                    <Clock className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">Prayer times have not been published yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="overflow-hidden rounded-2xl border-border/40">
              <CardHeader className="px-5 py-4">
                <CardTitle className="flex items-center gap-2.5 text-base font-bold">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                  </div>
                  Contact & Access
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 px-5 pb-5 pt-0">
                <ContactAction
                  icon={Phone}
                  label="Phone"
                  value={mosque.phone || "No phone listed"}
                  href={mosque.phone ? `tel:${mosque.phone}` : undefined}
                />
                <ContactAction
                  icon={Mail}
                  label="Email"
                  value={mosque.email || "No email listed"}
                  href={mosque.email ? `mailto:${mosque.email}` : undefined}
                />
                <ContactAction
                  icon={Globe}
                  label="Website"
                  value={mosque.website || "No website listed"}
                  href={mosque.website ? normalizeExternalUrl(mosque.website) : undefined}
                />
                <ContactAction
                  icon={Navigation}
                  label="Directions"
                  value="Open in Google Maps"
                  href={directionsUrl}
                  external
                />
              </CardContent>
            </Card>

            <Card className="overflow-hidden rounded-2xl border-border/40">
              <CardHeader className="px-5 py-4">
                <CardTitle className="flex items-center gap-2.5 text-base font-bold">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <Bell className="h-4 w-4 text-primary" />
                  </div>
                  Live Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 px-5 pb-5 pt-0">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Events, announcements, and updates are synced live from the management panels.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <MiniMetric label="Announcements" value={announcements.length} />
                  <MiniMetric label="Events" value={events.length} />
                  <MiniMetric label="Teams" value={managementTeams.filter((team) => team.is_active).length} />
                  <MiniMetric label="Posts" value={recentPosts.length} />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function PrimaryTab({ value, label }: { value: string; label: string }) {
  return (
    <TabsTrigger
      value={value}
      className="rounded-lg px-4 py-2 text-sm font-semibold transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground"
    >
      {label}
    </TabsTrigger>
  );
}

function SubTabList({ children }: { children: ReactNode }) {
  return (
    <TabsList className="flex h-auto flex-wrap justify-start gap-1.5 rounded-xl bg-muted/50 p-1">
      {children}
    </TabsList>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "primary" | "sky" | "emerald" | "amber";
}) {
  const config = {
    primary: {
      bg: "bg-primary/8",
      text: "text-primary",
      border: "border-primary/20",
    },
    sky: {
      bg: "bg-sky-500/8",
      text: "text-sky-600 dark:text-sky-400",
      border: "border-sky-500/20",
    },
    emerald: {
      bg: "bg-emerald-500/8",
      text: "text-emerald-600 dark:text-emerald-400",
      border: "border-emerald-500/20",
    },
    amber: {
      bg: "bg-amber-500/8",
      text: "text-amber-600 dark:text-amber-400",
      border: "border-amber-500/20",
    },
  };

  const { bg, text, border } = config[tone];

  return (
    <Card className={cn("overflow-hidden rounded-2xl border-border/40 transition-all hover:border-border/60 hover:shadow-md", border)}>
      <CardContent className="flex items-center justify-between p-4 sm:p-5">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold tracking-tight sm:text-3xl">{value}</p>
        </div>
        <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl", bg)}>
          <Users className={cn("h-5 w-5", text)} />
        </div>
      </CardContent>
    </Card>
  );
}

function PrayerTimeCard({
  label,
  adhan,
  iqama,
  className,
}: {
  label: string;
  adhan: string | null;
  iqama?: string | null;
  className?: string;
}) {
  return (
    <div className={cn("group relative overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br from-muted/30 to-transparent p-4 transition-all hover:border-primary/30 hover:shadow-sm", className)}>
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="relative flex items-center justify-between gap-4">
        <div className="space-y-0.5">
          <p className="text-sm font-semibold text-foreground">{label}</p>
          {iqama && <p className="text-xs text-muted-foreground">Iqama at {iqama}</p>}
        </div>
        <div className="text-right">
          <p className="text-lg font-bold tracking-tight text-primary">{adhan || "TBD"}</p>
        </div>
      </div>
    </div>
  );
}

function ManagementTeamCard({ team, mosqueId }: { team: PublicManagementTeam; mosqueId: string }) {
  return (
    <Card className="rounded-3xl border-border/50">
      <CardContent className="space-y-4 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/70">
              {formatLabel(team.team_type || "operations")}
            </p>
            <h3 className="mt-2 text-xl font-black tracking-tight">{team.name}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {team.description || "This team helps manage mosque operations and community delivery."}
            </p>
          </div>
          {team.is_active ? (
            <Badge className="rounded-full border-emerald-500/20 bg-emerald-500/10 text-emerald-600">
              Active
            </Badge>
          ) : null}
        </div>

        <div className="rounded-2xl border border-border/50 bg-muted/20 p-4">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/70">Team Lead</p>
          <p className="mt-2 font-semibold text-foreground">{team.lead?.full_name || "Lead will be assigned soon"}</p>
        </div>

        <div>
          <p className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/70">
            Members
          </p>
          {team.members.length > 0 ? (
            <div className="space-y-2">
              {team.members.slice(0, 4).map((member) => (
                <div key={member.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border/40 px-4 py-3">
                  <div>
                    <p className="font-medium text-foreground">{member.member_name}</p>
                    <p className="text-xs text-muted-foreground">{member.role_title}</p>
                  </div>
                  <Button variant="ghost" size="sm" asChild className="rounded-xl">
                    <Link href={`/mosques/${mosqueId}/management/${member.id}`}>View</Link>
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No team members published yet.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ContactAction({
  icon: Icon,
  label,
  value,
  href,
  external,
}: {
  icon: ElementType;
  label: string;
  value: string;
  href?: string;
  external?: boolean;
}) {
  const content = (
    <div className={cn(
      "group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all",
      href ? "cursor-pointer hover:bg-muted/50" : "opacity-60"
    )}>
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium text-foreground">{value}</p>
      </div>
      {href && <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/50 transition-colors group-hover:text-primary" />}
    </div>
  );

  if (!href) {
    return content;
  }

  return (
    <a href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined}>
      {content}
    </a>
  );
}

function QuickPrayerRow({ label, value, highlight }: { label: string; value: string | null; highlight?: boolean }) {
  return (
    <div className={cn(
      "flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors",
      highlight ? "bg-primary/10" : "bg-muted/30 hover:bg-muted/50"
    )}>
      <span className="text-sm font-medium text-foreground">{label}</span>
      <span className={cn(
        "text-sm font-bold tracking-tight",
        highlight ? "text-primary" : "text-foreground"
      )}>{value || "TBD"}</span>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-muted/40 px-3 py-2.5 text-center transition-colors hover:bg-muted/60">
      <p className="text-lg font-bold tracking-tight text-foreground">{value}</p>
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}

function InfoRow({
  label,
  value,
  href,
  external,
}: {
  label: string;
  value: string | null;
  href?: string;
  external?: boolean;
}) {
  return (
    <div className="rounded-xl bg-muted/30 px-4 py-3 transition-colors hover:bg-muted/50">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      {href && value ? (
        <a
          href={href}
          target={external ? "_blank" : undefined}
          rel={external ? "noreferrer" : undefined}
          className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          {value}
          {external && <ExternalLink className="h-3.5 w-3.5" />}
        </a>
      ) : (
        <p className="mt-1 text-sm font-medium text-foreground">{value || "Not available"}</p>
      )}
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border/50 bg-muted/20 px-6 py-12 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-muted/50">
        <Building2 className="h-6 w-6 text-muted-foreground/60" />
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function MosqueLibrary({ mosqueId, mosqueName }: { mosqueId: string; mosqueName: string }) {
  const { getBooksByMosque, getItemsByMosque, getPendingBooks, addBook } = useLibraryStore();
  const [activeTab, setActiveTab] = useState<"books" | "items">("books");
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newBook, setNewBook] = useState({
    title: "",
    author: "",
    isbn: "",
    category: "general_islamic" as BookCategory,
    language: "English",
    description: "",
    publisher: "",
    publishYear: new Date().getFullYear(),
    totalCopies: 1,
    location: "",
    condition: "good" as BookCondition,
    tags: "",
    isReferenceOnly: false,
  });

  const storedBooks = getBooksByMosque(mosqueId);
  const storedItems = getItemsByMosque(mosqueId);
  const pendingBooks = getPendingBooks(mosqueId);

  const books = storedBooks.length > 0 ? storedBooks : getStarterBooks(mosqueId);
  const items = storedItems.length > 0 ? storedItems : getStarterItems(mosqueId);
  const usingStarterCatalog = storedBooks.length === 0 && storedItems.length === 0;

  const filteredBooks = useMemo(() => {
    const query = deferredSearchQuery.trim().toLowerCase();
    return books.filter((book) => {
      const matchesSearch =
        !query ||
        book.title.toLowerCase().includes(query) ||
        book.author.toLowerCase().includes(query) ||
        book.location.toLowerCase().includes(query) ||
        book.tags?.some((tag) => tag.toLowerCase().includes(query));
      const matchesCategory = categoryFilter === "all" || book.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [books, categoryFilter, deferredSearchQuery]);

  const filteredItems = useMemo(() => {
    const query = deferredSearchQuery.trim().toLowerCase();
    return items.filter((item) => {
      return (
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query) ||
        item.location.toLowerCase().includes(query)
      );
    });
  }, [deferredSearchQuery, items]);

  const handleAddBook = () => {
    if (!newBook.title || !newBook.author || !newBook.location) {
      toast.error("Please fill in the required book fields");
      return;
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
      addedBy: "community-suggestion",
      addedByName: "Community Suggestion",
      status: "pending_approval",
      tags: newBook.tags ? newBook.tags.split(",").map((value) => value.trim()) : undefined,
      isReferencOnly: newBook.isReferenceOnly,
    });

    setIsAddDialogOpen(false);
    setNewBook({
      title: "",
      author: "",
      isbn: "",
      category: "general_islamic",
      language: "English",
      description: "",
      publisher: "",
      publishYear: new Date().getFullYear(),
      totalCopies: 1,
      location: "",
      condition: "good",
      tags: "",
      isReferenceOnly: false,
    });
    toast.success("Book suggestion submitted for review");
  };

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden rounded-2xl border-border/40">
        <CardHeader className="flex flex-col gap-4 border-b border-border/30 bg-muted/20 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2.5 text-lg font-bold">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Library className="h-4 w-4 text-primary" />
              </div>
              Mosque Library & Inventory
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Search the reading shelf, daily-use items, and new suggestions for {mosqueName}.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {usingStarterCatalog && (
              <Badge variant="outline" className="rounded-lg border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-amber-600 dark:text-amber-400">
                Starter catalog
              </Badge>
            )}
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="h-10 gap-2 rounded-xl px-4 shadow-sm transition-all hover:shadow-md">
                  <Plus className="h-4 w-4" />
                  Suggest Book
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] max-w-2xl overflow-hidden">
                <DialogHeader>
                  <DialogTitle>Suggest a New Book</DialogTitle>
                  <DialogDescription>
                    Submit a book request for this mosque library. It will appear after review.
                  </DialogDescription>
                </DialogHeader>

                <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
                  <div className="grid gap-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="suggest-book-title">Title</Label>
                      <Input
                        id="suggest-book-title"
                        value={newBook.title}
                        onChange={(event) => setNewBook((current) => ({ ...current, title: event.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="suggest-book-author">Author</Label>
                      <Input
                        id="suggest-book-author"
                        value={newBook.author}
                        onChange={(event) => setNewBook((current) => ({ ...current, author: event.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="suggest-book-category">Category</Label>
                      <Select
                        value={newBook.category}
                        onValueChange={(value) =>
                          setNewBook((current) => ({ ...current, category: value as BookCategory }))
                        }
                      >
                        <SelectTrigger id="suggest-book-category">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(bookCategoryLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="suggest-book-language">Language</Label>
                      <Input
                        id="suggest-book-language"
                        value={newBook.language}
                        onChange={(event) => setNewBook((current) => ({ ...current, language: event.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="suggest-book-publisher">Publisher</Label>
                      <Input
                        id="suggest-book-publisher"
                        value={newBook.publisher}
                        onChange={(event) => setNewBook((current) => ({ ...current, publisher: event.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="suggest-book-year">Publish Year</Label>
                      <Input
                        id="suggest-book-year"
                        type="number"
                        value={newBook.publishYear}
                        onChange={(event) =>
                          setNewBook((current) => ({
                            ...current,
                            publishYear: Number(event.target.value) || new Date().getFullYear(),
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="suggest-book-location">Shelf Location</Label>
                      <Input
                        id="suggest-book-location"
                        value={newBook.location}
                        onChange={(event) => setNewBook((current) => ({ ...current, location: event.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="suggest-book-description">Description</Label>
                    <Textarea
                      id="suggest-book-description"
                      rows={4}
                      value={newBook.description}
                      onChange={(event) =>
                        setNewBook((current) => ({ ...current, description: event.target.value }))
                      }
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="suggest-book-copies">Copies</Label>
                      <Input
                        id="suggest-book-copies"
                        type="number"
                        min={1}
                        value={newBook.totalCopies}
                        onChange={(event) =>
                          setNewBook((current) => ({
                            ...current,
                            totalCopies: Math.max(1, Number(event.target.value) || 1),
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="suggest-book-condition">Condition</Label>
                      <Select
                        value={newBook.condition}
                        onValueChange={(value) =>
                          setNewBook((current) => ({ ...current, condition: value as BookCondition }))
                        }
                      >
                        <SelectTrigger id="suggest-book-condition">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(conditionLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="suggest-book-tags">Tags</Label>
                      <Input
                        id="suggest-book-tags"
                        value={newBook.tags}
                        onChange={(event) => setNewBook((current) => ({ ...current, tags: event.target.value }))}
                      />
                    </div>
                  </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" className="rounded-xl" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button className="rounded-xl" onClick={handleAddBook}>Submit Suggestion</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <LibraryStatCard label="Books" value={books.length} icon={BookMarked} />
          <LibraryStatCard
            label="Available"
            value={books.reduce((sum, book) => sum + book.availableCopies, 0)}
            icon={Library}
          />
          <LibraryStatCard label="Items" value={items.length} icon={Package} />
          <LibraryStatCard label="Pending" value={pendingBooks.length} icon={MessageSquare} />
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-2xl border-border/40">
        <CardContent className="space-y-5 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="inline-flex gap-1 rounded-xl bg-muted/50 p-1">
              <Button
                variant={activeTab === "books" ? "default" : "ghost"}
                size="sm"
                className="rounded-lg px-4"
                onClick={() => setActiveTab("books")}
              >
                Books
              </Button>
              <Button
                variant={activeTab === "items" ? "default" : "ghost"}
                size="sm"
                className="rounded-lg px-4"
                onClick={() => setActiveTab("items")}
              >
                Inventory Items
              </Button>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative min-w-[260px] flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder={activeTab === "books" ? "Search books, authors, tags..." : "Search inventory..."}
                  className="rounded-xl border-border/60 pl-10 pr-10"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
              {activeTab === "books" ? (
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[190px] rounded-xl border-border/60">
                    <SelectValue placeholder="Filter category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {Object.entries(bookCategoryLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
            </div>
          </div>

          {activeTab === "books" ? (
            filteredBooks.length === 0 ? (
              <EmptyState
                title="No books match this search"
                description="Try another search term or clear the category filter."
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {filteredBooks.map((book) => (
                  <Card key={book.id} className="rounded-3xl border-border/50">
                    <CardContent className="space-y-4 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/70">
                            {bookCategoryLabels[book.category]}
                          </p>
                          <h3 className="mt-2 text-lg font-black tracking-tight">{book.title}</h3>
                          <p className="text-sm text-muted-foreground">{book.author}</p>
                        </div>
                        <Badge variant="secondary" className="rounded-full px-3 py-1">
                          {book.availableCopies}/{book.totalCopies}
                        </Badge>
                      </div>
                      <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                        {book.description || "Library description coming soon."}
                      </p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <LibraryMeta label="Language" value={book.language} />
                        <LibraryMeta label="Location" value={book.location} />
                        <LibraryMeta label="Condition" value={conditionLabels[book.condition]} />
                        <LibraryMeta label="Publisher" value={book.publisher || "Not listed"} />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )
          ) : filteredItems.length === 0 ? (
            <EmptyState
              title="No inventory items match this search"
              description="Try a different search term or browse the full inventory."
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredItems.map((item) => (
                <Card key={item.id} className="rounded-3xl border-border/50">
                  <CardContent className="space-y-4 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/70">
                          {itemTypeLabels[item.type]}
                        </p>
                        <h3 className="mt-2 text-lg font-black tracking-tight">{item.name}</h3>
                        <p className="text-sm text-muted-foreground">{item.category}</p>
                      </div>
                      <Badge variant="secondary" className="rounded-full px-3 py-1">
                        {item.availableQuantity}/{item.quantity}
                      </Badge>
                    </div>
                    <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                      {item.description || "Inventory description coming soon."}
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <LibraryMeta label="Location" value={item.location} />
                      <LibraryMeta label="Condition" value={conditionLabels[item.condition]} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function LibraryStatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: ElementType;
}) {
  return (
    <div className="group flex items-center gap-3 rounded-xl bg-muted/30 p-4 transition-colors hover:bg-muted/50">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div>
        <p className="text-xl font-bold tracking-tight">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function LibraryMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/30 px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function getStarterBooks(mosqueId: string): LibraryBook[] {
  return [
    {
      id: `starter-book-1-${mosqueId}`,
      mosqueId,
      title: "Riyadh us-Saliheen",
      author: "Imam An-Nawawi",
      category: "hadith",
      language: "Arabic / English",
      description: "A foundational collection of hadith and daily guidance used widely in mosque libraries.",
      publisher: "Darussalam",
      publishYear: 1999,
      totalCopies: 6,
      availableCopies: 4,
      location: "Main Shelf A-2",
      condition: "good",
      addedBy: "starter-catalog",
      addedByName: "Starter Catalog",
      status: "approved",
      tags: ["hadith", "daily guidance", "community favorite"],
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
    },
    {
      id: `starter-book-2-${mosqueId}`,
      mosqueId,
      title: "The Sealed Nectar",
      author: "Safiur Rahman Mubarakpuri",
      category: "seerah",
      language: "English",
      description: "Award-winning biography of the Prophet Muhammad, excellent for study circles and newcomers.",
      publisher: "Darussalam",
      publishYear: 2002,
      totalCopies: 4,
      availableCopies: 3,
      location: "Biography Shelf B-1",
      condition: "excellent",
      addedBy: "starter-catalog",
      addedByName: "Starter Catalog",
      status: "approved",
      tags: ["seerah", "biography", "study circle"],
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
    },
    {
      id: `starter-book-3-${mosqueId}`,
      mosqueId,
      title: "Fortress of the Muslim",
      author: "Said bin Ali bin Wahf Al-Qahtani",
      category: "spirituality",
      language: "Arabic / English",
      description: "Pocket-sized collection of daily adhkar and supplications frequently stocked in mosque foyers.",
      publisher: "Darussalam",
      publishYear: 1998,
      totalCopies: 12,
      availableCopies: 9,
      location: "Welcome Desk",
      condition: "excellent",
      addedBy: "starter-catalog",
      addedByName: "Starter Catalog",
      status: "approved",
      tags: ["dua", "adhkar", "daily worship"],
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
    },
  ];
}

function getStarterItems(mosqueId: string): LibraryItem[] {
  return [
    {
      id: `starter-item-1-${mosqueId}`,
      mosqueId,
      name: "Prayer Mats",
      type: "prayer_mat",
      category: "Prayer Essentials",
      description: "Visitor prayer mats kept available near the main prayer hall entrance.",
      quantity: 30,
      availableQuantity: 26,
      location: "Prayer Hall Entrance",
      condition: "good",
      addedBy: "starter-catalog",
      addedByName: "Starter Catalog",
      status: "approved",
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
    },
    {
      id: `starter-item-2-${mosqueId}`,
      mosqueId,
      name: "Quran Stands",
      type: "quran_stand",
      category: "Reading Accessories",
      description: "Wooden rehal stands for classes, recitation, and personal study.",
      quantity: 18,
      availableQuantity: 15,
      location: "Library Annex",
      condition: "excellent",
      addedBy: "starter-catalog",
      addedByName: "Starter Catalog",
      status: "approved",
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
    },
  ];
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatLabel(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeExternalUrl(url: string) {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
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
  );
}
