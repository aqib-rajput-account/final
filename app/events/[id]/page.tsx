import Link from "next/link";
import { notFound } from "next/navigation";
import type { ElementType } from "react";
import {
  Calendar,
  CalendarPlus,
  ChevronLeft,
  Clock,
  MapPin,
  Repeat,
  Users,
} from "lucide-react";

import { Footer, Header } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPublishedEventById } from "@/lib/mosques/public";

interface EventPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: EventPageProps) {
  const { id } = await params;
  const data = await getPublishedEventById(id);

  if (!data) {
    return { title: "Event Not Found | MosqueConnect" };
  }

  return {
    title: `${data.event.title} | MosqueConnect`,
    description: (data.event.description || `${data.event.title} at ${data.mosque?.name || "MosqueConnect"}`).slice(0, 160),
  };
}

export default async function EventPage({ params }: EventPageProps) {
  const { id } = await params;
  const data = await getPublishedEventById(id);

  if (!data) {
    notFound();
  }

  const { event, mosque } = data;
  const spotsRemaining = event.max_attendees ? event.max_attendees : null;
  const directionsQuery = encodeURIComponent(
    mosque
      ? [mosque.address, mosque.city, mosque.state, mosque.country].filter(Boolean).join(", ")
      : event.location || event.title
  );

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background">
          <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
            <Link
              href="/events"
              className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to Events
            </Link>

            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="rounded-full capitalize">
                    {formatLabel(event.event_type)}
                  </Badge>
                  {event.is_recurring ? (
                    <Badge variant="outline" className="gap-1 rounded-full capitalize">
                      <Repeat className="h-3 w-3" />
                      {event.recurrence_pattern || "Recurring"}
                    </Badge>
                  ) : null}
                </div>

                <h1 className="text-3xl font-bold text-foreground lg:text-4xl">{event.title}</h1>

                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    {formatDate(event.start_date)}
                  </span>
                  <span className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    {formatTime(event.start_date)}
                    {event.end_date ? ` - ${formatTime(event.end_date)}` : ""}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button className="gap-2">
                  <CalendarPlus className="h-4 w-4" />
                  Register Interest
                </Button>
                <Button variant="outline" className="gap-2" asChild>
                  <a href={`https://www.google.com/maps/search/?api=1&query=${directionsQuery}`} target="_blank" rel="noreferrer">
                    <MapPin className="h-4 w-4" />
                    Directions
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <Card className="rounded-3xl border-border/50">
                <CardHeader>
                  <CardTitle>About This Event</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="leading-relaxed text-muted-foreground">
                    {event.description || "Detailed event information will be shared soon."}
                  </p>
                </CardContent>
              </Card>

              {mosque ? (
                <Card className="rounded-3xl border-border/50">
                  <CardHeader>
                    <CardTitle>Hosted By</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Link href={`/mosques/${mosque.id}`} className="group flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <MosqueIcon className="h-7 w-7" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground transition-colors group-hover:text-primary">
                          {mosque.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {mosque.city}, {mosque.state}
                        </p>
                      </div>
                    </Link>
                  </CardContent>
                </Card>
              ) : null}
            </div>

            <div className="space-y-6">
              <Card className="rounded-3xl border-border/50">
                <CardHeader>
                  <CardTitle>Event Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <DetailRow label="Date" value={formatDate(event.start_date)} icon={Calendar} />
                  <DetailRow
                    label="Time"
                    value={`${formatTime(event.start_date)}${event.end_date ? ` - ${formatTime(event.end_date)}` : ""}`}
                    icon={Clock}
                  />
                  <DetailRow label="Location" value={event.location || mosque?.name || "Mosque event"} icon={MapPin} />
                  {spotsRemaining ? (
                    <DetailRow label="Capacity" value={`Up to ${spotsRemaining} attendees`} icon={Users} />
                  ) : null}
                </CardContent>
              </Card>

              {mosque ? (
                <Card className="rounded-3xl border-border/50">
                  <CardHeader>
                    <CardTitle>Visit the Mosque</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      {mosque.address}, {mosque.city}, {mosque.state}
                    </p>
                    <Button asChild className="w-full rounded-xl">
                      <Link href={`/mosques/${mosque.id}`}>Open Mosque Page</Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : null}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function DetailRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: ElementType;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-5 w-5 text-muted-foreground" />
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-sm text-muted-foreground">{value}</p>
      </div>
    </div>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatLabel(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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
  );
}
