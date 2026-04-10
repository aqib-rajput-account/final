'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Mic, Plus, Radio, Clock, Sparkles, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { SpaceCard } from '@/components/audio-conferences/space-card'
import { CreateSpaceModal } from '@/components/audio-conferences/create-space-modal'
import { useSpaceRooms } from '@/lib/hooks/use-space-rooms'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'

export default function AudioConferencesPage() {
  const { profile, userId, isSignedIn } = useAuth()
  const { rooms, liveRooms, scheduledRooms, isLoading } = useSpaceRooms()
  const [createOpen, setCreateOpen] = useState(false)
  const [search, setSearch] = useState('')

  const filterRooms = (list: typeof rooms) => {
    if (!search.trim()) return list
    const q = search.toLowerCase()
    return list.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.topic?.toLowerCase().includes(q) ||
        r.host_name?.toLowerCase().includes(q)
    )
  }

  const filteredLive = filterRooms(liveRooms)
  const filteredScheduled = filterRooms(scheduledRooms)

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Page header */}
      <div className="mb-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <Link href="/feed" className="hover:text-foreground transition-colors">Feed</Link>
          <span>/</span>
          <span className="text-foreground font-medium">Spaces</span>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/20">
                <Mic className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Spaces</h1>
                <p className="text-sm text-muted-foreground">Live audio rooms for the community</p>
              </div>
            </div>
          </div>

          {isSignedIn && (
            <Button
              id="start-space-btn"
              onClick={() => setCreateOpen(true)}
              className="rounded-full font-bold shadow-lg shadow-primary/20 gap-2 shrink-0"
            >
              <Mic className="h-4 w-4" />
              Start a Space
            </Button>
          )}
        </div>

        {/* Search */}
        <div className="relative mt-5">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="spaces-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search spaces by title, topic or host..."
            className="pl-10 rounded-full"
          />
        </div>
      </div>

      {/* Live now banner (if any) */}
      {!isLoading && liveRooms.length > 0 && (
        <div className="mb-6 rounded-2xl bg-gradient-to-r from-rose-500/10 via-orange-500/5 to-amber-500/10 border border-rose-500/20 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
              </span>
              <span className="text-sm font-bold text-rose-700 dark:text-rose-400">
                {liveRooms.length} live
              </span>
            </div>
            <span className="text-sm text-muted-foreground">
              {liveRooms.length === 1
                ? 'Space is happening right now'
                : 'Spaces are happening right now'}
            </span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="live" className="space-y-6">
        <TabsList className="rounded-full p-1 h-auto">
          <TabsTrigger value="live" className="rounded-full gap-2 px-5">
            <Radio className="h-3.5 w-3.5" />
            Live Now
            {liveRooms.length > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 text-[11px] font-bold text-white px-1">
                {liveRooms.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="scheduled" className="rounded-full gap-2 px-5">
            <Clock className="h-3.5 w-3.5" />
            Scheduled
            {scheduledRooms.length > 0 && (
              <span className="ml-1 text-xs text-muted-foreground">({scheduledRooms.length})</span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Live rooms */}
        <TabsContent value="live" className="mt-0">
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="rounded-2xl border border-border/60 p-5 space-y-3">
                  <Skeleton className="h-5 w-4/5" />
                  <Skeleton className="h-4 w-3/5" />
                  <div className="flex items-center gap-2 pt-2">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredLive.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/70 px-6 py-20 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
                <Mic className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <h2 className="text-lg font-semibold mb-1">No live spaces yet</h2>
              <p className="text-sm text-muted-foreground max-w-xs mb-6">
                {search
                  ? 'No spaces match your search.'
                  : 'Be the first to start a conversation. Share knowledge, ask questions, or just chat.'}
              </p>
              {isSignedIn && !search && (
                <Button
                  onClick={() => setCreateOpen(true)}
                  className="rounded-full font-bold gap-2 shadow-md shadow-primary/20"
                >
                  <Mic className="h-4 w-4" />
                  Start the first Space
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {filteredLive.map((room) => (
                <SpaceCard key={room.id} room={room} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Scheduled rooms */}
        <TabsContent value="scheduled" className="mt-0">
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {[1, 2].map((i) => (
                <div key={i} className="rounded-2xl border border-border/60 p-5 space-y-3">
                  <Skeleton className="h-5 w-4/5" />
                  <Skeleton className="h-4 w-3/5" />
                </div>
              ))}
            </div>
          ) : filteredScheduled.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/70 px-6 py-16 text-center">
              <Clock className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <p className="text-base font-semibold mb-1">No scheduled spaces</p>
              <p className="text-sm text-muted-foreground">
                {search ? 'No scheduled spaces match your search.' : 'Plan a future Space to let the community know in advance.'}
              </p>
              {isSignedIn && !search && (
                <Button
                  variant="outline"
                  onClick={() => setCreateOpen(true)}
                  className="mt-5 rounded-full gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Schedule a Space
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {filteredScheduled.map((room) => (
                <SpaceCard key={room.id} room={room} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create modal */}
      <CreateSpaceModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        hostName={profile?.full_name ?? null}
        hostAvatarUrl={profile?.avatar_url ?? null}
      />
    </div>
  )
}
