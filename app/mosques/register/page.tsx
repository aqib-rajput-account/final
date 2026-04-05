"use client"

import { useAuth } from "@/lib/auth"
import { Header } from "@/components/layout"
import { Footer } from "@/components/layout"
import { MosqueRegistrationForm } from "@/components/mosques/mosque-registration-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, LogIn, UserPlus, Building2, CheckCircle2 } from "lucide-react"
import Link from "next/link"

export default function MosqueRegistrationPage() {
  const { profile, loading, isSignedIn } = useAuth()

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <Header />
      
      <main className="flex-1 py-12 md:py-20 animate-in fade-in duration-700">
        <div className="container mx-auto px-4 lg:px-8">
          {/* Hero Section */}
          <div className="max-w-3xl mx-auto text-center mb-16 px-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <Building2 className="h-4 w-4" />
              Community Partnership
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-6">
              Register Your Mosque
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Help your congregation stay connected, manage daily operations, 
              and share important updates with the wider Muslim community.
            </p>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 grayscale opacity-50">
              <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
              <p className="text-sm font-medium">Verifying account...</p>
            </div>
          ) : !isSignedIn ? (
            /* Auth Wall */
            <div className="max-w-4xl mx-auto grid gap-8 md:grid-cols-2 items-center">
              <Card className="border-none shadow-xl bg-card overflow-hidden">
                <CardHeader className="bg-primary pt-8 pb-8 text-primary-foreground">
                  <CardTitle className="text-2xl">Start Fresh</CardTitle>
                  <CardDescription className="text-primary-foreground/80">
                    Create an account to begin the registration.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-8 space-y-6">
                  <div className="space-y-4">
                    {[
                      "Manage your mosque's profile",
                      "Update prayer times in real-time",
                      "Publish events and announcements",
                      "Engage with your congregation"
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                        <span className="text-sm font-medium text-muted-foreground">{item}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col gap-3 pt-4">
                    <Link href="/sign-up?redirect_url=/mosques/register" className="w-full">
                      <Button className="w-full h-12 text-lg gap-2" size="lg">
                        <UserPlus className="h-5 w-5" />
                        Sign Up Now
                      </Button>
                    </Link>
                    <Link href="/sign-in?redirect_url=/mosques/register" className="w-full">
                      <Button variant="outline" className="w-full h-12 text-lg gap-2" size="lg">
                        <LogIn className="h-5 w-5" />
                        Already have an account?
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
              
              <div className="space-y-8 px-4">
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold">Why join MosqueConnect?</h3>
                  <p className="text-muted-foreground">
                    Our platform is built specifically for mosque administrators and community leaders.
                  </p>
                </div>
                <div className="bg-primary/5 rounded-2xl p-6 border border-primary/10">
                  <blockquote className="italic text-lg text-primary/80 font-medium">
                    "Since joining MosqueConnect, our congregation has grown by 30% and communication 
                    has never been easier. It's truly a game-changer for our masjid."
                  </blockquote>
                  <p className="mt-4 font-bold text-sm">— Imam Abdullah, Al-Noor Islamic Center</p>
                </div>
              </div>
            </div>
          ) : (
            /* Registration Form */
            <div className="animate-in slide-in-from-bottom-4 duration-700">
              <MosqueRegistrationForm />
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}

