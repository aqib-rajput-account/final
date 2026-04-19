"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import {
  Calendar,
  CalendarDays,
  ChevronRight,
  Clock,
  List,
  MapPin,
  Search,
  Users,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PublicEventListItem } from "@/lib/mosques/public";
import { cn } from "@/lib/utils";

interface EventsViewProps {
  initialEvents: PublicEventListItem[];
}

const categoryColors: Record<string, string> = {
  general: "bg-gray-500/10 text-gray-600 border-gray-500/20",
  jummah: "bg-primary/10 text-primary border-primary/20",
  lecture: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  class: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  quran_study: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  youth: "bg-violet-500/10 text-violet-600 border-violet-500/20",
  community: "bg-sky-500/10 text-sky-600 border-sky-500/20",
  fundraising: "bg-orange-500/10 text-orange-600 border-orange-500/20",
};

export function EventsView({ initialEvents }: EventsViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("date");

  const categories = useMemo(
    () => [...new Set(initialEvents.map(({ event }) => event.event_type).filter(Boolean))],
    [initialEvents]
  );

  const filteredEvents = useMemo(() => {
    const query = deferredSearchQuery.trim().toLowerCase();
    let result = [...initialEvents];

    if (query) {
      result = result.filter(({ event, mosque }) =>
        [event.title, event.description, event.location, mosque?.name]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(query))
      );
    }

    if (selectedCategory !== "all") {
      result = result.filter(({ event }) => event.event_type === selectedCategory);
    }

    if (sortBy === "title") {
      result.sort((left, right) => left.event.title.localeCompare(right.event.title));
    } else {
      result.sort(
        (left, right) =>
          new Date(left.event.start_date).getTime() - new Date(right.event.start_date).getTime()
      );
    }

    return result;
  }, [deferredSearchQuery, initialEvents, selectedCategory, sortBy]);

  const groupedEvents = useMemo(() => {
    const grouped = new Map<string, PublicEventListItem[]>();

    filteredEvents.forEach((item) => {
      const dateKey = item.event.start_date.slice(0, 10);
      const existing = grouped.get(dateKey) ?? [];
      existing.push(item);
      grouped.set(dateKey, existing);
    });

    return [...grouped.entries()];
  }, [filteredEvents]);

  return (
    <div className="space-y-6">
      <Card className="border-border/50 shadow-sm">
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative max-w-xl flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search event titles, mosques, locations..."
                className="rounded-xl border-border/60 pl-10 pr-10"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[170px] rounded-xl border-border/60">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {formatLabel(category)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[130px] rounded-xl border-border/60">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="title">Title</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center rounded-xl border border-border/60 bg-muted/30 p-1">
                <Button
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-9 w-9 rounded-lg"
                  onClick={() => setViewMode("grid")}
                >
                  <CalendarDays className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-9 w-9 rounded-lg"
                  onClick={() => setViewMode("list")}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="rounded-full px-3 py-1">
              {filteredEvents.length} live events
            </Badge>
            {selectedCategory !== "all" ? (
              <Badge variant="outline" className="rounded-full px-3 py-1">
                Category: {formatLabel(selectedCategory)}
              </Badge>
            ) : null}
            {searchQuery.trim() ? (
              <Badge variant="outline" className="rounded-full px-3 py-1">
                Search: {searchQuery.trim()}
              </Badge>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {filteredEvents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">No events found</h3>
            <p className="mt-2 text-muted-foreground">Try adjusting your search or category filter.</p>
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="space-y-8">
          {groupedEvents.map(([date, events]) => (
            <section key={date}>
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                <Calendar className="h-5 w-5 text-primary" />
                {formatDate(date)}
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {events.map((item) => (
                  <EventCard key={item.event.id} item={item} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredEvents.map((item) => (
            <EventListItem key={item.event.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function EventCard({ item }: { item: PublicEventListItem }) {
  const { event, mosque } = item;

  return (
    <Link href={`/events/${event.id}`}>
      <Card className="group h-full overflow-hidden border-border/50 transition-all hover:border-primary/30 hover:shadow-lg">
        <div className={cn("h-2", categoryColors[event.event_type] ?? categoryColors.general)} />
        <CardContent className="p-5">
          <div className="mb-3 flex items-start justify-between gap-2">
            <Badge variant="outline" className={categoryColors[event.event_type] ?? categoryColors.general}>
              {formatLabel(event.event_type)}
            </Badge>
            {event.is_recurring ? <Badge variant="secondary">Recurring</Badge> : null}
          </div>

          <h3 className="mb-2 line-clamp-2 font-semibold text-foreground transition-colors group-hover:text-primary">
            {event.title}
          </h3>
          <p className="mb-4 line-clamp-3 text-sm text-muted-foreground">
            {event.description || "Event details will be shared soon."}
          </p>

          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 flex-shrink-0" />
              <span>{formatTime(event.start_date)}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{mosque?.name || event.location || "Mosque event"}</span>
            </div>
            {event.max_attendees ? (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 flex-shrink-0" />
                <span>Up to {event.max_attendees} attendees</span>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function EventListItem({ item }: { item: PublicEventListItem }) {
  const { event, mosque } = item;

  return (
    <Link href={`/events/${event.id}`}>
      <Card className="group overflow-hidden border-border/50 transition-all hover:border-primary/30">
        <CardContent className="flex items-center gap-4 p-4">
          <div className="rounded-2xl bg-primary/10 px-4 py-3 text-center text-primary">
            <p className="text-2xl font-black leading-none">{new Date(event.start_date).getDate()}</p>
            <p className="mt-1 text-xs font-bold uppercase">
              {new Date(event.start_date).toLocaleDateString("en-US", { month: "short" })}
            </p>
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={categoryColors[event.event_type] ?? categoryColors.general}>
                {formatLabel(event.event_type)}
              </Badge>
              {event.is_recurring ? <Badge variant="secondary">Recurring</Badge> : null}
            </div>

            <h3 className="font-semibold text-foreground transition-colors group-hover:text-primary">
              {event.title}
            </h3>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {formatTime(event.start_date)}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {mosque?.name || event.location || "Mosque event"}
              </span>
            </div>
          </div>

          <ChevronRight className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-primary" />
        </CardContent>
      </Card>
    </Link>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
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
