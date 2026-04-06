import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const DISCOVERY_LIMIT = 20
const NEARBY_RADIUS_KM = 50

/** Haversine distance in km between two lat/lng points */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const mode = searchParams.get('mode')

    // --- Discovery mode ---
    if (mode === 'discovery') {
      // 1. Get the IDs of users the requesting user already follows
      const { data: followingRows, error: followingError } = await supabase
        .from('user_follows')
        .select('following_id')
        .eq('follower_id', user.id)

      if (followingError) {
        console.error('Error fetching following list:', followingError)
        return NextResponse.json({ error: followingError.message }, { status: 500 })
      }

      const alreadyFollowingIds = new Set<string>(
        (followingRows ?? []).map((r: { following_id: string }) => r.following_id)
      )

      // 2. Friends-of-friends: users followed by people the requesting user follows
      let friendsOfFriends: Array<{ id: string; full_name: string | null; avatar_url: string | null; bio: string | null; profession: string | null; role: string }> = []

      if (alreadyFollowingIds.size > 0) {
        const { data: fofRows, error: fofError } = await supabase
          .from('user_follows')
          .select('following_id, profiles!user_follows_following_id_fkey(id, full_name, avatar_url, bio, profession, role)')
          .in('follower_id', Array.from(alreadyFollowingIds))
          .neq('following_id', user.id)

        if (fofError) {
          console.error('Error fetching friends-of-friends:', fofError)
          return NextResponse.json({ error: fofError.message }, { status: 500 })
        }

        // Deduplicate and exclude already-followed users
        const seen = new Set<string>()
        for (const row of fofRows ?? []) {
          const profile = row.profiles as { id: string; full_name: string | null; avatar_url: string | null; bio: string | null; profession: string | null; role: string } | null
          if (!profile) continue
          if (alreadyFollowingIds.has(profile.id)) continue
          if (profile.id === user.id) continue
          if (seen.has(profile.id)) continue
          seen.add(profile.id)
          friendsOfFriends.push(profile)
        }
      }

      // 3. Location-based: include members within 50 km if user has location data
      let nearbyMembers: Array<{ id: string; full_name: string | null; avatar_url: string | null; bio: string | null; profession: string | null; role: string }> = []

      const { data: userProfile } = await supabase
        .from('profiles')
        .select('location_lat, location_lng')
        .eq('id', user.id)
        .single()

      if (userProfile?.location_lat != null && userProfile?.location_lng != null) {
        const { data: allProfiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, bio, profession, role, location_lat, location_lng')
          .neq('id', user.id)
          .not('location_lat', 'is', null)
          .not('location_lng', 'is', null)

        if (profilesError) {
          console.error('Error fetching profiles for location filter:', profilesError)
          return NextResponse.json({ error: profilesError.message }, { status: 500 })
        }

        for (const p of allProfiles ?? []) {
          if (alreadyFollowingIds.has(p.id)) continue
          const dist = haversineKm(
            userProfile.location_lat,
            userProfile.location_lng,
            p.location_lat as number,
            p.location_lng as number
          )
          if (dist <= NEARBY_RADIUS_KM) {
            nearbyMembers.push({
              id: p.id,
              full_name: p.full_name,
              avatar_url: p.avatar_url,
              bio: p.bio,
              profession: p.profession,
              role: p.role,
            })
          }
        }
      }

      // 4. Merge and deduplicate, limit to 20
      const merged = new Map<string, typeof friendsOfFriends[0]>()
      for (const m of [...friendsOfFriends, ...nearbyMembers]) {
        if (!merged.has(m.id)) merged.set(m.id, m)
      }
      let discoveryResults = Array.from(merged.values()).slice(0, DISCOVERY_LIMIT)

      // 5. Fallback: recently joined members if no results
      if (discoveryResults.length === 0) {
        const { data: recentMembers, error: recentError } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, bio, profession, role')
          .neq('id', user.id)
          .order('created_at', { ascending: false })
          .limit(DISCOVERY_LIMIT)

        if (recentError) {
          console.error('Error fetching recent members:', recentError)
          return NextResponse.json({ error: recentError.message }, { status: 500 })
        }

        discoveryResults = recentMembers ?? []
      }

      return NextResponse.json({ data: discoveryResults })
    }

    // --- Default: list all members with optional search ---
    let query = supabase
      .from('profiles')
      .select('id, full_name, avatar_url, bio, profession, role')
      .limit(100)
      .order('created_at', { ascending: false })

    if (search && search.trim()) {
      query = query.ilike('full_name', `%${search.trim()}%`)
    }

    const { data: members, error } = await query

    if (error) {
      console.error('Error fetching members:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Fetch the current user's following list to annotate isFollowing per member
    const { data: followingRows } = await supabase
      .from('user_follows')
      .select('following_id')
      .eq('follower_id', user.id)

    const followingSet = new Set<string>(
      (followingRows ?? []).map((r: { following_id: string }) => r.following_id)
    )

    const annotated = (members ?? []).map((m) => ({
      ...m,
      isFollowing: followingSet.has(m.id),
    }))

    return NextResponse.json({ data: annotated })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
