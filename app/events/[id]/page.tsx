import { notFound } from 'next/navigation'
import Link from 'next/link'
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  User, 
  Share2, 
  ChevronLeft,
  CalendarPlus,
  Repeat
} from 'lucide-react'
import { Header } from '@/components/layout'
import { Footer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { mockEvents, getMosqueById } from '@/lib/data'
import type { EventCategory } from '@/lib/types'

interface EventPageProps {
  params: Promise<{ id: string }>
}

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

export async function generateMetadata({ params }: EventPageProps) {
  const { id } = await params
  const event = mockEvents.find((e) => e.id === id)

  if (!event) {
    return { title: 'Event Not Found | MosqueConnect' }
  }

  return {
    title: `${event.title} | MosqueConnect`,
    description: event.description,
  }
}

export default async function EventPage({ params }: EventPageProps) {
  const { id } = await params
  const event = mockEvents.find((e) => e.id === id)

  if (!event) {
    notFound()
  }

  const mosque = getMosqueById(event.mosqueId)

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const spotsRemaining = event.maxAttendees 
    ? event.maxAttendees - event.currentAttendees 
    : null

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background">
          <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
            <Link
              href="/events"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to Events
            </Link>

            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <Badge className={categoryColors[event.category]}>
                    {categoryLabels[event.category]}
                  </Badge>
                  {event.isRecurring && (
                    <Badge variant="secondary" className="gap-1">
                      <Repeat className="h-3 w-3" />
                      {event.recurrencePattern}
                    </Badge>
                  )}
                </div>

                <h1 className="text-3xl font-bold text-foreground">{event.title}</h1>

                <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    {formatDate(event.startDate)}
                  </span>
                  <span className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    {event.startTime} - {event.endTime}
                  </span>
                  {event.speaker && (
                    <span className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      {event.speaker}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button className="gap-2">
                  <CalendarPlus className="h-4 w-4" />
                  Register
                </Button>
                <Button variant="outline" className="gap-2">
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>About This Event</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    {event.description}
                  </p>
                </CardContent>
              </Card>

              {event.speaker && (
                <Card>
                  <CardHeader>
                    <CardTitle>Speaker</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                        <User className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{event.speaker}</h3>
                        <p className="text-sm text-muted-foreground">Guest Speaker</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Event Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">Date</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(event.startDate)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">Time</p>
                      <p className="text-sm text-muted-foreground">
                        {event.startTime} - {event.endTime}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">Location</p>
                      <p className="text-sm text-muted-foreground">{event.location}</p>
                      {mosque && (
                        <Link
                          href={`/mosques/${mosque.id}`}
                          className="text-sm text-primary hover:underline"
                        >
                          {mosque.name}
                        </Link>
                      )}
                    </div>
                  </div>

                  {event.maxAttendees && (
                    <div className="flex items-start gap-3">
                      <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium">Capacity</p>
                        <p className="text-sm text-muted-foreground">
                          {event.currentAttendees} / {event.maxAttendees} registered
                        </p>
                        {spotsRemaining !== null && spotsRemaining > 0 && (
                          <p className="text-sm text-primary">
                            {spotsRemaining} spots remaining
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {mosque && (
                <Card>
                  <CardHeader>
                    <CardTitle>Hosted By</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Link href={`/mosques/${mosque.id}`} className="group">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                          <MosqueIcon className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium group-hover:text-primary transition-colors">
                            {mosque.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {mosque.city}, {mosque.state}
                          </p>
                        </div>
                      </div>
                    </Link>
                  </CardContent>
                </Card>
              )}

              <Button className="w-full gap-2" size="lg">
                <CalendarPlus className="h-5 w-5" />
                Register for Event
              </Button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

function MosqueIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 3c-1.5 2-3 3.5-3 5.5a3 3 0 1 0 6 0c0-2-1.5-3.5-3-5.5z" />
      <path d="M4 21V10a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v11" />
      <path d="M9 21v-4a3 3 0 0 1 6 0v4" />
      <path d="M3 21h18" />
      <path d="M4 10l8-6 8 6" />
    </svg>
  )
}

