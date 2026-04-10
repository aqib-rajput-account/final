'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Mic, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { SpaceRoom } from '@/components/audio-conferences/space-room'
import { useAuth } from '@/lib/auth'
import type { AudioRoom } from '@/lib/hooks/use-space-rooms'

interface PageProps {
  params: Promise<{ roomId: string }>
}

export default function SpaceRoomPage({ params }: PageProps) {
  const { userId, profile, isSignedIn, loading } = useAuth()
  const router = useRouter()
  const [room, setRoom] = useState<AudioRoom | null>(null)
  const [roomError, setRoomError] = useState<string | null>(null)
  const [roomLoading, setRoomLoading] = useState(true)
  const [roomId, setRoomId] = useState<string | null>(null)

  // Resolve params
  useEffect(() => {
    params.then(({ roomId: id }) => setRoomId(id))
  }, [params])

  // Redirect if not signed in
  useEffect(() => {
    if (!loading && !isSignedIn) {
      router.push('/sign-in')
    }
  }, [loading, isSignedIn, router])

  // Fetch room data
  useEffect(() => {
    if (!roomId) return
    setRoomLoading(true)
    fetch(`/api/audio-rooms/${roomId}`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setRoomError(data.error)
        } else {
          setRoom(data.room)
        }
      })
      .catch(() => setRoomError('Failed to load room'))
      .finally(() => setRoomLoading(false))
  }, [roomId])

  // ── Loading states ──────────────────────────────────────────────────────────
  if (loading || roomLoading || !roomId) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-full" />
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="rounded-3xl border border-border/60 overflow-hidden shadow-sm">
          <div className="px-6 py-5 border-b border-border/60 bg-card flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-2xl" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-56" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <div className="p-10 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="h-14 w-14 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                <Mic className="absolute inset-0 m-auto h-5 w-5 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground font-medium">Connecting to Space...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Error state ──────────────────────────────────────────────────────────────
  if (roomError || !room) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 sm:px-6 text-center">
        <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-destructive/10 mb-5">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <h1 className="text-xl font-bold mb-2">Space not found</h1>
        <p className="text-muted-foreground text-sm mb-6">
          {roomError ?? 'This Space may have ended or never existed.'}
        </p>
        <Button asChild className="rounded-full">
          <Link href="/feed/audio-conferences">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Spaces
          </Link>
        </Button>
      </div>
    )
  }

  // ── Ended room ───────────────────────────────────────────────────────────────
  if (room.status === 'ended') {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 sm:px-6 text-center">
        <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-muted mb-5">
          <Mic className="h-8 w-8 text-muted-foreground/50" />
        </div>
        <h1 className="text-xl font-bold mb-2">This Space has ended</h1>
        <p className="text-muted-foreground text-sm mb-2">
          <span className="font-medium">{room.title}</span> has finished.
        </p>
        {room.recording_url && (
          <a
            href={room.recording_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm text-primary font-medium hover:underline mb-6 block"
          >
            🎙 Listen to the recording
          </a>
        )}
        <Button asChild className="rounded-full mt-4">
          <Link href="/feed/audio-conferences">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Spaces
          </Link>
        </Button>
      </div>
    )
  }

  // ── Active room ──────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-5xl px-4 pt-6 pb-0 sm:px-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <Link
          href="/feed/audio-conferences"
          className="flex items-center gap-1.5 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Spaces
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium truncate max-w-[200px]">{room.title}</span>
      </div>

      {/* Room card */}
      <div className="rounded-3xl border border-border/60 overflow-hidden shadow-lg mb-6 bg-card">
        <SpaceRoom
          room={room}
          userId={userId ?? ''}
          userName={profile?.full_name ?? null}
          avatarUrl={profile?.avatar_url ?? null}
        />
      </div>
    </div>
  )
}
