import { cache } from "react";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

import type {
  Announcement,
  Donation,
  Event,
  Imam,
  Mosque,
  Post,
  PrayerTime,
} from "@/lib/database.types";

interface ManagementTeamRow {
  id: string;
  mosque_id: string;
  name: string;
  team_type: string | null;
  description: string | null;
  lead_profile_id: string | null;
  is_active: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

interface ManagementTeamMemberRow {
  id: string;
  team_id: string;
  mosque_id: string;
  profile_id: string | null;
  member_name: string;
  role_title: string;
  responsibilities: string[] | null;
  notes: string | null;
  is_active: boolean;
  joined_at: string;
  created_at: string;
  updated_at: string;
}

export interface PublicProfileLite {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email?: string | null;
  phone?: string | null;
  profession?: string | null;
}

interface ProfileLookupRow {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
  phone: string | null;
  profession: string | null;
}

export interface PublicManagementTeamMember extends ManagementTeamMemberRow {
  profile: PublicProfileLite | null;
}

export interface PublicManagementTeam extends ManagementTeamRow {
  lead: PublicProfileLite | null;
  members: PublicManagementTeamMember[];
}

export interface PublicMosquePost extends Omit<Post, "author"> {
  author: PublicProfileLite | null;
}

export interface PublicUpcomingEvent {
  event: Event;
  mosque: Mosque | null;
}

export interface PublicEventListItem {
  event: Event;
  mosque: Mosque | null;
}

export interface PublicEventDetailData {
  event: Event;
  mosque: Mosque | null;
}

export interface PublicMosquePageData {
  mosque: Mosque;
  prayerTimes: PrayerTime | null;
  imams: Imam[];
  events: Event[];
  announcements: Announcement[];
  donations: Donation[];
  recentPosts: PublicMosquePost[];
  managementTeams: PublicManagementTeam[];
  stats: {
    activeImams: number;
    livePrograms: number;
    communityPosts: number;
  completedDonations: number;
  };
}

let publicClient: SupabaseClient | null = null;

function logQueryError(context: string, error: { message?: string; code?: string } | null) {
  if (!error || isMissingRelationError(error)) {
    return;
  }

  console.error(`[public:${context}] ${error.message ?? "Unknown database error"}`);
}

function isMissingRelationError(error: { message?: string; code?: string } | null) {
  return Boolean(error && (error.code === "42P01" || /does not exist/i.test(error.message ?? "")));
}

function uniqueIds(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function buildProfileMap(profiles: ProfileLookupRow[]) {
  return new Map<string, PublicProfileLite>(
    profiles.map((profile) => [
      profile.id,
      {
        id: profile.id,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        email: profile.email,
        phone: profile.phone,
        profession: profile.profession,
      },
    ])
  );
}

function getPublicClient() {
  if (publicClient) {
    return publicClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[public] Missing Supabase environment variables for public content");
    return null;
  }

  publicClient = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return publicClient;
}

export const getPublicDirectoryMosques = cache(async (verifiedOnly = true, limit = 120) => {
  const supabase = getPublicClient();

  if (!supabase) {
    return [] as Mosque[];
  }

  let query = supabase
    .from("mosques")
    .select("*")
    .order("is_verified", { ascending: false })
    .order("name", { ascending: true });

  if (verifiedOnly) {
    query = query.eq("is_verified", true);
  }

  if (limit > 0) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    logQueryError("directory_mosques", error);
    return [] as Mosque[];
  }

  return data ?? [];
});

export const getFeaturedMosques = cache(async (limit = 3) => {
  return getPublicDirectoryMosques(true, limit);
});

export const getUpcomingEventsPreview = cache(async (limit = 4) => {
  const supabase = getPublicClient();

  if (!supabase) {
    return [] as PublicUpcomingEvent[];
  }

  const nowIso = new Date().toISOString();
  const { data: events, error } = await supabase
    .from("events")
    .select("*")
    .eq("is_published", true)
    .gte("start_date", nowIso)
    .order("start_date", { ascending: true })
    .limit(limit);

  if (error) {
    logQueryError("upcoming_events", error);
    return [] as PublicUpcomingEvent[];
  }

  const mosqueIds = uniqueIds((events ?? []).map((event) => event.mosque_id));
  const { data: mosques, error: mosquesError } = mosqueIds.length
    ? await supabase.from("mosques").select("*").in("id", mosqueIds)
    : { data: [] as Mosque[], error: null };

  if (mosquesError) {
    logQueryError("upcoming_events_mosques", mosquesError);
  }

  const mosqueMap = new Map((mosques ?? []).map((mosque) => [mosque.id, mosque]));

  return (events ?? []).map((event) => ({
    event,
    mosque: mosqueMap.get(event.mosque_id) ?? null,
  }));
});

export const getPublishedEvents = cache(async (limit = 120) => {
  const supabase = getPublicClient();

  if (!supabase) {
    return [] as PublicEventListItem[];
  }

  const nowIso = new Date().toISOString();
  const { data: events, error } = await supabase
    .from("events")
    .select("*")
    .eq("is_published", true)
    .gte("start_date", nowIso)
    .order("start_date", { ascending: true })
    .limit(limit);

  if (error) {
    logQueryError("published_events", error);
    return [] as PublicEventListItem[];
  }

  const mosqueIds = uniqueIds((events ?? []).map((event) => event.mosque_id));
  const { data: mosques, error: mosquesError } = mosqueIds.length
    ? await supabase.from("mosques").select("*").in("id", mosqueIds)
    : { data: [] as Mosque[], error: null };

  if (mosquesError) {
    logQueryError("published_events_mosques", mosquesError);
  }

  const mosqueMap = new Map((mosques ?? []).map((mosque) => [mosque.id, mosque]));

  return (events ?? []).map((event) => ({
    event,
    mosque: mosqueMap.get(event.mosque_id) ?? null,
  }));
});

export const getPublishedEventById = cache(async (id: string) => {
  const supabase = getPublicClient();

  if (!supabase) {
    return null as PublicEventDetailData | null;
  }

  const { data: event, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .eq("is_published", true)
    .single();

  if (error || !event) {
    logQueryError("published_event_detail", error);
    return null as PublicEventDetailData | null;
  }

  const { data: mosque, error: mosqueError } = await supabase
    .from("mosques")
    .select("*")
    .eq("id", event.mosque_id)
    .maybeSingle();

  if (mosqueError) {
    logQueryError("published_event_detail_mosque", mosqueError);
  }

  return {
    event,
    mosque: mosque ?? null,
  } satisfies PublicEventDetailData;
});

export const getPublicMosquePageData = cache(async (id: string) => {
  const supabase = getPublicClient();

  if (!supabase) {
    return null as PublicMosquePageData | null;
  }

  const { data: mosque, error: mosqueError } = await supabase
    .from("mosques")
    .select("*")
    .eq("id", id)
    .single();

  if (mosqueError || !mosque) {
    logQueryError("mosque_detail", mosqueError);
    return null as PublicMosquePageData | null;
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const today = nowIso.slice(0, 10);

  const [
    imamsResult,
    eventsResult,
    announcementsResult,
    donationsResult,
    postsResult,
    prayerTodayResult,
    prayerUpcomingResult,
    prayerLatestResult,
    teamsResult,
    teamMembersResult,
  ] = await Promise.all([
    supabase
      .from("imams")
      .select("*")
      .eq("mosque_id", id)
      .order("is_active", { ascending: false })
      .order("appointed_date", { ascending: true }),
    supabase
      .from("events")
      .select("*")
      .eq("mosque_id", id)
      .eq("is_published", true)
      .gte("start_date", nowIso)
      .order("start_date", { ascending: true })
      .limit(8),
    supabase
      .from("announcements")
      .select("*")
      .eq("mosque_id", id)
      .eq("is_published", true)
      .order("published_at", { ascending: false })
      .limit(8),
    supabase
      .from("donations")
      .select("*")
      .eq("mosque_id", id)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("posts")
      .select("*")
      .eq("mosque_id", id)
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("prayer_times")
      .select("*")
      .eq("mosque_id", id)
      .eq("date", today)
      .maybeSingle(),
    supabase
      .from("prayer_times")
      .select("*")
      .eq("mosque_id", id)
      .gte("date", today)
      .order("date", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("prayer_times")
      .select("*")
      .eq("mosque_id", id)
      .lte("date", today)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("management_teams")
      .select("*")
      .eq("mosque_id", id)
      .order("is_active", { ascending: false })
      .order("name", { ascending: true }),
    supabase
      .from("management_team_members")
      .select("*")
      .eq("mosque_id", id)
      .order("is_active", { ascending: false })
      .order("joined_at", { ascending: true }),
  ]);

  logQueryError("mosque_imams", imamsResult.error);
  logQueryError("mosque_events", eventsResult.error);
  logQueryError("mosque_announcements", announcementsResult.error);
  logQueryError("mosque_donations", donationsResult.error);
  logQueryError("mosque_posts", postsResult.error);
  logQueryError("mosque_prayer_today", prayerTodayResult.error);
  logQueryError("mosque_prayer_upcoming", prayerUpcomingResult.error);
  logQueryError("mosque_prayer_latest", prayerLatestResult.error);
  logQueryError("mosque_management_teams", teamsResult.error);
  logQueryError("mosque_management_team_members", teamMembersResult.error);

  const imams = imamsResult.data ?? [];
  const events = eventsResult.data ?? [];
  const announcements = (announcementsResult.data ?? []).filter(
    (announcement) => !announcement.expires_at || announcement.expires_at > nowIso
  );
  const donations = (donationsResult.data ?? []).filter((donation) => donation.status === "completed");
  const recentPosts = (postsResult.data ?? []).filter(
    (post) => !post.visibility || post.visibility === "public"
  );
  const prayerTimes =
    prayerTodayResult.data ?? prayerUpcomingResult.data ?? prayerLatestResult.data ?? null;

  const teams: ManagementTeamRow[] = isMissingRelationError(teamsResult.error)
    ? []
    : ((teamsResult.data as ManagementTeamRow[] | null) ?? []);
  const teamMembers: ManagementTeamMemberRow[] = isMissingRelationError(teamMembersResult.error)
    ? []
    : ((teamMembersResult.data as ManagementTeamMemberRow[] | null) ?? []);

  const profileIds = uniqueIds([
    ...recentPosts.map((post) => post.author_id),
    ...teams.map((team) => team.lead_profile_id),
    ...teamMembers.map((member) => member.profile_id),
  ]);

  const { data: profiles, error: profilesError } = profileIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, email, phone, profession")
        .in("id", profileIds)
    : { data: [] as ProfileLookupRow[], error: null };

  if (profilesError) {
    logQueryError("mosque_profiles", profilesError);
  }

  const profileMap = buildProfileMap(profiles ?? []);
  const membersByTeam = new Map<string, PublicManagementTeamMember[]>();

  teamMembers.forEach((member) => {
    const mappedMember: PublicManagementTeamMember = {
      ...member,
      profile: member.profile_id ? profileMap.get(member.profile_id) ?? null : null,
    };

    const existing = membersByTeam.get(member.team_id) ?? [];
    existing.push(mappedMember);
    membersByTeam.set(member.team_id, existing);
  });

  const managementTeams: PublicManagementTeam[] = teams.map((team) => ({
    ...team,
    lead: team.lead_profile_id ? profileMap.get(team.lead_profile_id) ?? null : null,
    members: membersByTeam.get(team.id) ?? [],
  }));

  return {
    mosque,
    prayerTimes,
    imams,
    events,
    announcements,
    donations,
    recentPosts: recentPosts.map((post) => ({
      ...post,
      author: profileMap.get(post.author_id) ?? null,
    })),
    managementTeams,
    stats: {
      activeImams: imams.filter((imam) => imam.is_active).length,
      livePrograms: events.length + announcements.length,
      communityPosts: recentPosts.length,
      completedDonations: donations.length,
    },
  } satisfies PublicMosquePageData;
});
