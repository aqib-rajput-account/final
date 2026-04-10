'use client'

import { Hand, UserPlus } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { HandRaiseEvent } from '@/lib/hooks/use-audio-room'

function getInitials(name: string | null | undefined) {
  if (!name) return 'U'
  return name.split(' ').filter(Boolean).map((s) => s[0]).join('').slice(0, 2).toUpperCase()
}

interface RaisedHandsPanelProps {
  raisedHands: HandRaiseEvent[]
  isHost: boolean
  onPromote: (userId: string) => void
  onDismiss: (userId: string) => void
}

export function RaisedHandsPanel({
  raisedHands,
  isHost,
  onPromote,
  onDismiss,
}: RaisedHandsPanelProps) {
  if (raisedHands.length === 0) return null

  return (
    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-amber-500/20">
        <Hand className="h-4 w-4 text-amber-600 dark:text-amber-400 animate-bounce" />
        <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
          Raised hands ({raisedHands.length})
        </p>
      </div>

      <ScrollArea className="max-h-48">
        <div className="divide-y divide-amber-500/10">
          {raisedHands.map((hand) => (
            <div key={hand.userId} className="flex items-center gap-3 px-4 py-3">
              <Avatar className="h-8 w-8 border border-amber-500/20">
                <AvatarImage src={hand.avatarUrl || undefined} alt={hand.userName || 'Member'} />
                <AvatarFallback className="text-xs bg-amber-500/10 text-amber-700 dark:text-amber-400">
                  {getInitials(hand.userName)}
                </AvatarFallback>
              </Avatar>

              <p className="flex-1 text-sm font-medium truncate">
                {hand.userName || 'Community member'}
              </p>

              {isHost && (
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 rounded-full text-xs border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 gap-1"
                    onClick={() => onPromote(hand.userId)}
                  >
                    <UserPlus className="h-3 w-3" />
                    Add as speaker
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 rounded-full text-xs text-muted-foreground"
                    onClick={() => onDismiss(hand.userId)}
                  >
                    Dismiss
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
