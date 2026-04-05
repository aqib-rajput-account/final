"use client"

import Link from 'next/link'
import { 
  ChevronLeft,
  Mail, 
  Phone,
  Clock, 
  Calendar,
  MapPin,
  GraduationCap,
  BookOpen,
  Award,
  Briefcase,
  Languages,
  Youtube,
  Twitter,
  Facebook,
  Instagram,
  MessageSquare,
  FileText,
  Star,
  Heart,
  Users,
  Building2,
  ExternalLink
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Imam, Mosque } from '@/lib/types'

interface ImamDetailViewProps {
  imam: Imam
  mosque: Mosque
}

export function ImamDetailView({ imam, mosque }: ImamDetailViewProps) {
  const yearsAtMosque = new Date().getFullYear() - new Date(imam.appointmentDate).getFullYear()

  return (
    <div>
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-primary/10 via-primary/5 to-background">
        <div className="absolute inset-0 opacity-5">
          <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="imam-pattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                <circle cx="20" cy="20" r="1" fill="currentColor" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#imam-pattern)" />
          </svg>
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-8 lg:px-8">
          <Link 
            href={`/mosques/${mosque.id}`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to {mosque.name}
          </Link>

          <div className="flex flex-col lg:flex-row gap-8 items-start">
            {/* Profile Image */}
            <div className="flex-shrink-0">
              <Avatar className="h-48 w-48 rounded-2xl border-4 border-background shadow-xl">
                <AvatarImage src={imam.photoUrl} alt={imam.name} className="object-cover" />
                <AvatarFallback className="rounded-2xl text-4xl bg-primary/10 text-primary">
                  {imam.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Basic Info */}
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <Badge className="bg-primary/10 text-primary">{imam.title}</Badge>
                {imam.isActive && (
                  <Badge variant="outline" className="border-green-500 text-green-600">Active</Badge>
                )}
              </div>
              
              <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">{imam.name}</h1>
              
              <div className="flex flex-wrap gap-4 text-muted-foreground mb-6">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <span>{mosque.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>Serving since {new Date(imam.appointmentDate).getFullYear()} ({yearsAtMosque}+ years)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4" />
                  <span>{imam.yearsOfExperience}+ years total experience</span>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="flex flex-wrap gap-3">
                {imam.education.length > 0 && (
                  <Badge variant="secondary" className="gap-1.5 py-1.5">
                    <GraduationCap className="h-3.5 w-3.5" />
                    {imam.education.length} Degree{imam.education.length > 1 ? 's' : ''}
                  </Badge>
                )}
                <Badge variant="secondary" className="gap-1.5 py-1.5">
                  <Languages className="h-3.5 w-3.5" />
                  {imam.languages.length} Language{imam.languages.length > 1 ? 's' : ''}
                </Badge>
                {imam.certifications && imam.certifications.length > 0 && (
                  <Badge variant="secondary" className="gap-1.5 py-1.5">
                    <Award className="h-3.5 w-3.5" />
                    {imam.certifications.length} Certification{imam.certifications.length > 1 ? 's' : ''}
                  </Badge>
                )}
                {imam.publications && imam.publications.length > 0 && (
                  <Badge variant="secondary" className="gap-1.5 py-1.5">
                    <FileText className="h-3.5 w-3.5" />
                    {imam.publications.length} Publication{imam.publications.length > 1 ? 's' : ''}
                  </Badge>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 mt-6">
                {imam.contactEmail && (
                  <Button asChild>
                    <a href={`mailto:${imam.contactEmail}`}>
                      <Mail className="h-4 w-4 mr-2" />
                      Contact Imam
                    </a>
                  </Button>
                )}
                {imam.contactPhone && (
                  <Button variant="outline" asChild>
                    <a href={`tel:${imam.contactPhone}`}>
                      <Phone className="h-4 w-4 mr-2" />
                      Call
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-8">
            <Tabs defaultValue="biography" className="w-full">
              <TabsList className="w-full justify-start flex-wrap">
                <TabsTrigger value="biography">Biography</TabsTrigger>
                <TabsTrigger value="character">Character</TabsTrigger>
                <TabsTrigger value="services">Services</TabsTrigger>
                <TabsTrigger value="education">Education</TabsTrigger>
                <TabsTrigger value="experience">Experience</TabsTrigger>
                <TabsTrigger value="expertise">Expertise</TabsTrigger>
                {imam.publications && imam.publications.length > 0 && (
                  <TabsTrigger value="publications">Publications</TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="biography" className="mt-6 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Heart className="h-5 w-5 text-primary" />
                      About {imam.name.split(' ')[0]}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                      {imam.biography}
                    </p>
                  </CardContent>
                </Card>

                {/* Community Focus Summary */}
                {imam.communityFocus && imam.communityFocus.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Community Focus</CardTitle>
                      <CardDescription>Key areas where the Imam provides guidance and leadership</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {imam.communityFocus.map((focus, index) => (
                          <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                              <Users className="h-5 w-5 text-primary" />
                            </div>
                            <span className="font-medium">{focus}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Character Tab */}
              <TabsContent value="character" className="mt-6 space-y-6">
                {/* Personal Message */}
                {imam.personalMessage && (
                  <Card className="border-primary/20 bg-primary/5">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-primary" />
                        A Message from {imam.name.split(' ')[0]}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <blockquote className="italic text-muted-foreground leading-relaxed border-l-4 border-primary pl-4">
                        "{imam.personalMessage}"
                      </blockquote>
                    </CardContent>
                  </Card>
                )}

                {/* Character Traits */}
                {imam.characterTraits && imam.characterTraits.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Heart className="h-5 w-5 text-primary" />
                        Character & Personality
                      </CardTitle>
                      <CardDescription>Known qualities that define the Imam's approach</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-3">
                        {imam.characterTraits.map((trait, index) => (
                          <Badge key={index} className="bg-primary/10 text-primary py-2 px-4 text-sm">
                            {trait}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Teaching Style */}
                {imam.teachingStyle && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-primary" />
                        Teaching Style
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground leading-relaxed">
                        {imam.teachingStyle}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Weekly Schedule */}
                {imam.weeklySchedule && imam.weeklySchedule.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-primary" />
                        Weekly Schedule
                      </CardTitle>
                      <CardDescription>Typical weekly activities and availability</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {imam.weeklySchedule.map((day, index) => (
                          <div key={index} className="flex gap-4 pb-4 border-b last:border-0 last:pb-0">
                            <div className="w-24 flex-shrink-0">
                              <span className="font-semibold text-primary">{day.day}</span>
                            </div>
                            <div className="flex-1">
                              <ul className="space-y-1">
                                {day.activities.map((activity, actIndex) => (
                                  <li key={actIndex} className="text-sm text-muted-foreground flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                                    {activity}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Services Tab */}
              <TabsContent value="services" className="mt-6 space-y-6">
                {imam.availableServices && imam.availableServices.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-primary" />
                        Available Services
                      </CardTitle>
                      <CardDescription>Services and programs offered by the Imam</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 sm:grid-cols-2">
                        {imam.availableServices.map((service, index) => (
                          <div key={index} className="flex items-center gap-3 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
                              <Star className="h-5 w-5 text-primary" />
                            </div>
                            <span className="font-medium">{service}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* How to Request Services */}
                <Card>
                  <CardHeader>
                    <CardTitle>How to Request Services</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <p className="text-muted-foreground">
                        To request any of the services offered by {imam.name}, you can:
                      </p>
                      <ul className="space-y-2 text-muted-foreground">
                        <li className="flex items-start gap-2">
                          <span className="text-primary mt-0.5">1.</span>
                          <span>Visit during office hours: <strong className="text-foreground">{imam.officeHours || 'Contact for availability'}</strong></span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary mt-0.5">2.</span>
                          <span>Send an email to: <a href={`mailto:${imam.contactEmail}`} className="text-primary hover:underline">{imam.contactEmail}</a></span>
                        </li>
                        {imam.contactPhone && (
                          <li className="flex items-start gap-2">
                            <span className="text-primary mt-0.5">3.</span>
                            <span>Call: <a href={`tel:${imam.contactPhone}`} className="text-primary hover:underline">{imam.contactPhone}</a></span>
                          </li>
                        )}
                        <li className="flex items-start gap-2">
                          <span className="text-primary mt-0.5">{imam.contactPhone ? '4.' : '3.'}</span>
                          <span>Speak to the Imam after any prayer at the mosque</span>
                        </li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="education" className="mt-6 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <GraduationCap className="h-5 w-5 text-primary" />
                      Educational Background
                    </CardTitle>
                    <CardDescription>Academic qualifications and Islamic education</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="relative">
                      {/* Timeline line */}
                      <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />
                      
                      <div className="space-y-8">
                        {imam.education.map((edu, index) => (
                          <div key={index} className="relative flex gap-6">
                            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center z-10">
                              <GraduationCap className="h-6 w-6 text-primary" />
                            </div>
                            <div className="flex-1 pb-2">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <h4 className="font-semibold text-lg">{edu.degree}</h4>
                                <Badge variant="outline">{edu.year}</Badge>
                              </div>
                              <p className="text-primary font-medium">{edu.field}</p>
                              <p className="text-muted-foreground">{edu.institution}</p>
                              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                <MapPin className="h-3 w-3" />
                                {edu.location}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Certifications */}
                {imam.certifications && imam.certifications.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Award className="h-5 w-5 text-primary" />
                        Certifications & Ijazat
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {imam.certifications.map((cert, index) => (
                          <div key={index} className="flex items-center gap-3 p-4 rounded-lg border bg-card">
                            <Award className="h-5 w-5 text-primary flex-shrink-0" />
                            <span>{cert}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="experience" className="mt-6 space-y-6">
                {/* Current Position */}
                <Card className="border-primary/20">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Badge>Current Position</Badge>
                    </div>
                    <CardTitle className="text-xl">{imam.title}</CardTitle>
                    <CardDescription>{mosque.name}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {mosque.city}, {mosque.state}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(imam.appointmentDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} - Present
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Previous Positions */}
                {imam.previousPositions && imam.previousPositions.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Briefcase className="h-5 w-5 text-primary" />
                        Previous Positions
                      </CardTitle>
                      <CardDescription>Past roles and responsibilities</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="relative">
                        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />
                        
                        <div className="space-y-6">
                          {imam.previousPositions.map((pos, index) => (
                            <div key={index} className="relative flex gap-6">
                              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-muted flex items-center justify-center z-10">
                                <Building2 className="h-6 w-6 text-muted-foreground" />
                              </div>
                              <div className="flex-1">
                                <h4 className="font-semibold">{pos.position}</h4>
                                <p className="text-muted-foreground">{pos.mosqueName}</p>
                                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                  <MapPin className="h-3 w-3" />
                                  {pos.location}
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {pos.startYear} - {pos.endYear || 'Present'}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="expertise" className="mt-6 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-primary" />
                      Specializations
                    </CardTitle>
                    <CardDescription>Areas of Islamic knowledge and expertise</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {imam.specializations.map((spec, index) => (
                        <Badge key={index} className="bg-primary/10 text-primary py-2 px-4 text-sm">
                          {spec}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Languages className="h-5 w-5 text-primary" />
                      Languages
                    </CardTitle>
                    <CardDescription>Languages spoken for sermons and counseling</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-3">
                      {imam.languages.map((lang, index) => (
                        <div key={index} className="flex items-center gap-2 px-4 py-2 rounded-full border bg-card">
                          <span className="w-2 h-2 rounded-full bg-primary" />
                          <span className="font-medium">{lang}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {imam.publications && imam.publications.length > 0 && (
                <TabsContent value="publications" className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        Books & Publications
                      </CardTitle>
                      <CardDescription>Written works and scholarly contributions</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {imam.publications.map((pub, index) => (
                          <div key={index} className="flex items-start gap-4 p-4 rounded-lg border bg-card">
                            <div className="flex-shrink-0 w-12 h-16 rounded bg-primary/10 flex items-center justify-center">
                              <FileText className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                              <h4 className="font-semibold">{pub}</h4>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}
            </Tabs>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Contact Card */}
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {imam.contactEmail && (
                  <a 
                    href={`mailto:${imam.contactEmail}`}
                    className="flex items-center gap-3 text-sm hover:text-primary transition-colors"
                  >
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    {imam.contactEmail}
                  </a>
                )}
                {imam.contactPhone && (
                  <a 
                    href={`tel:${imam.contactPhone}`}
                    className="flex items-center gap-3 text-sm hover:text-primary transition-colors"
                  >
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    {imam.contactPhone}
                  </a>
                )}
                {imam.officeHours && (
                  <div className="flex items-start gap-3 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">Office Hours</p>
                      <p className="text-muted-foreground">{imam.officeHours}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Social Media */}
            {imam.socialMedia && Object.values(imam.socialMedia).some(v => v) && (
              <Card>
                <CardHeader>
                  <CardTitle>Follow Online</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {imam.socialMedia.youtube && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={imam.socialMedia.youtube} target="_blank" rel="noopener noreferrer">
                          <Youtube className="h-4 w-4 mr-2" />
                          YouTube
                        </a>
                      </Button>
                    )}
                    {imam.socialMedia.twitter && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={imam.socialMedia.twitter} target="_blank" rel="noopener noreferrer">
                          <Twitter className="h-4 w-4 mr-2" />
                          Twitter
                        </a>
                      </Button>
                    )}
                    {imam.socialMedia.facebook && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={imam.socialMedia.facebook} target="_blank" rel="noopener noreferrer">
                          <Facebook className="h-4 w-4 mr-2" />
                          Facebook
                        </a>
                      </Button>
                    )}
                    {imam.socialMedia.instagram && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={imam.socialMedia.instagram} target="_blank" rel="noopener noreferrer">
                          <Instagram className="h-4 w-4 mr-2" />
                          Instagram
                        </a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Mosque Info */}
            <Card>
              <CardHeader>
                <CardTitle>Serving At</CardTitle>
              </CardHeader>
              <CardContent>
                <Link href={`/mosques/${mosque.id}`} className="block group">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Building2 className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-semibold group-hover:text-primary transition-colors">{mosque.name}</p>
                      <p className="text-sm text-muted-foreground">{mosque.city}, {mosque.state}</p>
                    </div>
                  </div>
                </Link>
                <Separator className="my-4" />
                <Button variant="outline" className="w-full" asChild>
                  <Link href={`/mosques/${mosque.id}`}>
                    View Mosque Details
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {imam.contactEmail && (
                  <Button className="w-full" asChild>
                    <a href={`mailto:${imam.contactEmail}?subject=Meeting Request with ${imam.name}`}>
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Request Meeting
                    </a>
                  </Button>
                )}
                <Button variant="outline" className="w-full" asChild>
                  <Link href={`/mosques/${mosque.id}#events`}>
                    <Calendar className="h-4 w-4 mr-2" />
                    View Upcoming Events
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
