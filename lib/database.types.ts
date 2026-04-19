export type UserRole = "super_admin" | "admin" | "shura" | "imam" | "member";

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  phone: string | null;
  bio: string | null;
  role: UserRole;
  mosque_id: string | null;
  is_verified: boolean;
  is_active: boolean;
  locale?: string | null;
  metadata?: any;
  privacy_settings?: any;
  last_seen_at?: string | null;
  profession?: string | null;
  education?: string | null;
  languages?: string[] | null;
  website?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Mosque {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  country: string;
  zip_code: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  description: string | null;
  image_url: string | null;
  facilities: string[] | null;
  capacity: number | null;
  established_year: number | null;
  is_verified: boolean;
  admin_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Imam {
  id: string;
  profile_id: string | null;
  mosque_id: string | null;
  name: string;
  title: string | null;
  specializations: string[] | null;
  education: string | null;
  experience_years: number | null;
  languages: string[] | null;
  bio: string | null;
  image_url: string | null;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  appointed_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  mosque_id: string;
  title: string;
  description: string | null;
  event_type: string;
  start_date: string;
  end_date: string | null;
  location: string | null;
  image_url: string | null;
  is_recurring: boolean;
  recurrence_pattern: string | null;
  max_attendees: number | null;
  registration_required: boolean;
  is_published: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventRegistration {
  id: string;
  event_id: string;
  user_id: string;
  status: "registered" | "attended" | "cancelled";
  registered_at: string;
}

export interface Post {
  id: string;
  author_id: string;
  mosque_id: string | null;
  content: string;
  body?: string | null;
  image_url: string | null;
  post_type?: string;
  category?: string;
  visibility?: string | null;
  metadata?: any;
  likes_count: number;
  comments_count: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields
  author?: Profile;
  mosque?: Mosque;
}

export interface PostLike {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
}

export interface PostComment {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  author?: Profile;
}

export interface Announcement {
  id: string;
  mosque_id: string;
  title: string;
  content: string;
  priority: "low" | "normal" | "high" | "urgent";
  is_published: boolean;
  published_at: string;
  expires_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  mosque?: Mosque;
}

export interface PrayerTime {
  id: string;
  mosque_id: string;
  date: string;
  fajr_adhan: string | null;
  fajr_iqama: string | null;
  sunrise: string | null;
  dhuhr_adhan: string | null;
  dhuhr_iqama: string | null;
  asr_adhan: string | null;
  asr_iqama: string | null;
  maghrib_adhan: string | null;
  maghrib_iqama: string | null;
  isha_adhan: string | null;
  isha_iqama: string | null;
  jummah_time: string | null;
  jummah_iqama: string | null;
  created_at: string;
  updated_at: string;
}

export interface Donation {
  id: string;
  mosque_id: string;
  donor_id: string | null;
  amount: number;
  currency: string;
  donation_type: string;
  payment_method: string | null;
  transaction_id: string | null;
  is_anonymous: boolean;
  is_recurring: boolean;
  status: "pending" | "completed" | "failed" | "refunded";
  notes: string | null;
  created_at: string;
}

export interface ManagementTeam {
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

export interface ImamAppointment {
  id: string;
  imam_id: string;
  mosque_id: string;
  role_title: string | null;
  appointed_date: string | null;
  ended_at: string | null;
  is_primary: boolean;
  is_active: boolean;
  notes: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ManagementTeamMember {
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

export interface MosqueTask {
  id: string;
  mosque_id: string;
  team_id: string | null;
  assigned_to_profile_id: string | null;
  title: string;
  description: string | null;
  task_type: string;
  priority: "low" | "normal" | "high" | "urgent";
  status: "todo" | "in_progress" | "blocked" | "completed" | "cancelled";
  due_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShuraMember {
  id: string;
  profile_id: string;
  mosque_id: string;
  position: string;
  responsibilities: string[] | null;
  term_start: string | null;
  term_end: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields
  profile?: Profile;
  mosque?: Mosque;
}

export interface Conversation {
  id: string;
  name: string | null;
  type: "direct" | "group" | "broadcast";
  image_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
  role: "admin" | "member";
  last_read_at: string;
  is_muted: boolean;
  joined_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  content: string | null;
  message_type: "text" | "image" | "file" | "system";
  image_url: string | null;
  file_url: string | null;
  file_name: string | null;
  reply_to_id: string | null;
  is_edited: boolean;
  is_deleted: boolean;
  reactions: any;
  created_at: string;
  updated_at: string;
}
