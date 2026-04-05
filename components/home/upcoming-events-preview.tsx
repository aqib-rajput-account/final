import Link from 'next/link'
import { Calendar, Clock, MapPin, Users, ArrowRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  youth_program: 'Youth',
  sisters_program: 'Sisters',
  community_event: 'Community',
  fundraiser: 'Fundraiser',
  iftar: 'Iftar',
  eid: 'Eid',
  other: 'Other',
}

function formatEventDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export function UpcomingEventsPreview() {
  const events = mockEvents.filter(e => e.isActive).slice(0, 4)

  return (
    <section className="py-16 lg:py-24 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              Upcoming Events
            </h2>
            <p className="mt-2 text-muted-foreground">
              Join lectures, classes, and community gatherings at mosques near you
            </p>
          </div>
          <Link href="/events">
            <Button variant="outline" className="gap-2">
              View All Events
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {events.map((event) => {
            const mosque = getMosqueById(event.mosqueId)
            return (
              <Link key={event.id} href={`/events/${event.id}`}>
                <Card className="group h-full overflow-hidden border-border/50 transition-all hover:border-primary/30 hover:shadow-lg">
                  <div className="h-2 bg-gradient-to-r from-primary to-primary/60" />
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <Badge 
                        variant="outline" 
                        className={categoryColors[event.category]}
                      >
                        {categoryLabels[event.category]}
                      </Badge>
                      {event.isRecurring && (
                        <Badge variant="secondary" className="text-xs">
                          Recurring
                        </Badge>
                      )}
                    </div>
                    
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 mb-3">
                      {event.title}
                    </h3>
                    
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 flex-shrink-0" />
                        <span>{formatEventDate(event.startDate)}</span>
                      </div>
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
                          <span>{event.currentAttendees}/{event.maxAttendees} spots</span>
                        </div>
                      )}
                    </div>

                    {event.speaker && (
                      <div className="mt-4 pt-3 border-t border-border">
                        <p className="text-sm">
                          <span className="text-muted-foreground">Speaker: </span>
                          <span className="font-medium text-foreground">{event.speaker}</span>
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}

