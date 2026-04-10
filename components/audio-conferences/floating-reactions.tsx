'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ReactionEvent } from '@/lib/hooks/use-audio-room'

interface FloatingReactionsProps {
  reactions: ReactionEvent[]
}

export function FloatingReactions({ reactions }: FloatingReactionsProps) {
  // We only want to render the most recent reactions that are still "alive" (within last 3 secs)
  const [activeReactions, setActiveReactions] = useState<{ id: string; emoji: string; xOffset: number }[]>([])

  useEffect(() => {
    // When reactions change, identify new ones and add them with a random X offset
    setActiveReactions(
      reactions
        .filter((r) => Date.now() - new Date(r.sentAt).getTime() < 3000)
        .map((r) => {
          // Stable random offset based on ID so it doesn't jump
          const hash = r.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
          const xOffset = (hash % 100) - 50 // range -50 to +50
          return { id: r.id, emoji: r.emoji, xOffset }
        })
    )
  }, [reactions])

  return (
    <div className="pointer-events-none absolute bottom-24 right-8 z-50 h-96 w-24 overflow-visible">
      <AnimatePresence>
        {activeReactions.map((reaction) => (
          <motion.div
            key={reaction.id}
            initial={{ opacity: 0, y: 50, scale: 0.5, x: 0 }}
            animate={{ 
              opacity: [0, 1, 1, 0], 
              y: -300, 
              scale: [0.5, 1.2, 1], 
              x: reaction.xOffset 
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2.5, ease: 'easeOut' }}
            className="absolute bottom-0 text-4xl drop-shadow-lg"
            style={{ right: '50%' }}
          >
            {reaction.emoji}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
