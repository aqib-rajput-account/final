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
    <div>
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-background">
        <div className="absolute inset-0 opacity-5">
          <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="public-mosque-pattern" x="0" y="0" width="56" height="56" patternUnits="userSpaceOnUse">
                <path d="M28 0L56 28L28 56L0 28Z" fill="none" stroke="currentColor" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#public-mosque-pattern)" />
          </svg>
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-8 lg:px-8">
          <Link
            href="/mosques"
            className="group mb-8 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/70 transition-colors hover:text-primary"
          >
            <div className="rounded-lg bg-muted p-1 transition-colors group-hover:bg-primary/10">
              <ChevronLeft className="h-4 w-4" />
            </div>
            Back to Directory
          </Link>

          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-[2rem] bg-primary text-primary-foreground shadow-2xl shadow-primary/20">
                <MosqueIcon className="h-12 w-12" />
              </div>
              <div className="space-y-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
                    {mosque.name}
                  </h1>
                  {mosque.is_verified ? (
                    <Badge className="w-fit gap-1.5 rounded-full border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-600">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Verified
                    </Badge>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-sm font-medium text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary/70" />
                    {mosque.address}, {mosque.city}, {mosque.state}
                  </span>
                  {mosque.established_year ? (
                    <span className="rounded-xl border border-border/50 bg-background/60 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-foreground/80">
                      Est. {mosque.established_year}
                    </span>
                  ) : null}
                  {mosque.capacity ? (
                    <span className="rounded-xl border border-border/50 bg-background/60 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-foreground/80">
                      {mosque.capacity.toLocaleString()} Capacity
                    </span>
                  ) : null}
                </div>

                <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                  {mosque.description || "This mosque profile is managed live by the operations team and community panel."}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                onClick={openDirections}
                size="lg"
                className="h-12 gap-3 rounded-2xl px-6 shadow-xl shadow-primary/20"
              >
                <Navigation className="h-5 w-5" />
                Get Directions
              </Button>
              <Button
                onClick={handleShare}
                variant="outline"
                size="lg"
                className="h-12 gap-3 rounded-2xl px-6"
              >
                <Share2 className="h-5 w-5" />
                Share
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
        <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Active Imams" value={stats.activeImams} tone="primary" />
          <StatCard label="Live Programs" value={stats.livePrograms} tone="sky" />
          <StatCard label="Community Posts" value={stats.communityPosts} tone="emerald" />
          <StatCard label="Completed Donations" value={stats.completedDonations} tone="amber" />
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_360px]">
          <div className="space-y-6">
            <Tabs defaultValue="overview" className="w-full">
              <div className="sticky top-[64px] z-20 -mx-4 overflow-x-auto border-b border-border/50 bg-background/90 px-4 pb-2 pt-1 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border sm:bg-muted/30 sm:p-2 lg:static">
                <TabsList className="inline-flex h-auto min-w-full gap-1 bg-transparent p-0 sm:min-w-0">
                  <PrimaryTab value="overview" label="Overview" />
                  <PrimaryTab value="people" label="People" />
                  <PrimaryTab value="programs" label="Programs" />
                  <PrimaryTab value="community" label="Community" />
                  <PrimaryTab value="library" label="Library" />
                </TabsList>
              </div>

              <TabsContent value="overview" className="mt-6">
                <Tabs defaultValue="about" className="space-y-6">
                  <SubTabList>
                    <TabsTrigger value="about">About</TabsTrigger>
                    <TabsTrigger value="prayer">Prayer Times</TabsTrigger>
                    <TabsTrigger value="visit">Visit & Map</TabsTrigger>
                  </SubTabList>

                  <TabsContent value="about" className="space-y-6">
                    <Card className="rounded-3xl border-border/50">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg font-black">
                          <Building2 className="h-5 w-5 text-primary" />
                          About This Mosque
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-5">
                        <p className="leading-relaxed text-muted-foreground">
                          {mosque.description || "A welcoming mosque serving the community with daily worship, programming, and pastoral care."}
                        </p>

                        <div>
                          <p className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/70">
                            Facilities
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {(mosque.facilities ?? []).length > 0 ? (
                              mosque.facilities?.map((facility) => (
                                <Badge
                                  key={facility}
                                  variant="secondary"
                                  className="rounded-xl border border-border/50 bg-muted/40 px-3 py-2 text-xs font-bold"
                                >
                                  {facility}
                                </Badge>
                              ))
                            ) : (
                              <p className="text-sm text-muted-foreground">Facilities will appear here once they are added.</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="prayer" className="space-y-6">
                    <Card className="rounded-3xl border-border/50">
                      <CardHeader className="flex flex-row items-start justify-between gap-4">
                        <div>
                          <CardTitle className="flex items-center gap-2 text-lg font-black">
                            <Clock className="h-5 w-5 text-primary" />
                            Prayer Schedule
                          </CardTitle>
                          <p className="mt-2 text-sm text-muted-foreground">
                            {prayerDateLabel
                              ? prayerDateIsToday
                                ? `Today's posted timetable for ${prayerDateLabel}`
                                : `Latest available timetable for ${prayerDateLabel}`
                              : "Prayer times have not been published yet."}
                          </p>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <Link href="/prayer-times">Full Prayer Times</Link>
                        </Button>
                      </CardHeader>
                      <CardContent>
                        {prayerTimes ? (
                          <div className="grid gap-3 sm:grid-cols-2">
                            <PrayerTimeCard label="Fajr" adhan={prayerTimes.fajr_adhan} iqama={prayerTimes.fajr_iqama} />
                            <PrayerTimeCard label="Sunrise" adhan={prayerTimes.sunrise} />
                            <PrayerTimeCard label="Dhuhr" adhan={prayerTimes.dhuhr_adhan} iqama={prayerTimes.dhuhr_iqama} />
                            <PrayerTimeCard label="Asr" adhan={prayerTimes.asr_adhan} iqama={prayerTimes.asr_iqama} />
                            <PrayerTimeCard label="Maghrib" adhan={prayerTimes.maghrib_adhan} iqama={prayerTimes.maghrib_iqama} />
                            <PrayerTimeCard label="Isha" adhan={prayerTimes.isha_adhan} iqama={prayerTimes.isha_iqama} />
                            {prayerTimes.jummah_time ? (
                              <PrayerTimeCard
                                label="Jummah"
                                adhan={prayerTimes.jummah_time}
                                iqama={prayerTimes.jummah_iqama}
                                className="sm:col-span-2"
                              />
                            ) : null}
                          </div>
                        ) : (
                          <EmptyState
                            title="No prayer schedule published"
                            description="The mosque team has not posted prayer times yet."
                          />
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="visit" className="space-y-6">
                    <Card className="overflow-hidden rounded-3xl border-border/50">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg font-black">
                          <MapPin className="h-5 w-5 text-primary" />
                          Visit & Directions
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="overflow-hidden rounded-2xl border border-border/50">
                          <iframe
                            title={`Map for ${mosque.name}`}
                            src={mapEmbedUrl}
                            className="h-72 w-full"
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                          />
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
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

          <div className="space-y-6">
            <Card className="rounded-[2rem] border-border/50 shadow-sm lg:sticky lg:top-[88px]">
              <CardHeader className="border-b border-border/40 bg-gradient-to-br from-primary to-primary/90 text-primary-foreground">
                <CardTitle className="flex items-center gap-2 text-xl font-black tracking-tight">
                  <Clock className="h-5 w-5" />
                  Quick Prayer View
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-4">
                {prayerTimes ? (
                  <>
                    <QuickPrayerRow label="Fajr" value={prayerTimes.fajr_iqama || prayerTimes.fajr_adhan} />
                    <QuickPrayerRow label="Dhuhr" value={prayerTimes.dhuhr_iqama || prayerTimes.dhuhr_adhan} />
                    <QuickPrayerRow label="Asr" value={prayerTimes.asr_iqama || prayerTimes.asr_adhan} />
                    <QuickPrayerRow label="Maghrib" value={prayerTimes.maghrib_iqama || prayerTimes.maghrib_adhan} />
                    <QuickPrayerRow label="Isha" value={prayerTimes.isha_iqama || prayerTimes.isha_adhan} />
                    {prayerTimes.jummah_time ? (
                      <>
                        <Separator />
                        <QuickPrayerRow label="Jummah" value={prayerTimes.jummah_iqama || prayerTimes.jummah_time} />
                      </>
                    ) : null}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Prayer times have not been published yet.</p>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-black">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  Contact & Access
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
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

            <Card className="rounded-3xl border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-black">
                  <Bell className="h-5 w-5 text-primary" />
                  Live With Management Panels
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Events, announcements, imam assignments, and mosque profile updates shown here are pulled
                  from the same live records managed in the Admin, Shura, and Imam panels.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <MiniMetric label="Announcements" value={announcements.length} />
                  <MiniMetric label="Upcoming Events" value={events.length} />
                  <MiniMetric label="Active Teams" value={managementTeams.filter((team) => team.is_active).length} />
                  <MiniMetric label="Recent Posts" value={recentPosts.length} />
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
      className="rounded-xl px-4 py-2.5 font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm"
    >
      {label}
    </TabsTrigger>
  );
}

function SubTabList({ children }: { children: ReactNode }) {
  return (
    <TabsList className="flex h-auto flex-wrap justify-start gap-2 rounded-2xl bg-muted/40 p-1.5">
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
  const toneClass =
    tone === "sky"
      ? "bg-sky-500/10 text-sky-600"
      : tone === "emerald"
        ? "bg-emerald-500/10 text-emerald-600"
        : tone === "amber"
          ? "bg-amber-500/10 text-amber-600"
          : "bg-primary/10 text-primary";

  return (
    <Card className="rounded-3xl border-border/50">
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/70">{label}</p>
          <p className="mt-2 text-3xl font-black tracking-tight">{value}</p>
        </div>
        <div className={cn("rounded-2xl p-3", toneClass)}>
          <Users className="h-5 w-5" />
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
    <div className={cn("rounded-2xl border border-border/50 bg-muted/20 p-4", className)}>
      <div className="flex items-center justify-between gap-4">
        <p className="font-bold text-foreground">{label}</p>
        <div className="text-right">
          <p className="font-black tracking-tight text-primary">{adhan || "TBD"}</p>
          {iqama ? <p className="text-xs text-muted-foreground">Iqama: {iqama}</p> : null}
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
    <div className="flex items-center gap-4 rounded-2xl border border-transparent p-4 transition-colors hover:border-border/40 hover:bg-muted/40">
      <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/70">{label}</p>
        <p className="mt-1 truncate font-medium text-foreground">{value}</p>
      </div>
      {href ? <ExternalLink className="h-4 w-4 text-muted-foreground" /> : null}
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

function QuickPrayerRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-muted/20 px-3 py-2">
      <span className="font-medium text-foreground">{label}</span>
      <span className="font-black tracking-tight text-primary">{value || "TBD"}</span>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border/40 bg-muted/20 p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/70">{label}</p>
      <p className="mt-2 text-xl font-black tracking-tight text-foreground">{value}</p>
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
    <div className="rounded-2xl border border-border/50 bg-muted/20 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/70">{label}</p>
      {href && value ? (
        <a
          href={href}
          target={external ? "_blank" : undefined}
          rel={external ? "noreferrer" : undefined}
          className="mt-2 inline-flex items-center gap-2 font-medium text-primary hover:underline"
        >
          {value}
          {external ? <ExternalLink className="h-4 w-4" /> : null}
        </a>
      ) : (
        <p className="mt-2 font-medium text-foreground">{value || "Not available"}</p>
      )}
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <Card className="rounded-3xl border-dashed border-border/60">
      <CardContent className="py-14 text-center">
        <Building2 className="mx-auto h-12 w-12 text-muted-foreground/40" />
        <h3 className="mt-4 text-lg font-semibold">{title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
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
    <div className="space-y-6">
      <Card className="rounded-3xl border-border/50">
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <CardTitle className="flex items-center gap-2 text-lg font-black">
              <Library className="h-5 w-5 text-primary" />
              Mosque Library & Inventory
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Search the reading shelf, daily-use items, and new suggestions for {mosqueName}.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {usingStarterCatalog ? (
              <Badge variant="outline" className="rounded-full px-3 py-1">
                Starter catalog
              </Badge>
            ) : null}
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="rounded-xl gap-2">
                  <Plus className="h-4 w-4" />
                  Suggest Book
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-xl">Suggest a New Book</DialogTitle>
                  <DialogDescription>
                    Submit a book request for this mosque library. It will appear after review.
                  </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-5 py-4">
                  {/* Basic Info Section */}
                  <div className="flex flex-col gap-2.5">
                    <div className="grid gap-2.5 sm:grid-cols-2 w-full">
                      <div className="flex flex-col gap-2.5">
                        <Label htmlFor="suggest-book-title" className="text-xs font-semibold">Title</Label>
                        <Input
                          id="suggest-book-title"
                          placeholder="Book title"
                          value={newBook.title}
                          onChange={(event) => setNewBook((current) => ({ ...current, title: event.target.value }))}
                        />
                      </div>
                      <div className="flex flex-col gap-2.5">
                        <Label htmlFor="suggest-book-author" className="text-xs font-semibold">Author</Label>
                        <Input
                          id="suggest-book-author"
                          placeholder="Author name"
                          value={newBook.author}
                          onChange={(event) => setNewBook((current) => ({ ...current, author: event.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="grid gap-2.5 sm:grid-cols-2 w-full">
                      <div className="flex flex-col gap-2.5">
                        <Label htmlFor="suggest-book-category" className="text-xs font-semibold">Category</Label>
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
                      <div className="flex flex-col gap-2.5">
                        <Label htmlFor="suggest-book-language" className="text-xs font-semibold">Language</Label>
                        <Input
                          id="suggest-book-language"
                          placeholder="e.g., English, Arabic"
                          value={newBook.language}
                          onChange={(event) => setNewBook((current) => ({ ...current, language: event.target.value }))}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Publisher Section */}
                  <div className="flex flex-col gap-2.5 pt-2 border-t border-border/30">
                    <div className="grid gap-2.5 sm:grid-cols-2 w-full">
                      <div className="flex flex-col gap-2.5">
                        <Label htmlFor="suggest-book-publisher" className="text-xs font-semibold">Publisher</Label>
                        <Input
                          id="suggest-book-publisher"
                          placeholder="Publisher name"
                          value={newBook.publisher}
                          onChange={(event) => setNewBook((current) => ({ ...current, publisher: event.target.value }))}
                        />
                      </div>
                      <div className="flex flex-col gap-2.5">
                        <Label htmlFor="suggest-book-year" className="text-xs font-semibold">Publish Year</Label>
                        <Input
                          id="suggest-book-year"
                          type="number"
                          placeholder="YYYY"
                          value={newBook.publishYear}
                          onChange={(event) =>
                            setNewBook((current) => ({
                              ...current,
                              publishYear: Number(event.target.value) || new Date().getFullYear(),
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* Inventory Section */}
                  <div className="flex flex-col gap-2.5 pt-2 border-t border-border/30">
                    <div className="grid gap-2.5 sm:grid-cols-3 w-full">
                      <div className="flex flex-col gap-2.5">
                        <Label htmlFor="suggest-book-copies" className="text-xs font-semibold">Copies</Label>
                        <Input
                          id="suggest-book-copies"
                          type="number"
                          min={1}
                          placeholder="1"
                          value={newBook.totalCopies}
                          onChange={(event) =>
                            setNewBook((current) => ({
                              ...current,
                              totalCopies: Math.max(1, Number(event.target.value) || 1),
                            }))
                          }
                        />
                      </div>
                      <div className="flex flex-col gap-2.5">
                        <Label htmlFor="suggest-book-condition" className="text-xs font-semibold">Condition</Label>
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
                      <div className="flex flex-col gap-2.5">
                        <Label htmlFor="suggest-book-location" className="text-xs font-semibold">Location</Label>
                        <Input
                          id="suggest-book-location"
                          placeholder="Shelf location"
                          value={newBook.location}
                          onChange={(event) => setNewBook((current) => ({ ...current, location: event.target.value }))}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Details Section */}
                  <div className="flex flex-col gap-2.5 pt-2 border-t border-border/30">
                    <div className="flex flex-col gap-2.5">
                      <Label htmlFor="suggest-book-description" className="text-xs font-semibold">Description</Label>
                      <Textarea
                        id="suggest-book-description"
                        placeholder="Add any additional notes about this book..."
                        value={newBook.description}
                        onChange={(event) =>
                          setNewBook((current) => ({ ...current, description: event.target.value }))
                        }
                      />
                    </div>

                    <div className="flex flex-col gap-2.5">
                      <Label htmlFor="suggest-book-tags" className="text-xs font-semibold">Tags</Label>
                      <Input
                        id="suggest-book-tags"
                        placeholder="Separate with commas (e.g., Islamic, Education, Children)"
                        value={newBook.tags}
                        onChange={(event) => setNewBook((current) => ({ ...current, tags: event.target.value }))}
                      />
                    </div>
                  </div>
                </div>

                <DialogFooter className="flex gap-2 pt-2 border-t border-border/30">
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddBook}>Submit Suggestion</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-4">
          <LibraryStatCard label="Books" value={books.length} icon={BookMarked} />
          <LibraryStatCard
            label="Available Copies"
            value={books.reduce((sum, book) => sum + book.availableCopies, 0)}
            icon={Library}
          />
          <LibraryStatCard label="Other Items" value={items.length} icon={Package} />
          <LibraryStatCard label="Pending Review" value={pendingBooks.length} icon={MessageSquare} />
        </CardContent>
      </Card>

      <Card className="rounded-3xl border-border/50">
        <CardContent className="space-y-5 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              <Button
                variant={activeTab === "books" ? "default" : "outline"}
                size="sm"
                className="rounded-xl"
                onClick={() => setActiveTab("books")}
              >
                Books
              </Button>
              <Button
                variant={activeTab === "items" ? "default" : "outline"}
                size="sm"
                className="rounded-xl"
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
    <div className="rounded-2xl border border-border/40 bg-muted/20 p-4 text-center">
      <Icon className="mx-auto mb-2 h-5 w-5 text-primary" />
      <p className="text-2xl font-black tracking-tight">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function LibraryMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/40 bg-muted/20 p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/70">{label}</p>
      <p className="mt-2 text-sm font-medium text-foreground">{value}</p>
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
