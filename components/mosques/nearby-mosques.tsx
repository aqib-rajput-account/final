"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  MapPin, 
  Navigation, 
  Loader2, 
  AlertCircle, 
  CheckCircle,
  Users,
  Phone,
  ChevronRight,
  LocateFixed
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Slider } from '@/components/ui/slider'
import { getNearbyMosques } from '@/lib/data'
import type { Mosque } from '@/lib/types'

interface NearbyMosque extends Mosque {
  distance: number
}

export function NearbyMosques() {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [radius, setRadius] = useState(10)
  const [mosques, setMosques] = useState<NearbyMosque[]>([])

  const requestLocation = () => {
    setLoading(true)
    setError(null)

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser')
      setLoading(false)
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
        setMosques(nearby)
        setLoading(false)
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
        setError(message)
        setLoading(false)
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
      setMosques(nearby)
    }
  }, [radius, location])

  const handleDirections = (mosque: NearbyMosque) => {
    const url = `https://www.google.com/maps/dir/?api=1&origin=${location?.lat},${location?.lng}&destination=${mosque.latitude},${mosque.longitude}`
    window.open(url, '_blank')
  }

  if (!location && !loading && !error) {
    return (
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
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Finding mosques near you...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto py-12">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <div className="mt-6 text-center">
          <Button onClick={requestLocation} variant="outline" className="gap-2">
            <LocateFixed className="h-4 w-4" />
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
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
                  {location?.lat.toFixed(4)}, {location?.lng.toFixed(4)}
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
        Found {mosques.length} mosque{mosques.length !== 1 ? 's' : ''} within {radius} miles
      </p>

      {/* Mosques List */}
      {mosques.length === 0 ? (
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
          {mosques.map((mosque) => (
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
    </div>
  )
}

