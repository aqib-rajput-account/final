'use client'

import { useState, useRef, useCallback } from 'react'
import { X, Plus, Calendar, Mic, Radio, Users, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

const TOPICS = [
  { value: 'quran', label: '📖 Quran & Recitation' },
  { value: 'hadith', label: '📜 Hadith & Sunnah' },
  { value: 'fiqh', label: '⚖️ Fiqh & Rulings' },
  { value: 'seerah', label: '⭐ Seerah' },
  { value: 'community', label: '🕌 Community' },
  { value: 'qa', label: '💬 Q&A Session' },
  { value: 'general', label: '🎙 General Discussion' },
]

interface CreateSpaceModalProps {
  open: boolean
  onClose: () => void
  hostName?: string | null
  hostAvatarUrl?: string | null
  onCreated?: (roomId: string) => void
}

export function CreateSpaceModal({
  open,
  onClose,
  hostName,
  hostAvatarUrl,
  onCreated,
}: CreateSpaceModalProps) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [topic, setTopic] = useState('general')
  const [isRecorded, setIsRecorded] = useState(false)
  const [isScheduled, setIsScheduled] = useState(false)
  const [scheduledAt, setScheduledAt] = useState('')
  const [maxSpeakers, setMaxSpeakers] = useState(10)
  const [isCreating, setIsCreating] = useState(false)

  const handleSubmit = useCallback(async () => {
    if (!title.trim()) {
      toast.error('Please enter a title for your Space')
      return
    }

    setIsCreating(true)
    try {
      const body: Record<string, unknown> = {
        title: title.trim(),
        topic,
        is_recorded: isRecorded,
        max_speakers: maxSpeakers,
        host_name: hostName ?? null,
        host_avatar_url: hostAvatarUrl ?? null,
      }
      if (isScheduled && scheduledAt) {
        body.scheduled_at = new Date(scheduledAt).toISOString()
      }

      const res = await fetch('/api/audio-rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Failed to create Space')

      toast.success(isScheduled ? 'Space scheduled!' : 'Space is live!')
      onClose()
      setTitle('')
      setTopic('general')
      setIsRecorded(false)
      setIsScheduled(false)
      setScheduledAt('')

      if (onCreated) {
        onCreated(data.room.id)
      } else if (!isScheduled) {
        router.push(`/feed/audio-conferences/${data.room.id}`)
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Something went wrong')
    } finally {
      setIsCreating(false)
    }
  }, [
    title,
    topic,
    isRecorded,
    maxSpeakers,
    hostName,
    hostAvatarUrl,
    isScheduled,
    scheduledAt,
    onClose,
    onCreated,
    router,
  ])

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md rounded-3xl border-border/60 shadow-2xl p-0 overflow-hidden">
        {/* Header */}
        <div className="relative bg-gradient-to-br from-primary/10 via-primary/5 to-background px-6 pt-6 pb-4 border-b border-border/40">
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
              <Mic className="h-5 w-5 text-primary" />
            </div>
            <DialogHeader className="p-0">
              <DialogTitle className="text-lg font-bold">Start a Space</DialogTitle>
            </DialogHeader>
          </div>
          <p className="text-sm text-muted-foreground pl-[52px]">
            Start a live audio room for the community
          </p>
        </div>

        <div className="p-6 space-y-5">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="space-title" className="text-sm font-semibold">
              Space title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="space-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Friday Quran discussion, Community Q&A..."
              className="rounded-xl"
              maxLength={80}
              autoFocus
            />
            <p className="text-xs text-muted-foreground text-right">{title.length}/80</p>
          </div>

          {/* Topic */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Topic</Label>
            <Select value={topic} onValueChange={setTopic}>
              <SelectTrigger className="rounded-xl" id="space-topic">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {TOPICS.map((t) => (
                  <SelectItem key={t.value} value={t.value} className="rounded-lg">
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Max speakers */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold flex items-center gap-2">
              <Users className="h-4 w-4" />
              Max speakers: <span className="text-primary font-bold">{maxSpeakers}</span>
            </Label>
            <div className="flex gap-2">
              {[2, 5, 10, 20].map((n) => (
                <button
                  key={n}
                  onClick={() => setMaxSpeakers(n)}
                  className={cn(
                    'flex-1 rounded-xl border py-2 text-sm font-semibold transition-all',
                    maxSpeakers === n
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'border-border/60 text-muted-foreground hover:border-border hover:text-foreground'
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Toggle row */}
          <div className="rounded-2xl border border-border/60 bg-muted/20 divide-y divide-border/60">
            {/* Schedule */}
            <div className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Schedule for later</p>
                  <p className="text-xs text-muted-foreground">Set a future start time</p>
                </div>
              </div>
              <Switch
                id="space-schedule"
                checked={isScheduled}
                onCheckedChange={setIsScheduled}
              />
            </div>

            {isScheduled && (
              <div className="px-4 py-3">
                <Input
                  id="space-scheduled-at"
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="rounded-xl"
                  min={new Date().toISOString().slice(0, 16)}
                />
              </div>
            )}

            {/* Recording */}
            <div className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="flex items-center gap-2">
                <Radio className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Record session</p>
                  <p className="text-xs text-muted-foreground">Participants will be notified</p>
                </div>
              </div>
              <Switch
                id="space-record"
                checked={isRecorded}
                onCheckedChange={setIsRecorded}
              />
            </div>
          </div>

          {/* Submit */}
          <Button
            id="create-space-submit"
            onClick={handleSubmit}
            disabled={isCreating || !title.trim()}
            className="w-full rounded-xl h-11 font-bold shadow-md shadow-primary/20"
          >
            {isCreating ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating...
              </span>
            ) : isScheduled ? (
              <>
                <Calendar className="mr-2 h-4 w-4" />
                Schedule Space
              </>
            ) : (
              <>
                <Mic className="mr-2 h-4 w-4" />
                Go Live Now
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
