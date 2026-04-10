'use client'

import { Mic, MicOff, Volume2 } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

function getInitials(name: string | null | undefined) {
  if (!name) return 'U'
  return name.split(' ').filter(Boolean).map((s) => s[0]).join('').slice(0, 2).toUpperCase()
}

interface ParticipantTileProps {
  userId: string
  name: string | null
  avatarUrl?: string | null
  role: 'host' | 'speaker' | 'listener'
  isMuted?: boolean
  isSpeaking?: boolean
  audioLevel?: number
  isLocalParticipant?: boolean
  onMute?: () => void
}

export function ParticipantTile({
  name,
  avatarUrl,
  role,
  isMuted = false,
  isSpeaking = false,
  audioLevel = 0,
  isLocalParticipant = false,
  onMute,
}: ParticipantTileProps) {
  const roleColor = {
    host: 'bg-primary/10 text-primary border-primary/20',
    speaker: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
    listener: 'bg-muted text-muted-foreground border-border',
  }[role]

  const roleLabel = {
    host: 'Host',
    speaker: 'Speaker',
    listener: 'Listener',
  }[role]

  return (
    <div
      className={cn(
        'group flex flex-col items-center gap-2.5 p-3 rounded-2xl transition-all duration-200 relative',
        isSpeaking ? 'bg-primary/5' : 'bg-transparent'
      )}
    >
      {/* Avatar with speaking ring */}
      <div className="relative">
        {/* Outer speaking ring (Dynamic via framer-motion) */}
        {isSpeaking && (
          <motion.div
            className="absolute -inset-1.5 rounded-full border border-primary/40 bg-primary/20 pointer-events-none"
            initial={{ scale: 1, opacity: 0.1 }}
            animate={{ 
              scale: 1 + (audioLevel * 0.4), 
              opacity: Math.max(0.2, audioLevel) 
            }}
            transition={{ type: 'spring', damping: 15, stiffness: 200 }}
          />
        )}

        <Avatar
          className={cn(
            'h-16 w-16 border-2 transition-all duration-300',
            isSpeaking ? 'border-primary shadow-lg shadow-primary/20' : 'border-border/60',
            isLocalParticipant && 'ring-2 ring-offset-1 ring-offset-background ring-blue-500/50'
          )}
        >
          <AvatarImage src={avatarUrl || undefined} alt={name || 'Participant'} />
          <AvatarFallback
            className={cn(
              'text-sm font-bold',
              isSpeaking ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
            )}
          >
            {getInitials(name)}
          </AvatarFallback>
        </Avatar>

        {/* Mic status indicator */}
        <div
          className={cn(
            'absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-background transition-all',
            isMuted || role === 'listener'
              ? 'bg-muted text-muted-foreground'
              : isSpeaking
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground'
          )}
        >
          {role === 'listener' ? (
            <Volume2 className="h-3 w-3" />
          ) : isMuted ? (
            <MicOff className="h-3 w-3" />
          ) : (
            <Mic className="h-3 w-3" />
          )}
        </div>

        {/* Host Moderation Button */}
        {onMute && !isMuted && role === 'speaker' && !isLocalParticipant && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onMute()
            }}
            className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110 shadow-sm"
            title="Mute Speaker"
          >
            <MicOff className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Name */}
      <div className="text-center min-w-0 max-w-[100px]">
        <p className="text-xs font-semibold truncate">
          {isLocalParticipant ? `${name || 'You'} (you)` : name || 'Member'}
        </p>
        <Badge
          variant="outline"
          className={cn('mt-1 rounded-full text-[10px] px-2 py-0 border', roleColor)}
        >
          {roleLabel}
        </Badge>
      </div>
    </div>
  )
}
