import { Building2, Users, Calendar, MapPin } from 'lucide-react'

const stats = [
  {
    icon: Building2,
    value: '500+',
    label: 'Registered Mosques',
    description: 'Verified Islamic centers worldwide',
  },
  {
    icon: Users,
    value: '50K+',
    label: 'Community Members',
    description: 'Active users on the platform',
  },
  {
    icon: Calendar,
    value: '1,200+',
    label: 'Monthly Events',
    description: 'Lectures, classes & gatherings',
  },
  {
    icon: MapPin,
    value: '45',
    label: 'Countries Served',
    description: 'Global Muslim community reach',
  },
]

export function StatsSection() {
  return (
    <section className="py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="mx-auto max-w-2xl text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Serving the Global Ummah
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Join thousands of mosques and community members already connected through our platform
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div 
              key={stat.label}
              className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 text-center transition-all hover:border-primary/30 hover:shadow-lg"
            >
              <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-primary/5" />
              <div className="relative">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <stat.icon className="h-7 w-7" />
                </div>
                <p className="text-4xl font-bold text-foreground">{stat.value}</p>
                <p className="mt-1 font-semibold text-foreground">{stat.label}</p>
                <p className="mt-1 text-sm text-muted-foreground">{stat.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
