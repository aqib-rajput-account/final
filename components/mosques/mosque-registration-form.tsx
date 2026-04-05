"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Loader2, Building2, MapPin, Globe, Phone, Mail, Users, Calendar, Info, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

const COMMON_FACILITIES = [
  "Prayer Hall", "Wudu Area", "Library", "Parking", 
  "Wheelchair Accessible", "Sisters Section", "Classroom", 
  "Community Kitchen", "Gym", "Funeral Services", "Playground"
]

export function MosqueRegistrationForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>([])

  const toggleFacility = (facility: string) => {
    setSelectedFacilities(prev => 
      prev.includes(facility) 
        ? prev.filter(f => f !== facility) 
        : [...prev, facility]
    )
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const data = {
      name: formData.get("name"),
      address: formData.get("address"),
      city: formData.get("city"),
      state: formData.get("state"),
      zip_code: formData.get("zip_code"),
      country: "USA",
      phone: formData.get("phone"),
      email: formData.get("email"),
      website: formData.get("website") || null,
      description: formData.get("description"),
      capacity: parseInt(formData.get("capacity") as string) || null,
      established_year: parseInt(formData.get("established_year") as string) || null,
      facilities: selectedFacilities,
    }

    try {
      const res = await fetch("/api/mosques", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to register mosque")
      }

      setSubmitted(true)
      toast.success("Registration submitted successfully!")
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <Card className="max-w-2xl mx-auto border-primary/20 bg-primary/5">
        <CardContent className="pt-12 pb-12 flex flex-col items-center text-center">
          <div className="h-20 w-20 rounded-full bg-primary/20 flex items-center justify-center mb-6 animate-in zoom-in duration-500">
            <Check className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-3xl mb-4">Registration Received!</CardTitle>
          <CardDescription className="text-lg max-w-md mx-auto">
            Your mosque registration has been submitted and is currently <strong>pending approval</strong>. 
            Once our administrative team or shura members verify the details, it will be listed in our public directory.
          </CardDescription>
          <div className="mt-10 flex gap-4">
            <Button onClick={() => router.push("/mosques")} variant="outline">
              Browse Directory
            </Button>
            <Button onClick={() => router.push("/")} className="gap-2">
              Return Home <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="max-w-4xl mx-auto pb-12 px-4 sm:px-0">
      <form onSubmit={onSubmit} className="space-y-4 md:space-y-6">
        {/* Step 1: Basic Identity & Contact (Balanced Columns) */}
        <div className="grid gap-4 md:gap-6 md:grid-cols-2 text-base sm:text-sm leading-relaxed">
          {/* Card 1: Mosque Identity */}
          <Card className="border-border/50 shadow-sm hover:shadow-md transition-all duration-300">
            <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4 bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary shadow-inner">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base sm:text-lg">Mosque Identity</CardTitle>
                  <CardDescription className="text-[10px] sm:text-xs">Primary identification details</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-4 sm:pt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">Mosque Name</Label>
                <Input id="name" name="name" placeholder="e.g. Al-Noor Islamic Center" required className="h-11 sm:h-10 text-base sm:text-sm bg-muted/20 border-border/40 focus:bg-background transition-colors" />
              </div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label htmlFor="capacity" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">Capacity</Label>
                  <div className="relative">
                    <Users className="absolute left-3 top-3.5 sm:top-3 h-4 w-4 text-muted-foreground/60" />
                    <Input id="capacity" name="capacity" type="number" className="h-11 sm:h-10 pl-9 text-base sm:text-sm bg-muted/20 border-border/40" placeholder="500" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="established_year" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">Established</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3.5 sm:top-3 h-4 w-4 text-muted-foreground/60" />
                    <Input id="established_year" name="established_year" type="number" className="h-11 sm:h-10 pl-9 text-base sm:text-sm bg-muted/20 border-border/40" placeholder="1995" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Contact & Online Presence */}
          <Card className="border-border/50 shadow-sm hover:shadow-md transition-all duration-300">
            <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4 bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary shadow-inner">
                  <Globe className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base sm:text-lg">Contact Details</CardTitle>
                  <CardDescription className="text-[10px] sm:text-xs">How to reach the mosque</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-4 sm:pt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3.5 sm:top-3 h-4 w-4 text-muted-foreground/60" />
                  <Input id="phone" name="phone" type="tel" className="h-11 sm:h-10 pl-9 text-base sm:text-sm bg-muted/20 border-border/40" placeholder="+1 (212) 555-0100" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">Official Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 sm:top-3 h-4 w-4 text-muted-foreground/60" />
                  <Input id="email" name="email" type="email" className="h-11 sm:h-10 pl-9 text-base sm:text-sm bg-muted/20 border-border/40" placeholder="info@mosque.org" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="website" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">Website (Optional)</Label>
                <Input id="website" name="website" type="url" placeholder="https://www.mosque.org" className="h-11 sm:h-10 text-base sm:text-sm bg-muted/20 border-border/40" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Step 2: Location Details (Full-Width Card) */}
        <Card className="border-border/50 shadow-sm hover:shadow-md transition-all duration-300">
          <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4 bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary shadow-inner">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg">Location Details</CardTitle>
                <CardDescription className="text-[10px] sm:text-xs">Physical address and geography</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-4 sm:pt-6">
            <div className="grid gap-4 sm:gap-6 md:grid-cols-3">
              <div className="md:col-span-3 space-y-2">
                <Label htmlFor="address" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">Street Address</Label>
                <Input id="address" name="address" placeholder="123 Peace Street" required className="h-11 sm:h-10 text-base sm:text-sm bg-muted/20 border-border/40" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">City</Label>
                <Input id="city" name="city" placeholder="New York" required className="h-11 sm:h-10 text-base sm:text-sm bg-muted/20 border-border/40" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">State</Label>
                <Input id="state" name="state" placeholder="New York" required className="h-11 sm:h-10 text-base sm:text-sm bg-muted/20 border-border/40" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zip_code" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">Zip Code</Label>
                <Input id="zip_code" name="zip_code" placeholder="10001" required className="h-11 sm:h-10 text-base sm:text-sm bg-muted/20 border-border/40" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 3: About (Full-Width Card) */}
        <Card className="border-border/50 shadow-sm hover:shadow-md transition-all duration-300">
          <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4 bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary shadow-inner">
                <Info className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg">About the Mosque</CardTitle>
                <CardDescription className="text-[10px] sm:text-xs">Share your story and mission</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-4 sm:pt-6">
            <div className="space-y-2">
              <Label htmlFor="description" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">Description</Label>
              <Textarea 
                id="description" 
                name="description" 
                placeholder="Tell us about your community, history, and mission..." 
                className="min-h-[140px] sm:min-h-[150px] text-base sm:text-sm bg-muted/20 border-border/40 focus:bg-background transition-all"
              />
            </div>
          </CardContent>
        </Card>

        {/* Step 4: Facilities (Full-Width Card) */}
        <Card className="border-border/50 shadow-sm hover:shadow-md transition-all duration-300">
          <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4 bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary shadow-inner">
                <Check className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg">Facilities & Services</CardTitle>
                <CardDescription className="text-[10px] sm:text-xs">Select available amenities</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-4 sm:pt-6">
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {COMMON_FACILITIES.map((facility) => (
                <button
                  key={facility}
                  type="button"
                  onClick={() => toggleFacility(facility)}
                  className={cn(
                    "px-4 py-3 sm:py-2 rounded-xl text-sm sm:text-xs font-medium border transition-all duration-200 flex items-center gap-2 touch-manipulation",
                    selectedFacilities.includes(facility)
                      ? "bg-primary text-primary-foreground border-primary shadow-lg scale-105"
                      : "bg-muted/50 text-muted-foreground border-border/40 hover:bg-muted hover:border-border"
                  )}
                >
                  <div className={cn(
                    "h-2 w-2 rounded-full transition-all",
                    selectedFacilities.includes(facility) ? "bg-white scale-125" : "bg-muted-foreground/30"
                  )} />
                  {facility}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Submission Section */}
        <div className="flex flex-col items-center justify-center pt-8 md:pt-10 pb-6 space-y-4 px-2">
          <div className="p-4 sm:p-6 rounded-2xl bg-primary/5 border border-primary/10 max-w-lg text-center backdrop-blur-sm">
            <p className="text-[10px] sm:text-xs text-muted-foreground/80 leading-relaxed font-medium">
              By submitting this registration, you confirm that you have the authority to represent 
              this mosque and that all information provided is accurate and truthful.
            </p>
          </div>
          <Button 
            type="submit" 
            size="lg" 
            className="w-full sm:min-w-[280px] h-14 text-lg font-bold rounded-2xl shadow-xl hover:shadow-primary/20 transition-all border-b-4 border-primary-foreground/20 active:border-b-0 active:translate-y-1" 
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Processing...
              </>
            ) : (
              "Submit Registration"
            )}
          </Button>
          <p className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.2em] opacity-60">
            Secure Verification Process
          </p>
        </div>
      </form>
    </div>
  )
}
