import { 
  MapPin, 
  Clock, 
  Calendar, 
  Users, 
  Wallet, 
  Bell,
  BookOpen,
  Shield
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

const features = [
  {
    icon: MapPin,
    title: 'Find Nearby Mosques',
    description: 'Locate mosques in your area with detailed information, directions, and facilities available.',
  },
  {
    icon: Clock,
    title: 'Accurate Prayer Times',
    description: 'Get precise prayer times based on your location or the mosque-specific schedule with Iqama times.',
  },
  {
    icon: Calendar,
    title: 'Events & Programs',
    description: 'Stay informed about lectures, classes, community events, and special programs at your mosque.',
  },
  {
    icon: Users,
    title: 'Community Building',
    description: 'Connect with fellow Muslims, read announcements, and engage with your local community.',
  },
  {
    icon: Wallet,
    title: 'Finance Transparency',
    description: 'View donation goals, expense reports, and contribute to your mosque with full transparency.',
  },
  {
    icon: Bell,
    title: 'Real-time Announcements',
    description: 'Receive important updates, schedule changes, and community news directly from mosque admins.',
  },
  {
    icon: BookOpen,
    title: 'Learning Resources',
    description: 'Access Quran classes, Islamic studies, and educational programs offered by mosques.',
  },
  {
    icon: Shield,
    title: 'Verified Mosques',
    description: 'All mosques are verified to ensure authentic and reliable information for the community.',
  },
]

export function FeaturesSection() {
  return (
    <section className="border-y border-border bg-muted/30 py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Everything Your Mosque Needs
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            A comprehensive platform designed to serve both mosque administrators 
            and community members.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <Card 
              key={feature.title} 
              className="group relative overflow-hidden border-border/50 bg-card transition-all hover:border-primary/30 hover:shadow-lg"
            >
              <CardContent className="p-6">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 font-semibold text-foreground">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
