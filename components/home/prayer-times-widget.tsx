"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Clock, Sun, Sunrise, Sunset, Moon, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PrayerTime {
  name: string
  time: string
  icon: React.ElementType
  arabicName: string
}

const defaultPrayerTimes: PrayerTime[] = [
  { name: 'Fajr', time: '05:15 AM', icon: Sunrise, arabicName: 'الفجر' },
  { name: 'Sunrise', time: '06:30 AM', icon: Sun, arabicName: 'الشروق' },
  { name: 'Dhuhr', time: '12:30 PM', icon: Sun, arabicName: 'الظهر' },
  { name: 'Asr', time: '03:45 PM', icon: Sun, arabicName: 'العصر' },
  { name: 'Maghrib', time: '06:30 PM', icon: Sunset, arabicName: 'المغرب' },
  { name: 'Isha', time: '08:00 PM', icon: Moon, arabicName: 'العشاء' },
]

function getCurrentPrayer(prayers: PrayerTime[]): string {
  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  
  for (let i = prayers.length - 1; i >= 0; i--) {
    const [time, period] = prayers[i].time.split(' ')
    const [hours, mins] = time.split(':').map(Number)
    let prayerMinutes = hours * 60 + mins
    if (period === 'PM' && hours !== 12) prayerMinutes += 12 * 60
    if (period === 'AM' && hours === 12) prayerMinutes = mins
    
    if (currentMinutes >= prayerMinutes) {
      return prayers[i].name
    }
  }
  return prayers[prayers.length - 1].name
}

function getNextPrayer(prayers: PrayerTime[]): { name: string; time: string } {
  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  
  for (const prayer of prayers) {
    if (prayer.name === 'Sunrise') continue
    const [time, period] = prayer.time.split(' ')
    const [hours, mins] = time.split(':').map(Number)
    let prayerMinutes = hours * 60 + mins
    if (period === 'PM' && hours !== 12) prayerMinutes += 12 * 60
    if (period === 'AM' && hours === 12) prayerMinutes = mins
    
    if (currentMinutes < prayerMinutes) {
      return { name: prayer.name, time: prayer.time }
    }
  }
  return { name: prayers[0].name, time: prayers[0].time }
}

export function PrayerTimesWidget() {
  const [mounted, setMounted] = useState(false)
  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  const [currentPrayer, setCurrentPrayer] = useState('')
  const [nextPrayer, setNextPrayer] = useState({ name: '', time: '' })

  useEffect(() => {
    setMounted(true)
    setCurrentTime(new Date())
    
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    setCurrentPrayer(getCurrentPrayer(defaultPrayerTimes))
    setNextPrayer(getNextPrayer(defaultPrayerTimes))

    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (currentTime) {
      setCurrentPrayer(getCurrentPrayer(defaultPrayerTimes))
      setNextPrayer(getNextPrayer(defaultPrayerTimes))
    }
  }, [currentTime])

  const formatDate = (date: Date | null) => {
    if (!date) return '--'
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatTime = (date: Date | null) => {
    if (!date) return '--:--:--'
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }
  
  // Prevent hydration mismatch by not rendering time until mounted
  const displayTime = mounted ? formatTime(currentTime) : '--:--:--'
  const displayDate = mounted ? formatDate(currentTime) : '--'

  return (
    <Card className="border-border/50 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Prayer Times
          </CardTitle>
        </div>
        <div className="text-center mt-2 p-3 rounded-lg bg-background/50">
          <p className="text-2xl font-bold text-foreground tabular-nums">
            {displayTime}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {displayDate}
          </p>
        </div>
        {nextPrayer.name && (
          <div className="mt-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
            <p className="text-sm text-muted-foreground">Next Prayer</p>
            <p className="text-lg font-semibold text-primary">
              {nextPrayer.name} at {nextPrayer.time}
            </p>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {defaultPrayerTimes.map((prayer) => {
          const Icon = prayer.icon
          const isCurrent = prayer.name === currentPrayer
          const isSunrise = prayer.name === 'Sunrise'
          
          return (
            <div
              key={prayer.name}
              className={cn(
                "flex items-center justify-between rounded-lg px-3 py-2 transition-colors",
                isCurrent && !isSunrise && "bg-primary/10 border border-primary/20",
                isSunrise && "opacity-60"
              )}
            >
              <div className="flex items-center gap-3">
                <Icon className={cn(
                  "h-4 w-4",
                  isCurrent && !isSunrise ? "text-primary" : "text-muted-foreground"
                )} />
                <div>
                  <span className={cn(
                    "font-medium",
                    isCurrent && !isSunrise ? "text-primary" : "text-foreground"
                  )}>
                    {prayer.name}
                  </span>
                  <span className="text-muted-foreground text-xs ml-2 font-amiri">
                    {prayer.arabicName}
                  </span>
                </div>
              </div>
              <span className={cn(
                "font-medium tabular-nums",
                isCurrent && !isSunrise ? "text-primary" : "text-muted-foreground"
              )}>
                {prayer.time}
              </span>
            </div>
          )
        })}
        
        <Link href="/prayer-times" className="block mt-4">
          <Button variant="outline" className="w-full gap-2">
            View Full Schedule
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}
