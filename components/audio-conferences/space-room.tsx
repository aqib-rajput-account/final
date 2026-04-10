'use client'

import { useCallback, useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  StreamVideo,
  StreamCall,
  StreamVideoClient,
  useCall,
  useCallStateHooks,
  CallingState,
} from '@stream-io/video-react-sdk'
import { Mic, Radio, Users, MessageSquare, X, ChevronRight, Send, AlertCircle } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ParticipantTile } from './participant-tile'
import { RoomControls } from './room-controls'
import { RaisedHandsPanel } from './raised-hands-panel'
import { FloatingReactions } from './floating-reactions'
import { useAudioRoom } from '@/lib/hooks/use-audio-room'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { AudioRoom } from '@/lib/hooks/use-space-rooms'

// ─── Inner call UI (must be inside StreamCall context) ────────────────────────

interface CallUIProps {
  room: AudioRoom
  userId: string
  userName: string | null
  avatarUrl: string | null
  chatOpen: boolean
  onToggleChat: () => void
}

function CallUI({ room, userId, userName, avatarUrl, chatOpen, onToggleChat }: CallUIProps) {
  const router = useRouter()
  const [chatInput, setChatInput] = useState('')
  const chatEndRef = useRef<HTMLDivElement>(null)

  const {
    useParticipants,
    useLocalParticipant,
    useCallCallingState,
    useMicrophoneState,
    useIsCallRecordingInProgress,
  } = useCallStateHooks()

  const call = useCall()
  const participants = useParticipants()
  const localParticipant = useLocalParticipant()
  const callingState = useCallCallingState()
  const isRecording = useIsCallRecordingInProgress()

  const {
    raisedHands,
    chatMessages,
    reactions,
    listenerCount,
    raiseHand,
    sendChatMessage,
    sendReaction,
    dismissHandRaise,
  } = useAudioRoom({ roomId: room.id, userId, userName, avatarUrl, enabled: true })

  const isHost = room.host_id === userId
  const localSessionId = localParticipant?.sessionId

  // Local Microphone Device State
  const { isMute: isMicMute } = useMicrophoneState()

  // Determine local role
  const localParticipantData = participants.find((p) => p.sessionId === localSessionId)
  const isSpeaker = isHost || Boolean(localParticipantData?.publishedTracks?.length)
  const [isHandRaised, setIsHandRaised] = useState(false)

  const speakers = participants.filter((p) => p.publishedTracks?.length)
  const listeners = participants.filter((p) => !p.publishedTracks?.length)

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  // Handle connection state
  useEffect(() => {
    if (callingState === CallingState.LEFT) {
      router.push('/feed/audio-conferences')
    }
  }, [callingState, router])

  const handleToggleMute = useCallback(async () => {
    if (!call) return
    try {
      if (isMicMute) {
        await call.microphone.enable()
        toast.success("Microphone enabled")
      } else {
        await call.microphone.disable()
        toast.info("Microphone disabled")
      }
    } catch {
      toast.error('Could not toggle microphone - check permissions')
    }
  }, [isMicMute, call])

  const handleToggleHand = useCallback(async () => {
    const next = !isHandRaised
    setIsHandRaised(next)
    await raiseHand(next ? 'raise' : 'lower')
    if (next) toast.success('Hand raised! The host will see your request.')
  }, [isHandRaised, raiseHand])

  const handleLeave = useCallback(async () => {
    try {
      // If host, end the room
      if (isHost) {
        await fetch(`/api/audio-rooms/${room.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'ended' }),
        })
      }
      router.push('/feed/audio-conferences')
    } catch {
      router.push('/feed/audio-conferences')
    }
  }, [isHost, room.id, router])

  const handleToggleRecording = useCallback(async () => {
    toast.info(isRecording ? 'Stopping recording...' : 'Starting recording...')
  }, [isRecording])

  const handlePromote = useCallback(
    (targetUserId: string) => {
      dismissHandRaise(targetUserId)
      toast.success('Invite sent — they can now speak')
    },
    [dismissHandRaise]
  )

  const handleMuteSpeaker = useCallback(
    async (targetUserId: string) => {
      if (!call) return
      try {
        await call.muteUser(targetUserId, 'audio')
        toast.success('Muted speaker')
      } catch {
        toast.error('Failed to mute speaker')
      }
    },
    [call]
  )

  const handleSendChat = useCallback(async () => {
    if (!chatInput.trim()) return
    await sendChatMessage(chatInput)
    setChatInput('')
  }, [chatInput, sendChatMessage])

  if (callingState === CallingState.JOINING) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="h-10 w-10 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
        <p className="text-muted-foreground font-medium">Joining Space...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Recording consent banner */}
      {isRecording && (
        <div className="flex items-center gap-2.5 px-4 py-2.5 bg-rose-500/10 border-b border-rose-500/20 text-rose-700 dark:text-rose-400 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="font-medium">This Space is being recorded.</span>
          <span className="text-xs opacity-80">By participating you consent to being recorded.</span>
        </div>
      )}

      <div className="flex flex-1 min-h-0 relative overflow-hidden">
        {/* Floating Reactions Overlay */}
        <FloatingReactions reactions={reactions} />

        {/* Main room area */}
        <div className="flex-1 flex flex-col min-h-0 z-10">
          {/* Speakers section */}
          <ScrollArea className="flex-1 p-6">
            <div className="space-y-6">
              {/* Raised hands */}
              {raisedHands.length > 0 && (
                <RaisedHandsPanel
                  raisedHands={raisedHands}
                  isHost={isHost}
                  onPromote={handlePromote}
                  onDismiss={dismissHandRaise}
                />
              )}

              {/* Speakers */}
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                  Speakers · {speakers.length || 1}
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                  {speakers.map((participant) => (
                    <ParticipantTile
                      key={participant.sessionId}
                      userId={participant.userId ?? ''}
                      name={participant.name ?? null}
                      avatarUrl={participant.image ?? null}
                      role={participant.userId === room.host_id ? 'host' : 'speaker'}
                      isMuted={!participant.publishedTracks?.includes('audio' as any)}
                      isSpeaking={participant.isSpeaking}
                      audioLevel={participant.audioLevel}
                      isLocalParticipant={participant.sessionId === localSessionId}
                      onMute={isHost ? () => handleMuteSpeaker(participant.userId) : undefined}
                    />
                  ))}

                  {/* If no other participants yet, show host tile with local user */}
                  {speakers.length === 0 && (
                    <ParticipantTile
                      userId={userId}
                      name={userName}
                      avatarUrl={avatarUrl}
                      role={isHost ? 'host' : 'listener'}
                      isMuted={isMicMute}
                      isSpeaking={false}
                      isLocalParticipant
                    />
                  )}
                </div>
              </div>

              {/* Listeners */}
              {listeners.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                    Listeners · {Math.max(listeners.length, listenerCount)}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {listeners.map((participant) => (
                      <Avatar
                        key={participant.sessionId}
                        className="h-9 w-9 border-2 border-background ring-1 ring-border/60"
                        title={participant.name ?? 'Listener'}
                      >
                        <AvatarImage src={participant.image ?? undefined} />
                        <AvatarFallback className="text-xs font-bold bg-muted text-muted-foreground">
                          {(participant.name ?? 'U').slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Controls */}
          <RoomControls
            isMuted={isMicMute}
            isHost={isHost}
            isSpeaker={isSpeaker}
            isHandRaised={isHandRaised}
            isRecording={isRecording}
            roomId={room.id}
            onToggleMute={handleToggleMute}
            onToggleHand={handleToggleHand}
            onToggleRecording={handleToggleRecording}
            onLeave={handleLeave}
            onSendReaction={sendReaction}
          />
        </div>

        {/* Chat panel */}
        {chatOpen && (
          <div className="w-80 border-l border-border/60 flex flex-col bg-muted/10">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-semibold">Live chat</p>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={onToggleChat}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <ScrollArea className="flex-1 p-3">
              <div className="space-y-3">
                {chatMessages.length === 0 ? (
                  <div className="py-8 text-center">
                    <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
                    <p className="text-xs text-muted-foreground">No messages yet</p>
                  </div>
                ) : (
                  chatMessages.map((msg) => (
                    <div key={msg.id} className={cn('flex gap-2', msg.userId === userId && 'flex-row-reverse')}>
                      <Avatar className="h-7 w-7 shrink-0">
                        <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                          {(msg.userName ?? 'U').slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className={cn('max-w-[180px]', msg.userId === userId && 'items-end flex flex-col')}>
                        <p className="text-[10px] text-muted-foreground mb-0.5 truncate">
                          {msg.userId === userId ? 'You' : msg.userName ?? 'Member'}
                        </p>
                        <div
                          className={cn(
                            'rounded-2xl px-3 py-2 text-sm break-words',
                            msg.userId === userId
                              ? 'bg-primary text-primary-foreground rounded-tr-sm'
                              : 'bg-muted text-foreground rounded-tl-sm'
                          )}
                        >
                          {msg.text}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={chatEndRef} />
              </div>
            </ScrollArea>

            <div className="p-3 border-t border-border/60">
              <div className="flex gap-2">
                <Input
                  id="space-chat-input"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type a message..."
                  className="rounded-full text-sm h-9"
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && void handleSendChat()}
                  maxLength={300}
                />
                <Button
                  size="icon"
                  className="h-9 w-9 rounded-full shrink-0"
                  onClick={() => void handleSendChat()}
                  disabled={!chatInput.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── SpaceRoom — bootstraps Stream client + call ─────────────────────────────

interface SpaceRoomProps {
  room: AudioRoom
  userId: string
  userName: string | null
  avatarUrl: string | null
}

export function SpaceRoom({ room, userId, userName, avatarUrl }: SpaceRoomProps) {
  const [client, setClient] = useState<StreamVideoClient | null>(null)
  const [call, setCall] = useState<ReturnType<StreamVideoClient['call']> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [chatOpen, setChatOpen] = useState(true)
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    ;(async () => {
      try {
        // Fetch user token
        const tokenRes = await fetch('/api/audio-rooms/token', { method: 'POST' })
        const { token, apiKey } = await tokenRes.json()

        if (!token || !apiKey) throw new Error('Failed to get Stream token')

        // Create Stream client
        const streamClient = new StreamVideoClient({
          apiKey,
          user: {
            id: userId,
            name: userName ?? undefined,
            image: avatarUrl ?? undefined,
          },
          token,
        })

        // Join audio_room call
        const audioCall = streamClient.call('audio_room', room.id)
        await audioCall.join({ create: true })

        setClient(streamClient)
        setCall(audioCall)
      } catch (err) {
        console.error('[SpaceRoom] init error:', err)
        setError(err instanceof Error ? err.message : 'Failed to connect to Space')
      }
    })()

    return () => {
      setCall(null)
      setClient(null)
    }
  }, [avatarUrl, room.id, userId, userName])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center px-6">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="h-7 w-7 text-destructive" />
        </div>
        <div>
          <p className="font-semibold text-base">Could not connect to Space</p>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
        </div>
        <Button variant="outline" className="rounded-full" onClick={() => window.location.reload()}>
          Try again
        </Button>
      </div>
    )
  }

  if (!client || !call) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="relative">
          <div className="h-14 w-14 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          <Mic className="absolute inset-0 m-auto h-5 w-5 text-primary" />
        </div>
        <div className="text-center">
          <p className="font-semibold">Connecting to Space</p>
          <p className="text-sm text-muted-foreground mt-1">Setting up audio connection...</p>
        </div>
      </div>
    )
  }

  return (
    <StreamVideo client={client}>
      <StreamCall call={call}>
        {/* Chat toggle button in header is outside CallUI */}
        <div className="flex flex-col h-full">
          {/* Room info bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/60 bg-card">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
                <Mic className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-bold text-base truncate">{room.title}</h1>
                  <div className="flex items-center gap-1 rounded-full bg-rose-500/10 border border-rose-500/20 px-2 py-0.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                    </span>
                    <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase">Live</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <Avatar className="h-4 w-4">
                    <AvatarImage src={room.host_avatar_url ?? undefined} />
                    <AvatarFallback className="text-[8px]">H</AvatarFallback>
                  </Avatar>
                  <p className="text-xs text-muted-foreground truncate">
                    {room.host_name ?? 'Host'} · {room.topic ?? 'General'}
                  </p>
                </div>
              </div>
            </div>
            <Button
              variant={chatOpen ? 'default' : 'outline'}
              size="sm"
              className="rounded-full gap-2 shrink-0"
              onClick={() => setChatOpen((v) => !v)}
            >
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Chat</span>
            </Button>
          </div>

          <CallUI
            room={room}
            userId={userId}
            userName={userName}
            avatarUrl={avatarUrl}
            chatOpen={chatOpen}
            onToggleChat={() => setChatOpen((v) => !v)}
          />
        </div>
      </StreamCall>
    </StreamVideo>
  )
}
