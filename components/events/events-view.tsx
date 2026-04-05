"use client"

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { 
  Search, 
  Calendar,
  Clock,
  MapPin,
  Users,
  Filter,
  CalendarDays,
  List,
  ChevronRight
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { mockEvents, getMosqueById } from '@/lib/data'
import type { EventCategory } from '@/lib/types'

const categoryColors: Record<EventCategory, string> = {
  jummah: 'bg-primary/10 text-primary border-primary/20',
  lecture: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  class: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  quran_study: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  youth_program: 'bg-violet-500/10 text-violet-600 border-violet-500/20',
  sisters_program: 'bg-pink-500/10 text-pink-600 border-pink-500/20',
  community_event: 'bg-sky-500/10 text-sky-600 border-sky-500/20',
  fundraiser: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  iftar: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
  eid: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  other: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
}

const categoryLabels: Record<EventCategory, string> = {
  jummah: 'Jummah',
  lecture: 'Lecture',
  class: 'Class',
  quran_study: "Qur'an Study",
  youth_program: 'Youth Program',
  sisters_program: 'Sisters Program',
  community_event: 'Community Event',
  fundraiser: 'Fundraiser',
  iftar: 'Iftar',
  eid: 'Eid',
  other: 'Other',
}

const allCategories = Object.keys(categoryLabels) as EventCategory[]

export function EventsView() {
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [sortBy, setSortBy] = useState('date')

  const filteredEvents = useMemo(() => {
    let result = [...mockEvents].filter(e => e.isActive)

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (event) =>
          event.title.toLowerCase().includes(query) ||
          event.description.toLowerCase().includes(query) ||
          event.speaker?.toLowerCase().includes(query)
      )
    }

    // Category filter
    if (selectedCategory !== 'all') {
      result = result.filter((event) => event.category === selectedCategory)
    }

    // Sort
    switch (sortBy) {
      case 'date':
        result.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
        break
      case 'title':
        result.sort((a, b) => a.title.localeCompare(b.title))
        break
    }

    return result
  }, [searchQuery, selectedCategory, sortBy])

  // Group events by date for calendar view
  const eventsByDate = useMemo(() => {
    const grouped: Record<string, typeof mockEvents> = {}
    filteredEvents.forEach((event) => {
      const date = event.startDate
      if (!grouped[date]) {
        grouped[date] = []
      }
      grouped[date].push(event)
    })
    return grouped
  }, [filteredEvents])

  const formatEventDate = (dateStr: string): string => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {allCategories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {categoryLabels[cat]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Date</SelectItem>
              <SelectItem value="title">Title</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center rounded-lg border border-input p-1">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode('grid')}
            >
              <CalendarDays className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={selectedCategory === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedCategory('all')}
        >
          All
        </Button>
        {allCategories.map((cat) => (
          <Button
            key={cat}
            variant={selectedCategory === cat ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(cat)}
            className={selectedCategory === cat ? '' : categoryColors[cat]}
          >
            {categoryLabels[cat]}
          </Button>
        ))}
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        Showing {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''}
      </p>

      {/* Events */}
      {filteredEvents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">No events found</h3>
            <p className="mt-2 text-muted-foreground">
              Try adjusting your search or filter criteria
            </p>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="space-y-8">
          {Object.entries(eventsByDate).map(([date, events]) => (
            <div key={date}>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                {formatEventDate(date)}
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {events.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredEvents.map((event) => (
            <EventListItem key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  )
}

function EventCard({ event }: { event: typeof mockEvents[0] }) {
  const mosque = getMosqueById(event.mosqueId)
  
  return (
    <Link href={`/events/${event.id}`}>
      <Card className="group h-full overflow-hidden border-border/50 transition-all hover:border-primary/30 hover:shadow-lg">
        <div className={cn(
          "h-2",
          event.category === 'jummah' && "bg-primary",
          event.category === 'lecture' && "bg-blue-500",
          event.category === 'class' && "bg-amber-500",
          event.category === 'quran_study' && "bg-emerald-500",
          event.category === 'youth_program' && "bg-violet-500",
          event.category === 'sisters_program' && "bg-pink-500",
          event.category === 'community_event' && "bg-sky-500",
          event.category === 'fundraiser' && "bg-orange-500",
          event.category === 'iftar' && "bg-rose-500",
          event.category === 'eid' && "bg-yellow-500",
          event.category === 'other' && "bg-gray-500"
        )} />
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-2 mb-3">
            <Badge variant="outline" className={categoryColors[event.category]}>
              {categoryLabels[event.category]}
            </Badge>
            {event.isRecurring && (
              <Badge variant="secondary" className="text-xs">Recurring</Badge>
            )}
          </div>

          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 mb-2">
            {event.title}
          </h3>

          <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
            {event.description}
          </p>

          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 flex-shrink-0" />
              <span>{event.startTime} - {event.endTime}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{mosque?.name || event.location}</span>
            </div>
            {event.maxAttendees && (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 flex-shrink-0" />
                <span>{event.currentAttendees}/{event.maxAttendees} registered</span>
              </div>
            )}
          </div>

          {event.speaker && (
            <div className="mt-4 pt-3 border-t border-border">
              <p className="text-sm">
                <span className="text-muted-foreground">Speaker: </span>
                <span className="font-medium">{event.speaker}</span>
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}

function EventListItem({ event }: { event: typeof mockEvents[0] }) {
  const mosque = getMosqueById(event.mosqueId)
  
  return (
    <Link href={`/events/${event.id}`}>
      <Card className="group overflow-hidden border-border/50 transition-all hover:border-primary/30">
        <CardContent className="flex items-center gap-4 p-4">
          <div className={cn(
            "flex flex-col items-center justify-center rounded-lg p-3 min-w-[70px] text-center",
            categoryColors[event.category]
          )}>
            <span className="text-2xl font-bold">
              {new Date(event.startDate).getDate()}
            </span>
            <span className="text-xs uppercase">
              {new Date(event.startDate).toLocaleDateString('en-US', { month: 'short' })}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className={cn("text-xs", categoryColors[event.category])}>
                {categoryLabels[event.category]}
              </Badge>
              {event.isRecurring && (
                <Badge variant="secondary" className="text-xs">Recurring</Badge>
              )}
            </div>

            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
              {event.title}
            </h3>

            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {event.startTime} - {event.endTime}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {mosque?.name || event.location}
              </span>
              {event.speaker && (
                <span>Speaker: {event.speaker}</span>
              )}
            </div>
          </div>

          <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </CardContent>
      </Card>
    </Link>
  )
}

