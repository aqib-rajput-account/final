"use client"

import { useState, useEffect } from 'react'
import { 
  Clock, 
  MapPin, 
  Calendar,
  Sun,
  Sunrise,
  Sunset,
  Moon,
  ChevronLeft,
  ChevronRight,
  LocateFixed,
  Loader2,
  RefreshCw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { mockMosques } from '@/lib/data'

interface PrayerTime {
  name: string
  arabicName: string
  time: string
  icon: React.ElementType
}

const calculationMethods = [
  { value: '2', label: 'Islamic Society of North America (ISNA)' },
  { value: '1', label: 'Muslim World League' },
  { value: '3', label: 'Egyptian General Authority' },
  { value: '4', label: 'Umm Al-Qura University, Makkah' },
  { value: '5', label: 'University of Islamic Sciences, Karachi' },
]

export function PrayerTimesView() {
  const [mounted, setMounted] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [prayerTimes, setPrayerTimes] = useState<PrayerTime[]>([])
  const [loading, setLoading] = useState(false)
  const [location, setLocation] = useState<{ lat: number; lng: number; city: string } | null>(null)
  const [method, setMethod] = useState('2')
  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  const [hijriDate, setHijriDate] = useState('')

  // Initialize on mount to avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
    setSelectedDate(new Date())
    setCurrentTime(new Date())
  }, [])

  // Update current time every second
  useEffect(() => {
    if (!mounted) return
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [mounted])

  const fetchPrayerTimes = async (lat: number, lng: number, date: Date | null) => {
    if (!date) return
    setLoading(true)
    try {
      const dateStr = `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`
      const response = await fetch(
        `https://api.aladhan.com/v1/timings/${dateStr}?latitude=${lat}&longitude=${lng}&method=${method}`
      )
      const data = await response.json()
      
      if (data.code === 200) {
        const timings = data.data.timings
        setPrayerTimes([
          { name: 'Fajr', arabicName: 'الفجر', time: timings.Fajr, icon: Sunrise },
          { name: 'Sunrise', arabicName: 'الشروق', time: timings.Sunrise, icon: Sun },
          { name: 'Dhuhr', arabicName: 'الظهر', time: timings.Dhuhr, icon: Sun },
          { name: 'Asr', arabicName: 'العصر', time: timings.Asr, icon: Sun },
          { name: 'Maghrib', arabicName: 'المغرب', time: timings.Maghrib, icon: Sunset },
          { name: 'Isha', arabicName: 'العشاء', time: timings.Isha, icon: Moon },
        ])
        
        const hijri = data.data.date.hijri
        setHijriDate(`${hijri.day} ${hijri.month.en} ${hijri.year} AH`)
      }
    } catch (error) {
      console.error('Failed to fetch prayer times:', error)
      // Use fallback times
      setPrayerTimes([
        { name: 'Fajr', arabicName: 'الفجر', time: '05:15', icon: Sunrise },
        { name: 'Sunrise', arabicName: 'الشروق', time: '06:30', icon: Sun },
        { name: 'Dhuhr', arabicName: 'الظهر', time: '12:30', icon: Sun },
        { name: 'Asr', arabicName: 'العصر', time: '15:45', icon: Sun },
        { name: 'Maghrib', arabicName: 'المغرب', time: '18:30', icon: Sunset },
        { name: 'Isha', arabicName: 'العشاء', time: '20:00', icon: Moon },
      ])
    }
    setLoading(false)
  }

  const requestLocation = () => {
    if (!navigator.geolocation) return

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          city: 'Your Location',
        }
        
        // Try to get city name
        try {
          const response = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${coords.lat}&longitude=${coords.lng}&localityLanguage=en`
          )
          const data = await response.json()
          coords.city = data.city || data.locality || 'Your Location'
        } catch {
          // Keep default
        }
        
        setLocation(coords)
        fetchPrayerTimes(coords.lat, coords.lng, selectedDate)
      },
      () => {
        // Use default location (New York)
        const defaultLocation = { lat: 40.7128, lng: -74.0060, city: 'New York, NY' }
        setLocation(defaultLocation)
        fetchPrayerTimes(defaultLocation.lat, defaultLocation.lng, selectedDate)
      }
    )
  }

  useEffect(() => {
    if (mounted) {
      requestLocation()
    }
  }, [mounted])

  useEffect(() => {
    if (location) {
      fetchPrayerTimes(location.lat, location.lng, selectedDate)
    }
  }, [selectedDate, method])

  const changeDate = (days: number) => {
    if (!selectedDate) return
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + days)
    setSelectedDate(newDate)
  }

  const getCurrentPrayer = (): string | null => {
    if (prayerTimes.length === 0 || !currentTime) return null
    
    const now = currentTime.getHours() * 60 + currentTime.getMinutes()
    
    for (let i = prayerTimes.length - 1; i >= 0; i--) {
      const [hours, mins] = prayerTimes[i].time.split(':').map(Number)
      const prayerMinutes = hours * 60 + mins
      
      if (now >= prayerMinutes) {
        return prayerTimes[i].name
      }
    }
    
    return prayerTimes[prayerTimes.length - 1].name
  }

  const getNextPrayer = (): { name: string; time: string; remaining: string } | null => {
    if (prayerTimes.length === 0 || !currentTime) return null
    
    const now = currentTime.getHours() * 60 + currentTime.getMinutes()
    
    for (const prayer of prayerTimes) {
      if (prayer.name === 'Sunrise') continue
      
      const [hours, mins] = prayer.time.split(':').map(Number)
      const prayerMinutes = hours * 60 + mins
      
      if (now < prayerMinutes) {
        const diff = prayerMinutes - now
        const h = Math.floor(diff / 60)
        const m = diff % 60
        const remaining = h > 0 ? `${h}h ${m}m` : `${m}m`
        return { name: prayer.name, time: prayer.time, remaining }
      }
    }
    
    // Next day Fajr
    const fajr = prayerTimes[0]
    return { name: fajr.name, time: fajr.time, remaining: 'Tomorrow' }
  }

  const currentPrayer = getCurrentPrayer()
  const nextPrayer = getNextPrayer()

  return (
    <div className="space-y-6">
      {/* Current Time & Location */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-primary/10 to-transparent">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Current Time</p>
                <p className="text-2xl font-bold tabular-nums">
                  {currentTime ? currentTime.toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    second: '2-digit'
                  }) : '--:--:--'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <MapPin className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">Location</p>
                <p className="font-semibold truncate">{location?.city || 'Loading...'}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={requestLocation}>
                <LocateFixed className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {nextPrayer && (
          <Card className="bg-gradient-to-br from-accent/20 to-transparent">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-accent/20 flex items-center justify-center">
                  <Sun className="h-6 w-6 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Next Prayer</p>
                  <p className="font-semibold">{nextPrayer.name} at {nextPrayer.time}</p>
                  <p className="text-xs text-muted-foreground">in {nextPrayer.remaining}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {hijriDate && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Hijri Date</p>
                  <p className="font-semibold">{hijriDate}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Date Navigation & Settings */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => changeDate(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="min-w-[200px] text-center">
                <p className="font-semibold">
                  {selectedDate ? selectedDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  }) : 'Loading...'}
                </p>
              </div>
              <Button variant="outline" size="icon" onClick={() => changeDate(1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              {selectedDate && selectedDate.toDateString() !== new Date().toDateString() && (
                <Button variant="ghost" size="sm" onClick={() => setSelectedDate(new Date())}>
                  Today
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger className="w-[280px]">
                  <SelectValue placeholder="Calculation Method" />
                </SelectTrigger>
                <SelectContent>
                  {calculationMethods.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => location && fetchPrayerTimes(location.lat, location.lng, selectedDate)}
              >
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Prayer Times Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {prayerTimes.map((prayer) => {
            const Icon = prayer.icon
            const isCurrent = prayer.name === currentPrayer
            const isSunrise = prayer.name === 'Sunrise'
            
            return (
              <Card 
                key={prayer.name}
                className={cn(
                  "transition-all",
                  isCurrent && !isSunrise && "border-primary ring-2 ring-primary/20",
                  isSunrise && "opacity-60"
                )}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "h-14 w-14 rounded-xl flex items-center justify-center",
                        isCurrent && !isSunrise ? "bg-primary text-primary-foreground" : "bg-muted"
                      )}>
                        <Icon className="h-7 w-7" />
                      </div>
                      <div>
                        <h3 className={cn(
                          "text-xl font-semibold",
                          isCurrent && !isSunrise && "text-primary"
                        )}>
                          {prayer.name}
                        </h3>
                        <p className="text-muted-foreground font-amiri text-lg">
                          {prayer.arabicName}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        "text-2xl font-bold tabular-nums",
                        isCurrent && !isSunrise && "text-primary"
                      )}>
                        {prayer.time}
                      </p>
                      {isCurrent && !isSunrise && (
                        <Badge variant="default" className="mt-1">Current</Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Mosque-specific times */}
      <Card>
        <CardHeader>
          <CardTitle>Mosque-Specific Iqama Times</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Select a mosque to view their specific Iqama times:
          </p>
          <Select>
            <SelectTrigger className="max-w-md">
              <SelectValue placeholder="Select a mosque..." />
            </SelectTrigger>
            <SelectContent>
              {mockMosques.map((mosque) => (
                <SelectItem key={mosque.id} value={mosque.id}>
                  {mosque.name} - {mosque.city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
    </div>
  )
}

