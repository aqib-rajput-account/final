'use client'

import { useState } from 'react'
import { Mic, MicOff, X, Radio, StopCircle, Hand, Copy, LogOut, Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface RoomControlsProps {
  isMuted: boolean
  isHost: boolean
  isSpeaker: boolean
  isHandRaised: boolean
  isRecording: boolean
  roomId: string
  onToggleMute: () => void
  onToggleHand: () => void
  onToggleRecording: () => void
  onLeave: () => void
  onSendReaction?: (emoji: string) => void
}

export function RoomControls({
  isMuted,
  isHost,
  isSpeaker,
  isHandRaised,
  isRecording,
  roomId,
  onToggleMute,
  onToggleHand,
  onToggleRecording,
  onLeave,
  onSendReaction,
}: RoomControlsProps) {
  const [copying, setCopying] = useState(false)

  const handleCopyLink = async () => {
    try {
      setCopying(true)
      await navigator.clipboard.writeText(
        `${window.location.origin}/feed/audio-conferences/${roomId}`
      )
      toast.success('Space link copied!')
    } catch {
      toast.error('Failed to copy link')
    } finally {
      setTimeout(() => setCopying(false), 1500)
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-border/60 bg-background/95 backdrop-blur">

      {/* Left — invite */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="rounded-full gap-2 text-muted-foreground hover:text-foreground"
          onClick={handleCopyLink}
        >
          <Copy className="h-4 w-4" />
          <span className="hidden sm:inline">{copying ? 'Copied!' : 'Invite'}</span>
        </Button>
      </div>

      {/* Centre — main controls */}
      <div className="flex items-center gap-3">
        {/* Mic toggle — only speakers/host */}
        {(isSpeaker || isHost) && (
          <button
            id="room-mute-btn"
            onClick={onToggleMute}
            className={cn(
              'flex h-14 w-14 items-center justify-center rounded-full transition-all shadow-lg active:scale-95',
              isMuted
                ? 'bg-muted border-2 border-border text-muted-foreground hover:bg-muted/80'
                : 'bg-primary text-primary-foreground shadow-primary/25 hover:bg-primary/90'
            )}
            aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
          </button>
        )}

        {/* Raise hand — listeners */}
        {!isSpeaker && !isHost && (
          <button
            id="room-raise-hand-btn"
            onClick={onToggleHand}
            className={cn(
              'flex h-14 w-14 items-center justify-center rounded-full transition-all shadow-lg active:scale-95',
              isHandRaised
                ? 'bg-amber-500 text-white shadow-amber-500/25 hover:bg-amber-600'
                : 'bg-muted border-2 border-border text-muted-foreground hover:bg-muted/80'
            )}
            aria-label={isHandRaised ? 'Lower hand' : 'Raise hand'}
          >
            <Hand className={cn('h-6 w-6', isHandRaised && 'animate-bounce')} />
          </button>
        )}

        {/* Reaction Bar */}
        <div className="hidden sm:flex items-center gap-1 bg-muted/40 p-1.5 rounded-full border border-border/40">
          {['❤️', '👏', '🔥', '💯', '😂'].map((emoji) => (
            <button
              key={emoji}
              onClick={() => onSendReaction?.(emoji)}
              className="h-9 w-9 flex items-center justify-center text-xl rounded-full hover:bg-background hover:shadow-sm hover:scale-110 active:scale-95 transition-all"
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* Listener icon for smaller screens */}
        {!isSpeaker && !isHost && (
          <div className="flex sm:hidden h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Volume2 className="h-5 w-5" />
          </div>
        )}
      </div>

      {/* Right — recording + leave */}
      <div className="flex items-center gap-2">
        {isHost && (
          <Button
            variant={isRecording ? 'destructive' : 'outline'}
            size="sm"
            className="rounded-full gap-2"
            onClick={onToggleRecording}
          >
            {isRecording ? (
              <>
                <StopCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Stop Rec</span>
                <Badge variant="outline" className="border-white/30 text-white text-[10px] hidden sm:inline-flex">
                  LIVE
                </Badge>
              </>
            ) : (
              <>
                <Radio className="h-4 w-4" />
                <span className="hidden sm:inline">Record</span>
              </>
            )}
          </Button>
        )}

        <Button
          id="room-leave-btn"
          variant="outline"
          size="sm"
          onClick={onLeave}
          className="rounded-full gap-2 border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Leave</span>
        </Button>
      </div>
    </div>
  )
}
