'use client'

import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { Mic, Users, Radio, Clock, BookOpen } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { AudioRoom } from '@/lib/hooks/use-space-rooms'

const TOPIC_CONFIG: Record<string, { label: string; color: string }> = {
  quran: { label: '📖 Quran', color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20' },
  fiqh: { label: '⚖️ Fiqh', color: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20' },
  community: { label: '🕌 Community', color: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20' },
  qa: { label: '💬 Q&A', color: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20' },
  general: { label: '🎙 General', color: 'bg-muted text-muted-foreground' },
  hadith: { label: '📜 Hadith', color: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20' },
  seerah: { label: '⭐ Seerah', color: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20' },
}

function getInitials(name: string | null | undefined) {
  if (!name) return 'U'
  return name.split(' ').filter(Boolean).map((s) => s[0]).join('').slice(0, 2).toUpperCase()
}

interface SpaceCardProps {
  room: AudioRoom
  className?: string
}

export function SpaceCard({ room, className }: SpaceCardProps) {
  const isLive = room.status === 'live'
  const topicConfig = room.topic ? (TOPIC_CONFIG[room.topic] ?? TOPIC_CONFIG.general) : null

  return (
    <Card
      className={cn(
        'group relative overflow-hidden border-border/60 transition-all duration-200',
        isLive
          ? 'shadow-md hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-0.5 border-primary/20'
          : 'hover:border-border hover:shadow-sm',
        className
      )}
    >
      {/* Live gradient top bar */}
      {isLive && (
        <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-emerald-500 via-primary to-emerald-500" />
      )}

      <CardContent className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            {isLive ? (
              <div className="flex items-center gap-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 px-2.5 py-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                </span>
                <span className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wide">Live</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 rounded-full bg-muted border border-border/60 px-2.5 py-1">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Scheduled</span>
              </div>
            )}

            {topicConfig && (
              <Badge
                variant="outline"
                className={cn('rounded-full text-xs border', topicConfig.color)}
              >
                {topicConfig.label}
              </Badge>
            )}

            {room.is_recorded && (
              <Badge variant="outline" className="rounded-full text-xs border-red-500/20 text-red-600 dark:text-red-400 bg-red-500/10">
                <Radio className="mr-1 h-2.5 w-2.5" /> Recorded
              </Badge>
            )}
          </div>
        </div>

        {/* Title */}
        <h3 className="font-semibold text-base leading-tight mb-3 line-clamp-2 group-hover:text-primary transition-colors">
          {room.title}
        </h3>

        {/* Host info */}
        <div className="flex items-center gap-2 mb-4">
          <Avatar className="h-7 w-7 border-2 border-background ring-1 ring-border/60">
            <AvatarImage src={room.host_avatar_url || undefined} alt={room.host_name || 'Host'} />
            <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
              {getInitials(room.host_name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{room.host_name || 'Community member'}</p>
            <p className="text-xs text-muted-foreground">
              {isLive && room.started_at
                ? `Started ${formatDistanceToNow(new Date(room.started_at), { addSuffix: true })}`
                : room.scheduled_at
                ? `Starts ${formatDistanceToNow(new Date(room.scheduled_at), { addSuffix: true })}`
                : 'Host'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span className="text-sm font-medium">
              {room.listener_count > 0 ? room.listener_count : '—'}
            </span>
            <span className="text-xs">listening</span>
          </div>

          <Button
            asChild
            size="sm"
            variant={isLive ? 'default' : 'outline'}
            className={cn(
              'rounded-full font-semibold',
              isLive && 'shadow-sm shadow-primary/20 bg-primary hover:bg-primary/90'
            )}
          >
            <Link href={`/feed/audio-conferences/${room.id}`}>
              {isLive ? (
                <>
                  <Mic className="mr-1.5 h-3.5 w-3.5" />
                  Join Space
                </>
              ) : (
                <>
                  <BookOpen className="mr-1.5 h-3.5 w-3.5" />
                  View
                </>
              )}
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
