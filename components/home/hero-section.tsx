"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, MapPin, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function HeroSection() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/mosques?search=${encodeURIComponent(searchQuery)}`)
    }
  }

  const handleNearbyClick = () => {
    router.push('/nearby')
  }

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 via-background to-background">
      {/* Geometric pattern overlay */}
      <div className="absolute inset-0 opacity-[0.03]">
        <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="islamic-pattern" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M30 0L60 30L30 60L0 30Z" fill="none" stroke="currentColor" strokeWidth="1"/>
              <circle cx="30" cy="30" r="10" fill="none" stroke="currentColor" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#islamic-pattern)" />
        </svg>
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-20 sm:py-28 lg:px-8 lg:py-36">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
            <span className="mr-2">Bismillah</span>
            <span className="text-muted-foreground">Welcome to the Community</span>
          </div>

          <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Connect with Your{' '}
            <span className="text-primary">Local Mosque</span>{' '}
            Community
          </h1>

          <p className="mt-6 text-pretty text-lg leading-relaxed text-muted-foreground sm:text-xl">
            Discover mosques near you, stay updated with prayer times, join community events, 
            and strengthen your bond with the Ummah through MosqueConnect.
          </p>

          <form onSubmit={handleSearch} className="mt-10">
            <div className="mx-auto flex max-w-xl flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search mosques by name or location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-12 pl-10 pr-4 text-base"
                />
              </div>
              <Button type="submit" size="lg" className="h-12 px-8 gap-2">
                Search
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </form>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
            <Button 
              variant="outline" 
              onClick={handleNearbyClick}
              className="gap-2"
            >
              <MapPin className="h-4 w-4" />
              Find Mosques Near Me
            </Button>
            <span className="text-sm text-muted-foreground">
              or explore our <a href="/mosques" className="text-primary hover:underline">mosque directory</a>
            </span>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute -left-20 top-1/4 h-72 w-72 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -right-20 bottom-1/4 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
      </div>
    </section>
  )
}
