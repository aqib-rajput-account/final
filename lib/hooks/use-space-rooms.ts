'use client'

import useSWR from 'swr'

export interface AudioRoom {
  id: string
  title: string
  topic: string | null
  host_id: string
  host_name: string | null
  host_avatar_url: string | null
  status: 'scheduled' | 'live' | 'ended'
  stream_call_id: string | null
  recording_url: string | null
  scheduled_at: string | null
  started_at: string | null
  ended_at: string | null
  max_speakers: number
  is_recorded: boolean
  listener_count: number
  created_at: string
  updated_at: string
}

const fetcher = async (url: string) => {
  const res = await fetch(url, { cache: 'no-store' })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Request failed')
  return json
}

export function useSpaceRooms() {
  const { data, error, isLoading, mutate } = useSWR<{ rooms: AudioRoom[] }>(
    '/api/audio-rooms',
    fetcher,
    {
      refreshInterval: 15_000, // poll every 15s for live count updates
      revalidateOnFocus: true,
      dedupingInterval: 5_000,
    }
  )

  const rooms = data?.rooms ?? []
  const liveRooms = rooms.filter((r) => r.status === 'live')
  const scheduledRooms = rooms.filter((r) => r.status === 'scheduled')

  return {
    rooms,
    liveRooms,
    scheduledRooms,
    isLoading,
    error,
    mutate,
  }
}
