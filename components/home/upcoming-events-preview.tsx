import Link from "next/link";
import { ArrowRight, Calendar, Clock, MapPin, Users } from "lucide-react";

import { getUpcomingEventsPreview } from "@/lib/mosques/public";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const categoryColors: Record<string, string> = {
  jummah: "bg-primary/10 text-primary border-primary/20",
  lecture: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  class: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  quran_study: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  youth: "bg-violet-500/10 text-violet-600 border-violet-500/20",
  community: "bg-sky-500/10 text-sky-600 border-sky-500/20",
  fundraising: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  general: "bg-gray-500/10 text-gray-600 border-gray-500/20",
};

function labelForEventType(eventType: string) {
  return eventType
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatEventDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatEventTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export async function UpcomingEventsPreview() {
  const upcoming = await getUpcomingEventsPreview(4);

  return (
    <section className="bg-muted/30 py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Upcoming Events</h2>
            <p className="mt-2 text-muted-foreground">
              Live programming pulled from mosque management panels
            </p>
          </div>
          <Link href="/events">
            <Button variant="outline" className="gap-2">
              View All Events
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        {upcoming.length === 0 ? (
          <Card className="border-dashed border-border/60 bg-background/60">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No published upcoming events yet. As mosques schedule new programs, they will appear here
              automatically.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {upcoming.map(({ event, mosque }) => (
              <Link key={event.id} href={`/events/${event.id}`}>
                <Card className="group h-full overflow-hidden border-border/50 transition-all hover:border-primary/30 hover:shadow-lg">
                  <div className="h-2 bg-gradient-to-r from-primary to-primary/60" />
                  <CardContent className="p-5">
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <Badge
                        variant="outline"
                        className={categoryColors[event.event_type] ?? categoryColors.general}
                      >
                        {labelForEventType(event.event_type)}
                      </Badge>
                      {event.is_recurring && <Badge variant="secondary">Recurring</Badge>}
                    </div>

                    <h3 className="mb-3 line-clamp-2 font-semibold text-foreground transition-colors group-hover:text-primary">
                      {event.title}
                    </h3>

                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 flex-shrink-0" />
                        <span>{formatEventDate(event.start_date)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 flex-shrink-0" />
                        <span>{formatEventTime(event.start_date)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{mosque?.name ?? event.location ?? "Mosque event"}</span>
                      </div>
                      {event.max_attendees ? (
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 flex-shrink-0" />
                          <span>Up to {event.max_attendees} attendees</span>
                        </div>
                      ) : null}
                    </div>

                    {event.description ? (
                      <p className="mt-4 line-clamp-3 border-t border-border pt-3 text-sm text-muted-foreground">
                        {event.description}
                      </p>
                    ) : null}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
