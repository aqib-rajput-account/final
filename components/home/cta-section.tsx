import Link from 'next/link'
import { ArrowRight, Building2, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function CTASection() {
  return (
    <section className="relative overflow-hidden bg-primary py-16 lg:py-24">
      {/* Pattern overlay */}
      <div className="absolute inset-0 opacity-10">
        <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="cta-pattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
              <circle cx="20" cy="20" r="1" fill="currentColor" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#cta-pattern)" />
        </svg>
      </div>

      <div className="relative mx-auto max-w-7xl px-4 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl">
            Ready to Connect Your Mosque?
          </h2>
          <p className="mt-4 text-lg text-primary-foreground/80">
            Join MosqueConnect today and bring your community closer together. 
            Manage your mosque, share events, and engage with your congregation.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/mosques/register">
              <Button 
                size="lg" 
                variant="secondary" 
                className="gap-2 text-base"
              >
                <Building2 className="h-5 w-5" />
                Register Your Mosque
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/mosques">
              <Button 
                size="lg" 
                variant="outline" 
                className="gap-2 text-base border-primary-foreground/20 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              >
                <Users className="h-5 w-5" />
                Explore Mosques
              </Button>
            </Link>
          </div>

          <p className="mt-8 text-sm text-primary-foreground/60">
            Free to use. No credit card required. Setup takes less than 5 minutes.
          </p>
        </div>
      </div>
    </section>
  )
}
