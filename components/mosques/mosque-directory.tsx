"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle,
  ChevronRight,
  Filter,
  Grid3X3,
  List,
  LocateFixed,
  Loader2,
  MapPin,
  Navigation,
  Phone,
  Search,
  Users,
  X,
} from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Mosque } from "@/lib/database.types";

const allFacilities = [
  "Prayer Hall",
  "Wudu Area",
  "Library",
  "Parking",
  "Wheelchair Accessible",
  "Sisters Section",
  "Classroom",
  "Community Kitchen",
  "Playground",
  "Gym",
  "Funeral Services",
  "Conference Room",
  "Food Pantry",
  "Tutoring Center",
  "School",
  "Sports Field",
];

interface NearbyMosque extends Mosque {
  distance: number;
}

interface MosqueDirectoryProps {
  initialMosques?: Mosque[];
  initialSearchQuery?: string;
  initialTab?: "all" | "nearby";
}

export function MosqueDirectory({
  initialMosques = [],
  initialSearchQuery = "",
  initialTab = "all",
}: MosqueDirectoryProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<"all" | "nearby">(initialTab);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState("name");
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>([]);
  const [mosques] = useState<Mosque[]>(initialMosques);

  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [radius, setRadius] = useState(10);
  const [nearbyMosques, setNearbyMosques] = useState<NearbyMosque[]>([]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    const trimmedQuery = deferredSearchQuery.trim();

    if (trimmedQuery) {
      params.set("search", trimmedQuery);
    } else {
      params.delete("search");
    }

    if (activeTab === "nearby") {
      params.set("tab", "nearby");
    } else {
      params.delete("tab");
    }

    const nextQuery = params.toString();
    const currentQuery = searchParams.toString();

    if (nextQuery !== currentQuery) {
      startTransition(() => {
        router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
      });
    }
  }, [activeTab, deferredSearchQuery, pathname, router, searchParams]);

  const filteredMosques = useMemo(() => {
    const query = deferredSearchQuery.trim().toLowerCase();
    let result = [...mosques];

    if (query) {
      result = result.filter((mosque) =>
        [mosque.name, mosque.city, mosque.state, mosque.address]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(query))
      );
    }

    if (selectedFacilities.length > 0) {
      result = result.filter((mosque) =>
        selectedFacilities.every((facility) => mosque.facilities?.includes(facility))
      );
    }

    switch (sortBy) {
      case "capacity":
        result.sort((a, b) => (b.capacity ?? 0) - (a.capacity ?? 0));
        break;
      case "established":
        result.sort((a, b) => (a.established_year ?? 0) - (b.established_year ?? 0));
        break;
      default:
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    return result;
  }, [deferredSearchQuery, mosques, selectedFacilities, sortBy]);

  const hasActiveFilters = Boolean(searchQuery.trim()) || selectedFacilities.length > 0;

  const toggleFacility = (facility: string) => {
    setSelectedFacilities((current) =>
      current.includes(facility)
        ? current.filter((value) => value !== facility)
        : [...current, facility]
    );
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setSelectedFacilities([]);
    setSortBy("name");
  };

  const requestLocation = () => {
    setLocationLoading(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      setLocationLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        setLocation(coords);
        setNearbyMosques(getNearbyMosques(coords.lat, coords.lng, radius, mosques));
        setLocationLoading(false);
      },
      (error) => {
        let message = "Unable to retrieve your location";

        if (error.code === error.PERMISSION_DENIED) {
          message = "Location access was denied. Please enable location permissions.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          message = "Location information is unavailable.";
        } else if (error.code === error.TIMEOUT) {
          message = "Location request timed out.";
        }

        setLocationError(message);
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  useEffect(() => {
    if (location) {
      setNearbyMosques(getNearbyMosques(location.lat, location.lng, radius, mosques));
    }
  }, [location, mosques, radius]);

  const handleDirections = (mosque: NearbyMosque) => {
    const destination =
      mosque.latitude && mosque.longitude
        ? `${mosque.latitude},${mosque.longitude}`
        : encodeURIComponent([mosque.address, mosque.city, mosque.state].filter(Boolean).join(", "));
    const origin = location ? `${location.lat},${location.lng}` : undefined;
    const url = origin
      ? `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`
      : `https://www.google.com/maps/search/?api=1&query=${destination}`;

    window.open(url, "_blank");
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "all" | "nearby")}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="all" className="gap-2">
            <Grid3X3 className="h-4 w-4" />
            All Mosques
          </TabsTrigger>
          <TabsTrigger value="nearby" className="gap-2">
            <LocateFixed className="h-4 w-4" />
            Nearby
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6 space-y-6">
          <Card className="border-border/50 shadow-sm">
            <CardContent className="space-y-4 p-4 sm:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors" />
                  <Input
                    type="text"
                    placeholder="Search by mosque name, city, or address..."
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className="h-11 rounded-xl border-border/60 pl-10 pr-10 font-medium"
                  />
                  {searchQuery ? (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                      aria-label="Clear search"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="h-11 w-[150px] rounded-xl border-border/60 font-bold text-xs uppercase tracking-widest">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="capacity">Capacity</SelectItem>
                      <SelectItem value="established">Established</SelectItem>
                    </SelectContent>
                  </Select>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="h-11 gap-2 rounded-xl border-border/60 font-bold text-xs uppercase tracking-widest"
                      >
                        <Filter className="h-4 w-4" />
                        Facilities
                        {selectedFacilities.length > 0 ? (
                          <Badge variant="secondary" className="ml-1 bg-primary/10 text-primary">
                            {selectedFacilities.length}
                          </Badge>
                        ) : null}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="max-h-80 w-56 overflow-y-auto rounded-xl">
                      {allFacilities.map((facility) => (
                        <DropdownMenuCheckboxItem
                          key={facility}
                          checked={selectedFacilities.includes(facility)}
                          onCheckedChange={() => toggleFacility(facility)}
                          className="m-1 rounded-lg font-medium"
                        >
                          {facility}
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <div className="flex items-center rounded-xl border border-border/60 bg-muted/30 p-1">
                    <Button
                      variant={viewMode === "grid" ? "secondary" : "ghost"}
                      size="icon"
                      className="h-9 w-9 rounded-lg"
                      onClick={() => setViewMode("grid")}
                    >
                      <Grid3X3 className="h-4 w-4" />
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

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {filteredMosques.length} mosque{filteredMosques.length !== 1 ? "s" : ""} from
                  the live directory
                </p>

                {hasActiveFilters ? (
                  <Button variant="ghost" size="sm" onClick={clearAllFilters} className="w-fit gap-2">
                    <X className="h-4 w-4" />
                    Clear filters
                  </Button>
                ) : null}
              </div>

              {hasActiveFilters ? (
                <div className="flex flex-wrap gap-2">
                  {searchQuery.trim() ? (
                    <Badge variant="secondary" className="gap-1 rounded-full px-3 py-1">
                      Search: {searchQuery.trim()}
                    </Badge>
                  ) : null}
                  {selectedFacilities.map((facility) => (
                    <Badge key={facility} variant="outline" className="gap-1 rounded-full px-3 py-1">
                      {facility}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>

          {filteredMosques.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <MapPin className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-semibold">No mosques found</h3>
                <p className="mt-2 text-muted-foreground">
                  Try refining your search or removing a few filters.
                </p>
              </CardContent>
            </Card>
          ) : viewMode === "grid" ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredMosques.map((mosque) => (
                <MosqueCard key={mosque.id} mosque={mosque} />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredMosques.map((mosque) => (
                <MosqueListItem key={mosque.id} mosque={mosque} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="nearby" className="mt-6 space-y-6">
          {!location && !locationLoading && !locationError ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="mx-auto max-w-md text-center">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                  <LocateFixed className="h-10 w-10 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">Enable Location Access</h2>
                <p className="mt-3 text-muted-foreground">
                  To find mosques near you, we need access to your location. Your position is only used
                  to calculate distance and is never stored.
                </p>
                <Button onClick={requestLocation} className="mt-6 gap-2" size="lg">
                  <MapPin className="h-5 w-5" />
                  Share My Location
                </Button>
              </div>
            </div>
          ) : null}

          {locationLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="mt-4 text-muted-foreground">Finding mosques near you...</p>
            </div>
          ) : null}

          {locationError ? (
            <div className="mx-auto max-w-md py-12">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{locationError}</AlertDescription>
              </Alert>
              <div className="mt-6 text-center">
                <Button onClick={requestLocation} variant="outline" className="gap-2">
                  <LocateFixed className="h-4 w-4" />
                  Try Again
                </Button>
              </div>
            </div>
          ) : null}

          {location && !locationLoading && !locationError ? (
            <>
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <MapPin className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Your Location</p>
                        <p className="text-xs text-muted-foreground">
                          {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                        </p>
                      </div>
                    </div>

                    <div className="max-w-xs flex-1">
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Search Radius</span>
                        <span className="font-medium">{radius} miles</span>
                      </div>
                      <Slider
                        value={[radius]}
                        onValueChange={([value]) => setRadius(value)}
                        min={1}
                        max={50}
                        step={1}
                        className="w-full"
                      />
                    </div>

                    <Button onClick={requestLocation} variant="outline" size="sm" className="gap-2">
                      <LocateFixed className="h-4 w-4" />
                      Update Location
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <p className="text-sm text-muted-foreground">
                Found {nearbyMosques.length} mosque{nearbyMosques.length !== 1 ? "s" : ""} within {radius}{" "}
                miles
              </p>

              {nearbyMosques.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <MapPin className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <h3 className="mt-4 text-lg font-semibold">No mosques found nearby</h3>
                    <p className="mt-2 text-muted-foreground">
                      Try increasing your search radius to widen the search area.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {nearbyMosques.map((mosque) => (
                    <Card
                      key={mosque.id}
                      className="group overflow-hidden border-border/50 transition-all hover:border-primary/30"
                    >
                      <CardContent className="p-0">
                        <div className="flex items-stretch">
                          <div className="flex min-w-[80px] flex-col items-center justify-center bg-primary/5 px-4 py-4">
                            <span className="text-2xl font-bold text-primary">
                              {mosque.distance.toFixed(1)}
                            </span>
                            <span className="text-xs text-muted-foreground">miles</span>
                          </div>

                          <Link href={`/mosques/${mosque.id}`} className="flex-1 p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold text-foreground transition-colors group-hover:text-primary">
                                    {mosque.name}
                                  </h3>
                                  {mosque.is_verified ? (
                                    <CheckCircle className="h-4 w-4 flex-shrink-0 text-primary" />
                                  ) : null}
                                </div>

                                <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                                  <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                                  <span className="line-clamp-1">
                                    {mosque.address}, {mosque.city}
                                  </span>
                                </div>

                                <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Users className="h-3.5 w-3.5" />
                                    {mosque.capacity ?? 0}
                                  </span>
                                  {mosque.phone ? (
                                    <span className="flex items-center gap-1">
                                      <Phone className="h-3.5 w-3.5" />
                                      {mosque.phone}
                                    </span>
                                  ) : null}
                                </div>

                                <div className="mt-2 flex flex-wrap gap-1">
                                  {(mosque.facilities ?? []).slice(0, 4).map((facility) => (
                                    <Badge key={facility} variant="outline" className="text-xs font-normal">
                                      {facility}
                                    </Badge>
                                  ))}
                                </div>
                              </div>

                              <ChevronRight className="h-5 w-5 flex-shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                            </div>
                          </Link>

                          <div className="flex items-center pr-4">
                            <Button
                              onClick={() => handleDirections(mosque)}
                              variant="outline"
                              size="sm"
                              className="gap-2"
                            >
                              <Navigation className="h-4 w-4" />
                              <span className="hidden sm:inline">Directions</span>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MosqueCard({ mosque }: { mosque: Mosque }) {
  return (
    <Link href={`/mosques/${mosque.id}`}>
      <Card className="group h-full overflow-hidden rounded-[2rem] border-border/40 bg-card/50 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
        <div className="relative h-40 overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/30 to-primary/5 transition-transform duration-700 group-hover:scale-110">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-primary/20 blur-2xl" />
              <MosqueIcon className="relative h-20 w-20 text-primary/40" />
            </div>
          </div>
          {mosque.is_verified ? (
            <div className="absolute right-4 top-4">
              <Badge className="flex items-center gap-1 rounded-lg border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-emerald-600">
                <CheckCircle className="h-3 w-3" />
                Verified
              </Badge>
            </div>
          ) : null}
        </div>

        <CardContent className="p-6">
          <h3 className="line-clamp-1 text-xl font-black tracking-tight text-foreground transition-colors group-hover:text-primary">
            {mosque.name}
          </h3>

          <div className="mt-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <div className="rounded-lg bg-primary/5 p-1.5 text-primary">
              <MapPin className="h-3.5 w-3.5" />
            </div>
            <span className="line-clamp-1">
              {mosque.address}, {mosque.city}
            </span>
          </div>

          <p className="mt-4 line-clamp-2 text-sm font-medium leading-relaxed text-muted-foreground/80">
            {mosque.description}
          </p>

          <div className="mt-6 flex items-center justify-between border-t border-border/40 pt-4">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                Open Now
              </span>
            </div>
            <Badge variant="secondary" className="rounded-lg bg-muted/40 px-2 text-[10px] font-bold">
              {(mosque.capacity ?? 0).toLocaleString()} Cap
            </Badge>
          </div>

          <div className="mt-4 flex flex-wrap gap-1.5">
            {(mosque.facilities ?? []).slice(0, 3).map((facility) => (
              <Badge
                key={facility}
                variant="outline"
                className="rounded-md border-border/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70"
              >
                {facility}
              </Badge>
            ))}
            {(mosque.facilities ?? []).length > 3 ? (
              <Badge variant="outline" className="border-primary/20 text-[10px] font-bold text-primary/60">
                +{(mosque.facilities ?? []).length - 3}
              </Badge>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function MosqueListItem({ mosque }: { mosque: Mosque }) {
  return (
    <Link href={`/mosques/${mosque.id}`}>
      <Card className="group overflow-hidden border-border/50 transition-all hover:border-primary/30 hover:shadow-md">
        <CardContent className="flex items-center gap-4 p-4">
          <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5">
            <MosqueIcon className="h-10 w-10 text-primary/40" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground transition-colors group-hover:text-primary">
                {mosque.name}
              </h3>
              {mosque.is_verified ? <CheckCircle className="h-4 w-4 text-primary" /> : null}
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {mosque.city}, {mosque.state}
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {mosque.capacity ?? 0} capacity
              </span>
              {mosque.phone ? (
                <span className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" />
                  {mosque.phone}
                </span>
              ) : null}
            </div>

            <div className="mt-2 flex flex-wrap gap-1">
              {(mosque.facilities ?? []).slice(0, 5).map((facility) => (
                <Badge key={facility} variant="outline" className="text-xs font-normal">
                  {facility}
                </Badge>
              ))}
              {(mosque.facilities ?? []).length > 5 ? (
                <Badge variant="outline" className="text-xs font-normal">
                  +{(mosque.facilities ?? []).length - 5}
                </Badge>
              ) : null}
            </div>
          </div>

          <ChevronRight className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-primary" />
        </CardContent>
      </Card>
    </Link>
  );
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

function getNearbyMosques(userLat: number, userLng: number, radiusMiles: number, mosques: Mosque[]) {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const earthRadiusInMiles = 3958.8;
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(lat1)) *
        Math.cos(toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadiusInMiles * c;
  };

  return mosques
    .filter((mosque) => mosque.latitude && mosque.longitude)
    .map((mosque) => ({
      ...mosque,
      distance: calculateDistance(userLat, userLng, mosque.latitude as number, mosque.longitude as number),
    }))
    .filter((mosque) => mosque.distance <= radiusMiles)
    .sort((a, b) => a.distance - b.distance);
}
