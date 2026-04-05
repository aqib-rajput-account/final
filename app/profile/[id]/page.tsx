'use client'

import { useParams, useRouter } from 'next/navigation'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Mail, Briefcase, Globe, Calendar, ArrowLeft, MessageSquare } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

const fetcher = async (userId: string) => {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) throw error
  return data
}

export default function UserProfilePage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.id as string
  const [isMessaging, setIsMessaging] = useState(false)

  const { data: profile, isLoading, error } = useSWR(userId ? `/profile/${userId}` : null, () => fetcher(userId), {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  })

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 max-w-md text-center">
          <h2 className="text-xl font-bold mb-2">User Not Found</h2>
          <p className="text-muted-foreground mb-4">This user profile doesn&apos;t exist.</p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </Card>
      </div>
    )
  }

  if (isLoading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading profile...</div>
      </div>
    )
  }

  const initials = profile.full_name
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase() || 'U'

  const handleMessage = async () => {
    setIsMessaging(true)
    try {
      // Create or get existing conversation
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'direct',
          participantId: userId,
        }),
      })

      if (!response.ok) throw new Error('Failed to create conversation')

      const { data } = await response.json()
      router.push(`/messages?conversation=${data.id}`)
    } catch (error: any) {
      toast.error(error.message || 'Failed to start conversation')
      setIsMessaging(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30">
      <div className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8">
        <Button variant="ghost" className="mb-6" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {/* Cover Section */}
        <div className="relative h-48 sm:h-64 bg-gradient-to-r from-primary/20 to-primary/10 rounded-lg overflow-hidden mb-8">
          <div className="absolute inset-0 opacity-30" style={{
            backgroundImage: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23000" fill-opacity="0.1"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
          }} />
        </div>

        {/* Profile Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-6 mb-8 -mt-20 relative z-10">
          <Avatar className="h-32 w-32 border-4 border-background shadow-lg">
            <AvatarImage src={profile.avatar_url} />
            <AvatarFallback className="text-2xl bg-gradient-to-br from-primary to-primary/50 text-white">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
              {profile.full_name || 'User'}
            </h1>
            {profile.profession && (
              <p className="text-lg text-muted-foreground mb-3">{profile.profession}</p>
            )}
            <div className="flex flex-wrap gap-2">
              <Badge variant="default" className="capitalize">{profile.role}</Badge>
              {profile.is_active && (
                <Badge variant="secondary" className="bg-green-500">
                  <div className="h-2 w-2 bg-white rounded-full mr-2" />
                  Online
                </Badge>
              )}
            </div>
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <Button asChild variant="outline" size="sm" className="flex-1 sm:flex-initial">
              <a href={`/feed?profile=${userId}`}>View Feed</a>
            </Button>
            <Button size="sm" className="flex-1 sm:flex-initial gap-2" onClick={handleMessage} disabled={isMessaging}>
              <MessageSquare className="h-4 w-4" />
              Message
            </Button>
          </div>
        </div>

        {/* Bio Section */}
        {profile.bio && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <p className="text-foreground leading-relaxed">{profile.bio}</p>
            </CardContent>
          </Card>
        )}

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                Contact
              </h3>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Email</p>
                <p className="font-medium text-sm break-all">{profile.email}</p>
              </div>
              {profile.phone && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Phone</p>
                  <p className="font-medium text-sm">{profile.phone}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                Professional
              </h3>
            </CardHeader>
            <CardContent className="space-y-3">
              {profile.profession && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Profession</p>
                  <p className="font-medium text-sm">{profile.profession}</p>
                </div>
              )}
              {profile.education && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Education</p>
                  <p className="font-medium text-sm">{profile.education}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Additional Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {profile.website && (
            <Card>
              <CardHeader className="pb-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" />
                  Website
                </h3>
              </CardHeader>
              <CardContent>
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline text-sm truncate"
                >
                  {profile.website}
                </a>
              </CardContent>
            </Card>
          )}

          {profile.languages && profile.languages.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <h3 className="font-semibold">Languages</h3>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {profile.languages.map((lang: string) => (
                  <Badge key={lang} variant="secondary">
                    {lang}
                  </Badge>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Member Since
              </h3>
            </CardHeader>
            <CardContent>
              <p className="font-medium text-sm">
                {profile.created_at
                  ? new Date(profile.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : 'Recently'}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
