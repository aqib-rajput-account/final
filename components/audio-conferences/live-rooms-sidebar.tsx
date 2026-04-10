'use client'

import Link from 'next/link'
import { Mic, ChevronRight, Radio } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useSpaceRooms } from '@/lib/hooks/use-space-rooms'
import { cn } from '@/lib/utils'

function getInitials(name: string | null | undefined) {
  if (!name) return 'U'
  return name.split(' ').filter(Boolean).map((s) => s[0]).join('').slice(0, 2).toUpperCase()
}

export function LiveRoomsSidebar() {
  const { liveRooms, isLoading } = useSpaceRooms()
  const displayedRooms = liveRooms.slice(0, 3)

  return (
    <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className={cn(
              'absolute inline-flex h-full w-full rounded-full opacity-75',
              liveRooms.length > 0 ? 'animate-ping bg-rose-500' : 'bg-muted-foreground'
            )} />
            <span className={cn(
              'relative inline-flex rounded-full h-2.5 w-2.5',
              liveRooms.length > 0 ? 'bg-rose-500' : 'bg-muted-foreground'
            )} />
          </span>
          <p className="text-sm font-semibold">Live Spaces</p>
        </div>
        <Link
          href="/feed/audio-conferences"
          className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
        >
          View all
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="p-3 space-y-2">
        {isLoading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-2">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-4/5" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))
        ) : displayedRooms.length === 0 ? (
          <div className="py-5 text-center">
            <Mic className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
            <p className="text-xs text-muted-foreground font-medium">No live spaces</p>
            <Link href="/feed/audio-conferences">
              <Button variant="ghost" size="sm" className="mt-2 rounded-full text-xs h-7">
                Start one
              </Button>
            </Link>
          </div>
        ) : (
          displayedRooms.map((room) => (
            <Link
              key={room.id}
              href={`/feed/audio-conferences/${room.id}`}
              className="flex items-center gap-3 rounded-xl p-2 hover:bg-muted/40 transition-colors group"
            >
              <div className="relative shrink-0">
                <Avatar className="h-9 w-9 border border-border/60">
                  <AvatarImage src={room.host_avatar_url || undefined} alt={room.host_name || 'Host'} />
                  <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                    {getInitials(room.host_name)}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-rose-500 border-2 border-background">
                  {room.is_recorded && <Radio className="h-1.5 w-1.5 text-white" />}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold truncate group-hover:text-primary transition-colors">
                  {room.title}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {room.listener_count > 0 ? `${room.listener_count} listening` : 'Join now'}
                  {room.host_name ? ` · ${room.host_name}` : ''}
                </p>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Footer CTA */}
      <div className="px-3 pb-3">
        <Button asChild variant="outline" size="sm" className="w-full rounded-xl text-xs gap-2 border-primary/30 text-primary hover:bg-primary/5">
          <Link href="/feed/audio-conferences">
            <Mic className="h-3.5 w-3.5" />
            Start a Space
          </Link>
        </Button>
      </div>
    </div>
  )
}
