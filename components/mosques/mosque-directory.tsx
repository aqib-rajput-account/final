"use client"

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { 
  Search, 
  MapPin, 
  Filter, 
  Grid3X3, 
  List, 
  CheckCircle,
  Users,
  Phone,
  Globe,
  ChevronRight,
  Navigation,
  Loader2,
  LocateFixed,
  AlertCircle
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { mockMosques, getNearbyMosques } from '@/lib/data'
import type { Mosque } from '@/lib/types'

const allFacilities = [
  'Prayer Hall',
  'Wudu Area',
  'Library',
  'Parking',
  'Wheelchair Accessible',
  'Sisters Section',
  'Classroom',
  'Community Kitchen',
  'Playground',
  'Gym',
  'Funeral Services',
  'Conference Room',
  'Food Pantry',
  'Tutoring Center',
  'School',
  'Sports Field',
]

interface NearbyMosque extends Mosque {
  distance: number
}

export function MosqueDirectory() {
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortBy, setSortBy] = useState('name')
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>([])
  const [mosques, setMosques] = useState<Mosque[]>([])
  const [loading, setLoading] = useState(true)

  // Nearby state
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationLoading, setLocationLoading] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [radius, setRadius] = useState(10)
  const [nearbyMosques, setNearbyMosques] = useState<NearbyMosque[]>([])

  useEffect(() => {
    const fetchMosques = async () => {
      try {
        const res = await fetch("/api/mosques?limit=100")
        const data = await res.json()
        if (data.mosques) {
          // Public directory only shows verified mosques
          setMosques(data.mosques.filter((m: any) => m.is_verified))
        }
      } catch (error) {
        console.error("Failed to fetch mosques:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchMosques()
  }, [])

  const filteredMosques = useMemo(() => {
    let result = [...mosques]

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (mosque) =>
          mosque.name.toLowerCase().includes(query) ||
          mosque.city.toLowerCase().includes(query) ||
          mosque.state.toLowerCase().includes(query) ||
          mosque.address.toLowerCase().includes(query)
      )
    }

    // Facilities filter
    if (selectedFacilities.length > 0) {
      result = result.filter((mosque) =>
        selectedFacilities.every((facility) =>
          mosque.facilities?.includes(facility)
        )
      )
    }

    // Sort
    switch (sortBy) {
      case 'name':
        result.sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'capacity':
        result.sort((a, b) => (b.capacity || 0) - (a.capacity || 0))
        break
      case 'established':
        result.sort((a, b) => (a.establishedYear || 0) - (b.establishedYear || 0))
        break
    }

    return result
  }, [mosques, searchQuery, sortBy, selectedFacilities])

  const toggleFacility = (facility: string) => {
    setSelectedFacilities((prev) =>
      prev.includes(facility)
        ? prev.filter((f) => f !== facility)
        : [...prev, facility]
    )
  }

  const requestLocation = () => {
    setLocationLoading(true)
    setLocationError(null)

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser')
      setLocationLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }
        setLocation(coords)
        const nearby = getNearbyMosques(coords.lat, coords.lng, radius)
        setNearbyMosques(nearby)
        setLocationLoading(false)
      },
      (err) => {
        let message = 'Unable to retrieve your location'
        if (err.code === err.PERMISSION_DENIED) {
          message = 'Location access was denied. Please enable location permissions.'
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          message = 'Location information is unavailable.'
        } else if (err.code === err.TIMEOUT) {
          message = 'Location request timed out.'
        }
        setLocationError(message)
        setLocationLoading(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    )
  }

  useEffect(() => {
    if (location) {
      const nearby = getNearbyMosques(location.lat, location.lng, radius)
      setNearbyMosques(nearby)
    }
  }, [radius, location])

  const handleDirections = (mosque: NearbyMosque) => {
    const url = `https://www.google.com/maps/dir/?api=1&origin=${location?.lat},${location?.lng}&destination=${mosque.latitude},${mosque.longitude}`
    window.open(url, '_blank')
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-4 sm:px-0">
            <div className="relative flex-1 max-w-md group">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                type="text"
                placeholder="Search by name, city, or address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 rounded-xl border-border/60 focus:ring-primary/20 transition-all font-medium"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[140px] h-11 rounded-xl border-border/60 font-bold text-xs uppercase tracking-widest">
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
                  <Button variant="outline" className="gap-2 h-11 rounded-xl border-border/60 font-bold text-xs uppercase tracking-widest active:scale-95 transition-all">
                    <Filter className="h-4 w-4" />
                    Facilities
                    {selectedFacilities.length > 0 && (
                      <Badge variant="secondary" className="ml-1 bg-primary/10 text-primary border-transparent">
                        {selectedFacilities.length}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 max-h-80 overflow-y-auto rounded-xl border-border/40 shadow-xl">
                  {allFacilities.map((facility) => (
                    <DropdownMenuCheckboxItem
                      key={facility}
                      checked={selectedFacilities.includes(facility)}
                      onCheckedChange={() => toggleFacility(facility)}
                      className="rounded-lg m-1 font-medium"
                    >
                      {facility}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="flex items-center rounded-xl border border-border/60 p-1 bg-muted/30">
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-9 w-9 rounded-lg transition-all"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-9 w-9 rounded-lg transition-all"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Results count */}
          <p className="text-sm text-muted-foreground">
            {loading ? "Loading mosques..." : `Showing ${filteredMosques.length} mosque${filteredMosques.length !== 1 ? 's' : ''}`}
          </p>

          {/* Mosque Grid/List */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-50">
              <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
              <p className="text-sm font-medium">Fetching directory...</p>
            </div>
          ) : filteredMosques.length === 0 ? (
            <div className="py-12 text-center">
              <MapPin className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">No mosques found</h3>
              <p className="mt-2 text-muted-foreground">
                Try adjusting your search or filter criteria
              </p>
            </div>
          ) : viewMode === 'grid' ? (
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
          {!location && !locationLoading && !locationError && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="mx-auto max-w-md text-center">
                <div className="mx-auto h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                  <LocateFixed className="h-10 w-10 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">Enable Location Access</h2>
                <p className="mt-3 text-muted-foreground">
                  To find mosques near you, we need access to your location. 
                  Your location data is only used to calculate distances and is never stored.
                </p>
                <Button onClick={requestLocation} className="mt-6 gap-2" size="lg">
                  <MapPin className="h-5 w-5" />
                  Share My Location
                </Button>
              </div>
            </div>
          )}

          {locationLoading && (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="mt-4 text-muted-foreground">Finding mosques near you...</p>
            </div>
          )}

          {locationError && (
            <div className="max-w-md mx-auto py-12">
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
          )}

          {location && !locationLoading && !locationError && (
            <>
              {/* Location Info & Controls */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <MapPin className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Your Location</p>
                        <p className="text-xs text-muted-foreground">
                          {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                        </p>
                      </div>
                    </div>

                    <div className="flex-1 max-w-xs">
                      <div className="flex items-center justify-between text-sm mb-2">
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

              {/* Results Count */}
              <p className="text-sm text-muted-foreground">
                Found {nearbyMosques.length} mosque{nearbyMosques.length !== 1 ? 's' : ''} within {radius} miles
              </p>

              {/* Mosques List */}
              {nearbyMosques.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <MapPin className="h-12 w-12 mx-auto text-muted-foreground/50" />
                    <h3 className="mt-4 text-lg font-semibold">No mosques found nearby</h3>
                    <p className="mt-2 text-muted-foreground">
                      Try increasing your search radius to find mosques further away.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {nearbyMosques.map((mosque) => (
                    <Card key={mosque.id} className="group overflow-hidden border-border/50 transition-all hover:border-primary/30">
                      <CardContent className="p-0">
                        <div className="flex items-stretch">
                          {/* Distance Badge */}
                          <div className="flex flex-col items-center justify-center bg-primary/5 px-4 py-4 min-w-[80px]">
                            <span className="text-2xl font-bold text-primary">
                              {mosque.distance.toFixed(1)}
                            </span>
                            <span className="text-xs text-muted-foreground">miles</span>
                          </div>

                          {/* Mosque Info */}
                          <Link href={`/mosques/${mosque.id}`} className="flex-1 p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                                    {mosque.name}
                                  </h3>
                                  {mosque.isVerified && (
                                    <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                                  )}
                                </div>

                                <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                                  <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                                  <span className="line-clamp-1">{mosque.address}, {mosque.city}</span>
                                </div>

                                <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Users className="h-3.5 w-3.5" />
                                    {mosque.capacity}
                                  </span>
                                  {mosque.phone && (
                                    <span className="flex items-center gap-1">
                                      <Phone className="h-3.5 w-3.5" />
                                      {mosque.phone}
                                    </span>
                                  )}
                                </div>

                                <div className="mt-2 flex flex-wrap gap-1">
                                  {mosque.facilities.slice(0, 4).map((facility) => (
                                    <Badge key={facility} variant="outline" className="text-xs font-normal">
                                      {facility}
                                    </Badge>
                                  ))}
                                </div>
                              </div>

                              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                            </div>
                          </Link>

                          {/* Directions Button */}
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
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function MosqueCard({ mosque }: { mosque: Mosque }) {
  return (
    <Link href={`/mosques/${mosque.id}`}>
      <Card className="group h-full overflow-hidden border-border/40 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 rounded-[2rem] bg-card/50 backdrop-blur-sm">
        <div className="relative h-40 overflow-hidden">
           <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-primary/5 flex items-center justify-center transition-transform duration-700 group-hover:scale-110">
              <div className="relative">
                 <div className="absolute inset-0 blur-2xl bg-primary/20 rounded-full" />
                 <MosqueIcon className="relative h-20 w-20 text-primary/40" />
              </div>
           </div>
           <div className="absolute top-4 right-4">
              {mosque.isVerified && (
                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 backdrop-blur-md px-2 py-0.5 rounded-lg flex items-center gap-1 font-black text-[10px] uppercase tracking-widest">
                   <CheckCircle className="h-3 w-3" />
                   Verified
                </Badge>
              )}
           </div>
        </div>

        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <h3 className="text-xl font-black text-foreground group-hover:text-primary transition-colors line-clamp-1 tracking-tight">
              {mosque.name}
            </h3>
          </div>

          <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground font-medium">
            <div className="p-1.5 rounded-lg bg-primary/5 text-primary">
               <MapPin className="h-3.5 w-3.5" />
            </div>
            <span className="line-clamp-1">{mosque.address}, {mosque.city}</span>
          </div>

          <p className="mt-4 text-sm text-muted-foreground/80 leading-relaxed line-clamp-2 font-medium">
            {mosque.description}
          </p>

          <div className="mt-6 flex items-center justify-between border-t border-border/40 pt-4">
            <div className="flex items-center gap-1.5">
               <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
               <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Open Now</span>
            </div>
            <div className="flex items-center gap-3">
               <Badge variant="secondary" className="bg-muted/40 text-muted-foreground font-bold px-2 rounded-lg text-[10px]">
                  {mosque.capacity}+ Cap
               </Badge>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-1.5">
            {mosque.facilities.slice(0, 3).map((facility: string) => (
              <Badge key={facility} variant="outline" className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border-border/60 text-muted-foreground/70">
                {facility}
              </Badge>
            ))}
            {mosque.facilities.length > 3 && (
              <Badge variant="outline" className="text-[10px] font-bold text-primary/60 border-primary/20">
                +{mosque.facilities.length - 3}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

function MosqueListItem({ mosque }: { mosque: typeof mockMosques[0] }) {
  return (
    <Link href={`/mosques/${mosque.id}`}>
      <Card className="group overflow-hidden border-border/50 transition-all hover:border-primary/30 hover:shadow-md">
        <CardContent className="flex items-center gap-4 p-4">
          <div className="h-20 w-20 flex-shrink-0 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <MosqueIcon className="h-10 w-10 text-primary/40" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                {mosque.name}
              </h3>
              {mosque.isVerified && (
                <CheckCircle className="h-4 w-4 text-primary" />
              )}
            </div>

            <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {mosque.city}, {mosque.state}
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {mosque.capacity} capacity
              </span>
              {mosque.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" />
                  {mosque.phone}
                </span>
              )}
            </div>

            <div className="mt-2 flex flex-wrap gap-1">
              {mosque.facilities.slice(0, 5).map((facility) => (
                <Badge key={facility} variant="outline" className="text-xs font-normal">
                  {facility}
                </Badge>
              ))}
              {mosque.facilities.length > 5 && (
                <Badge variant="outline" className="text-xs font-normal">
                  +{mosque.facilities.length - 5}
                </Badge>
              )}
            </div>
          </div>

          <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </CardContent>
      </Card>
    </Link>
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

