"use client"

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// User Profile types
export interface UserProfile {
  id: string
  name: string
  username: string
  email?: string
  avatar?: string
  coverImage?: string
  bio?: string
  location?: string
  website?: string
  verified?: boolean
  role: 'user' | 'imam' | 'mosque' | 'shura'
  joinedDate: string
  // Mosque connection
  connectedMosqueId?: string
  connectedMosqueName?: string
  // Stats
  postsCount: number
  followersCount: number
  followingCount: number
  // Arrays
  followers: string[]
  following: string[]
  // Preferences
  isPrivate?: boolean
  notificationsEnabled?: boolean
  // Additional profile fields
  phone?: string
  education?: string
  profession?: string
  interests?: string[]
  languages?: string[]
  socialLinks?: {
    twitter?: string
    linkedin?: string
    youtube?: string
    instagram?: string
  }
}

// Community Member type (synced from mosque)
export interface CommunityMember {
  id: string
  name: string
  username: string
  avatar?: string
  bio?: string
  location?: string
  verified?: boolean
  role: 'user' | 'imam' | 'mosque' | 'shura'
  mosqueId: string
  mosqueName: string
  position?: string // e.g., "Head Imam", "Board Member", etc.
  department?: string
  joinedDate: string
  isOnline?: boolean
  lastActive?: string
  postsCount: number
  followersCount: number
  followingCount: number
}

// Spaces (Live Voice Rooms) types
export interface Space {
  id: string
  title: string
  description?: string
  hostId: string
  host: SpaceParticipant
  coHosts: SpaceParticipant[]
  speakers: SpaceParticipant[]
  listeners: SpaceParticipant[]
  status: 'scheduled' | 'live' | 'ended'
  scheduledStart?: string
  startedAt?: string
  endedAt?: string
  category: 'general' | 'islamic' | 'quran' | 'education' | 'community' | 'youth' | 'sisters'
  mosqueId?: string
  mosqueName?: string
  isRecorded?: boolean
  recordingUrl?: string
  totalParticipants: number
  maxParticipants?: number
  createdAt: string
  // Recording data
  recordings?: Recording[]
}

export interface SpaceParticipant {
  id: string
  name: string
  username: string
  avatar?: string
  role: 'host' | 'co-host' | 'speaker' | 'listener'
  isMuted: boolean
  isSpeaking?: boolean
  isVideoOn?: boolean
  joinedAt: string
}

// Video Meeting types
export interface VideoMeeting {
  id: string
  title: string
  description?: string
  hostId: string
  host: MeetingParticipant
  participants: MeetingParticipant[]
  status: 'scheduled' | 'live' | 'ended'
  scheduledStart?: string
  startedAt?: string
  endedAt?: string
  category: 'general' | 'islamic' | 'quran' | 'education' | 'community' | 'youth' | 'sisters' | 'meeting'
  mosqueId?: string
  mosqueName?: string
  isRecorded?: boolean
  recordings?: Recording[]
  meetingCode: string
  password?: string
  settings: MeetingSettings
  totalParticipants: number
  maxParticipants?: number
  createdAt: string
}

export interface MeetingParticipant {
  id: string
  name: string
  username: string
  avatar?: string
  role: 'host' | 'co-host' | 'participant'
  isMuted: boolean
  isVideoOn: boolean
  isScreenSharing?: boolean
  isHandRaised?: boolean
  isSpeaking?: boolean
  joinedAt: string
}

export interface MeetingSettings {
  allowScreenShare: boolean
  allowChat: boolean
  waitingRoom: boolean
  muteOnEntry: boolean
  allowRecording: boolean
}

export interface Recording {
  id: string
  type: 'audio' | 'video'
  url: string
  duration: number // in seconds
  size: number // in bytes
  createdAt: string
  title?: string
}

// Post types
export interface PostAuthor {
  id: string
  name: string
  username: string
  avatar?: string
  verified?: boolean
  role?: 'user' | 'imam' | 'mosque' | 'shura'
  connectedMosqueId?: string
  connectedMosqueName?: string
}

export interface PostComment {
  id: string
  authorId: string
  author: PostAuthor
  content: string
  createdAt: string
  likes: number
  likedBy: string[]
}

export interface Post {
  id: string
  author: PostAuthor
  content: string
  images?: string[]
  type: 'text' | 'image' | 'event' | 'announcement' | 'prayer-request' | 'quote'
  category?: 'general' | 'islamic' | 'community' | 'event' | 'mosque' | 'education'
  likes: number
  likedBy: string[]
  comments: PostComment[]
  shares: number
  bookmarkedBy: string[]
  createdAt: string
  updatedAt: string
  mosqueId?: string
  mosqueName?: string
  eventId?: string
  eventDetails?: {
    title: string
    date: string
    location: string
  }
  quoteSource?: string
}

// Test/Developer Account - Full access for testing all features
// In production, this would be replaced with authenticated user data
export const TEST_ACCOUNT: UserProfile = {
  id: 'dev-test-user',
  name: 'Developer Test Account',
  username: 'dev_tester',
  email: 'developer@mosqueconnect.test',
  avatar: undefined,
  coverImage: undefined,
  bio: 'Test account for development and testing all features. Full access to Spaces, Video Meetings, and Recording features.',
  location: 'Development Environment',
  website: 'https://mosqueconnect.dev',
  verified: true,
  role: 'shura', // Full access role for testing
  joinedDate: '2024-01-01T00:00:00Z',
  connectedMosqueId: '1',
  connectedMosqueName: 'Al-Noor Islamic Center',
  postsCount: 100,
  followersCount: 5000,
  followingCount: 250,
  followers: ['imam-1', 'imam-2', 'user-2', 'user-3'],
  following: ['imam-1', 'mosque-1', 'shura-1', 'imam-2'],
  isPrivate: false,
  notificationsEnabled: true,
  phone: '+1-555-DEV-TEST',
  education: 'Software Development',
  profession: 'Full Stack Developer',
  interests: ['Islamic Technology', 'Community Building', 'Open Source'],
  languages: ['English', 'Arabic', 'Urdu'],
  socialLinks: {
    twitter: '@mosqueconnect_dev',
    linkedin: 'mosqueconnect-dev',
    youtube: '@MosqueConnectDev'
  }
}

// Current user profile (mock - would be from auth in real app)
// Using TEST_ACCOUNT for development
export const currentUserProfile: UserProfile = TEST_ACCOUNT

// Current user as PostAuthor (for posts)
export const currentUser: PostAuthor = {
  id: currentUserProfile.id,
  name: currentUserProfile.name,
  username: currentUserProfile.username,
  avatar: currentUserProfile.avatar,
  verified: currentUserProfile.verified,
  role: currentUserProfile.role,
  connectedMosqueId: currentUserProfile.connectedMosqueId,
  connectedMosqueName: currentUserProfile.connectedMosqueName
}

// Initial mock posts
const initialPosts: Post[] = [
  {
    id: 'post-1',
    author: {
      id: 'imam-1',
      name: 'Sheikh Ahmad Hassan',
      username: 'sheikh_ahmad',
      verified: true,
      role: 'imam'
    },
    content: 'Reminder: "The best among you are those who learn the Quran and teach it." - Prophet Muhammad (PBUH)\n\nOur weekend Quran classes are open for registration. All ages welcome!',
    type: 'quote',
    category: 'islamic',
    likes: 45,
    likedBy: [],
    comments: [
      {
        id: 'comment-1',
        authorId: 'user-2',
        author: {
          id: 'user-2',
          name: 'Fatima Ali',
          username: 'fatima_a',
          role: 'user'
        },
        content: 'JazakAllah Khair Sheikh! We registered our children last week.',
        createdAt: '2025-03-15T10:30:00Z',
        likes: 5,
        likedBy: []
      }
    ],
    shares: 12,
    bookmarkedBy: [],
    createdAt: '2025-03-15T09:00:00Z',
    updatedAt: '2025-03-15T09:00:00Z',
    quoteSource: 'Sahih Bukhari'
  },
  {
    id: 'post-2',
    author: {
      id: 'mosque-1',
      name: 'Al-Noor Islamic Center',
      username: 'alnoor_center',
      verified: true,
      role: 'mosque'
    },
    content: 'Alhamdulillah! Our community iftar during Ramadan served over 500 people daily. Thank you to all volunteers who made this possible. May Allah reward you abundantly.',
    images: ['https://images.unsplash.com/photo-1564769625905-50e93615e769?w=600'],
    type: 'image',
    category: 'community',
    likes: 128,
    likedBy: [],
    comments: [],
    shares: 34,
    bookmarkedBy: [],
    createdAt: '2025-03-14T18:00:00Z',
    updatedAt: '2025-03-14T18:00:00Z',
    mosqueId: 'mosque-1',
    mosqueName: 'Al-Noor Islamic Center'
  },
  {
    id: 'post-3',
    author: {
      id: 'user-3',
      name: 'Omar Farooq',
      username: 'omar_f',
      role: 'user'
    },
    content: 'SubhanAllah! Just attended the most beautiful Fajr prayer at Masjid Al-Rahman. The recitation brought tears to my eyes. If you havent visited yet, I highly recommend it.',
    type: 'text',
    category: 'general',
    likes: 67,
    likedBy: [],
    comments: [
      {
        id: 'comment-2',
        authorId: 'user-4',
        author: {
          id: 'user-4',
          name: 'Aisha Khan',
          username: 'aisha_k',
          role: 'user'
        },
        content: 'Which sheikh was leading the prayer?',
        createdAt: '2025-03-14T08:45:00Z',
        likes: 2,
        likedBy: []
      },
      {
        id: 'comment-3',
        authorId: 'user-3',
        author: {
          id: 'user-3',
          name: 'Omar Farooq',
          username: 'omar_f',
          role: 'user'
        },
        content: 'Sheikh Muhammad Ali. His voice is truly blessed.',
        createdAt: '2025-03-14T09:00:00Z',
        likes: 3,
        likedBy: []
      }
    ],
    shares: 8,
    bookmarkedBy: [],
    createdAt: '2025-03-14T07:30:00Z',
    updatedAt: '2025-03-14T07:30:00Z'
  },
  {
    id: 'post-4',
    author: {
      id: 'shura-1',
      name: 'Shura Council',
      username: 'shura_council',
      verified: true,
      role: 'shura'
    },
    content: 'Important Announcement: New mosque registration process is now open for communities looking to join our network. Visit our registration portal or contact your local Shura representative.',
    type: 'announcement',
    category: 'mosque',
    likes: 89,
    likedBy: [],
    comments: [],
    shares: 45,
    bookmarkedBy: [],
    createdAt: '2025-03-13T14:00:00Z',
    updatedAt: '2025-03-13T14:00:00Z'
  },
  {
    id: 'post-5',
    author: {
      id: 'mosque-2',
      name: 'Masjid Al-Rahman',
      username: 'masjid_rahman',
      verified: true,
      role: 'mosque'
    },
    content: 'Join us this Saturday for our Youth Leadership Workshop! Learn essential skills for community service and Islamic leadership.',
    type: 'event',
    category: 'event',
    likes: 56,
    likedBy: [],
    comments: [],
    shares: 23,
    bookmarkedBy: [],
    createdAt: '2025-03-12T11:00:00Z',
    updatedAt: '2025-03-12T11:00:00Z',
    mosqueId: 'mosque-2',
    mosqueName: 'Masjid Al-Rahman',
    eventDetails: {
      title: 'Youth Leadership Workshop',
      date: '2025-03-22T10:00:00Z',
      location: 'Masjid Al-Rahman Community Hall'
    }
  },
  {
    id: 'post-6',
    author: {
      id: 'user-5',
      name: 'Mariam Hassan',
      username: 'mariam_h',
      role: 'user'
    },
    content: 'Prayer request: Please make dua for my mother who is unwell. May Allah grant her complete shifa and good health. Ameen.',
    type: 'prayer-request',
    category: 'general',
    likes: 234,
    likedBy: [],
    comments: [
      {
        id: 'comment-4',
        authorId: 'user-6',
        author: {
          id: 'user-6',
          name: 'Yusuf Ibrahim',
          username: 'yusuf_i',
          role: 'user'
        },
        content: 'May Allah grant her complete shifa. Ameen.',
        createdAt: '2025-03-11T16:30:00Z',
        likes: 15,
        likedBy: []
      },
      {
        id: 'comment-5',
        authorId: 'user-7',
        author: {
          id: 'user-7',
          name: 'Khadijah Mahmood',
          username: 'khadijah_m',
          role: 'user'
        },
        content: 'In our duas, sister. Stay strong.',
        createdAt: '2025-03-11T17:00:00Z',
        likes: 8,
        likedBy: []
      }
    ],
    shares: 15,
    bookmarkedBy: [],
    createdAt: '2025-03-11T15:00:00Z',
    updatedAt: '2025-03-11T15:00:00Z'
  },
  {
    id: 'post-7',
    author: {
      id: 'imam-2',
      name: 'Imam Khalid Omar',
      username: 'imam_khalid',
      verified: true,
      role: 'imam'
    },
    content: '"Indeed, with hardship comes ease." - Quran 94:6\n\nWhatever challenges you are facing today, remember that Allah never burdens a soul beyond its capacity. Keep your trust in Him.',
    type: 'quote',
    category: 'islamic',
    likes: 312,
    likedBy: [],
    comments: [],
    shares: 87,
    bookmarkedBy: [],
    createdAt: '2025-03-10T08:00:00Z',
    updatedAt: '2025-03-10T08:00:00Z',
    quoteSource: 'Surah Ash-Sharh'
  },
  {
    id: 'post-8',
    author: {
      id: 'mosque-3',
      name: 'Islamic Center of Excellence',
      username: 'ice_mosque',
      verified: true,
      role: 'mosque'
    },
    content: 'Exciting news! Our new Islamic library is now open. We have over 2,000 books in Arabic, English, and Urdu. Open daily after Dhuhr prayer.',
    type: 'announcement',
    category: 'education',
    likes: 145,
    likedBy: [],
    comments: [
      {
        id: 'comment-6',
        authorId: 'user-8',
        author: {
          id: 'user-8',
          name: 'Ahmed Malik',
          username: 'ahmed_m',
          role: 'user'
        },
        content: 'MashaAllah! Can we donate books to the library?',
        createdAt: '2025-03-09T14:30:00Z',
        likes: 4,
        likedBy: []
      }
    ],
    shares: 56,
    bookmarkedBy: [],
    createdAt: '2025-03-09T12:00:00Z',
    updatedAt: '2025-03-09T12:00:00Z',
    mosqueId: 'mosque-3',
    mosqueName: 'Islamic Center of Excellence'
  }
]

// Initial mock community members (synced from mosques)
const initialCommunityMembers: CommunityMember[] = [
  {
    id: 'imam-1',
    name: 'Sheikh Ahmad Hassan',
    username: 'sheikh_ahmad',
    avatar: undefined,
    bio: 'Head Imam at Al-Noor Islamic Center. Dedicated to serving the community with knowledge and compassion.',
    location: 'New York, NY',
    verified: true,
    role: 'imam',
    mosqueId: '1',
    mosqueName: 'Al-Noor Islamic Center',
    position: 'Head Imam',
    department: 'Religious Affairs',
    joinedDate: '2015-06-01T00:00:00Z',
    isOnline: true,
    lastActive: new Date().toISOString(),
    postsCount: 89,
    followersCount: 2500,
    followingCount: 120
  },
  {
    id: 'imam-2',
    name: 'Hafiz Mohammed Yusuf',
    username: 'hafiz_yusuf',
    avatar: undefined,
    bio: 'Assistant Imam & Quran Teacher. Memorized the Quran at age 12.',
    location: 'New York, NY',
    verified: true,
    role: 'imam',
    mosqueId: '1',
    mosqueName: 'Al-Noor Islamic Center',
    position: 'Assistant Imam',
    department: 'Quran Education',
    joinedDate: '2018-09-01T00:00:00Z',
    isOnline: false,
    lastActive: '2025-03-15T14:30:00Z',
    postsCount: 45,
    followersCount: 1200,
    followingCount: 85
  },
  {
    id: 'user-2',
    name: 'Fatima Ali',
    username: 'fatima_a',
    avatar: undefined,
    bio: 'Mother of 3. Passionate about Islamic education for children.',
    location: 'Brooklyn, NY',
    verified: false,
    role: 'user',
    mosqueId: '1',
    mosqueName: 'Al-Noor Islamic Center',
    joinedDate: '2023-02-15T00:00:00Z',
    isOnline: true,
    lastActive: new Date().toISOString(),
    postsCount: 23,
    followersCount: 156,
    followingCount: 234
  },
  {
    id: 'user-3',
    name: 'Omar Farooq',
    username: 'omar_f',
    avatar: undefined,
    bio: 'Software engineer by day, community volunteer by heart.',
    location: 'Queens, NY',
    verified: false,
    role: 'user',
    mosqueId: '2',
    mosqueName: 'Masjid Al-Rahman',
    joinedDate: '2022-11-20T00:00:00Z',
    isOnline: true,
    lastActive: new Date().toISOString(),
    postsCount: 67,
    followersCount: 312,
    followingCount: 189
  },
  {
    id: 'user-4',
    name: 'Aisha Khan',
    username: 'aisha_k',
    avatar: undefined,
    bio: 'Medical doctor. Volunteering in community health initiatives.',
    location: 'Manhattan, NY',
    verified: false,
    role: 'user',
    mosqueId: '1',
    mosqueName: 'Al-Noor Islamic Center',
    position: 'Volunteer Coordinator',
    joinedDate: '2023-05-10T00:00:00Z',
    isOnline: false,
    lastActive: '2025-03-15T10:00:00Z',
    postsCount: 34,
    followersCount: 445,
    followingCount: 267
  },
  {
    id: 'user-5',
    name: 'Mariam Hassan',
    username: 'mariam_h',
    avatar: undefined,
    bio: 'Teacher and mother. Sharing daily reminders and duas.',
    location: 'Jersey City, NJ',
    verified: false,
    role: 'user',
    mosqueId: '4',
    mosqueName: 'Masjid As-Salam',
    joinedDate: '2024-01-05T00:00:00Z',
    isOnline: true,
    lastActive: new Date().toISOString(),
    postsCount: 56,
    followersCount: 890,
    followingCount: 234
  },
  {
    id: 'mgmt-1',
    name: 'Br. Hassan Ahmed',
    username: 'hassan_ahmed',
    avatar: undefined,
    bio: 'President of Al-Noor Islamic Center. Business executive with 25+ years experience.',
    location: 'New York, NY',
    verified: true,
    role: 'user',
    mosqueId: '1',
    mosqueName: 'Al-Noor Islamic Center',
    position: 'President',
    department: 'Board of Directors',
    joinedDate: '2020-07-01T00:00:00Z',
    isOnline: false,
    lastActive: '2025-03-14T18:00:00Z',
    postsCount: 28,
    followersCount: 678,
    followingCount: 145
  },
  {
    id: 'mgmt-2',
    name: 'Sr. Zainab Patel',
    username: 'zainab_p',
    avatar: undefined,
    bio: 'Treasurer at Al-Noor. CPA dedicated to financial transparency.',
    location: 'New York, NY',
    verified: true,
    role: 'user',
    mosqueId: '1',
    mosqueName: 'Al-Noor Islamic Center',
    position: 'Treasurer',
    department: 'Finance',
    joinedDate: '2022-07-01T00:00:00Z',
    isOnline: true,
    lastActive: new Date().toISOString(),
    postsCount: 15,
    followersCount: 234,
    followingCount: 167
  },
  {
    id: 'user-6',
    name: 'Yusuf Ibrahim',
    username: 'yusuf_i',
    avatar: undefined,
    bio: 'Student of knowledge. Sharing beneficial reminders.',
    location: 'Bronx, NY',
    verified: false,
    role: 'user',
    mosqueId: '5',
    mosqueName: 'Bronx Muslim Center',
    joinedDate: '2024-03-15T00:00:00Z',
    isOnline: false,
    lastActive: '2025-03-15T12:00:00Z',
    postsCount: 42,
    followersCount: 567,
    followingCount: 321
  },
  {
    id: 'shura-1',
    name: 'Dr. Mahmoud Al-Rashid',
    username: 'shura_chairman',
    avatar: undefined,
    bio: 'Chairman of the Shura Council. Former university professor.',
    location: 'New York, NY',
    verified: true,
    role: 'shura',
    mosqueId: '1',
    mosqueName: 'Al-Noor Islamic Center',
    position: 'Shura Chairman',
    department: 'Shura Council',
    joinedDate: '2020-01-15T00:00:00Z',
    isOnline: true,
    lastActive: new Date().toISOString(),
    postsCount: 76,
    followersCount: 3200,
    followingCount: 89
  }
]

// Initial mock spaces (live voice rooms)
const initialSpaces: Space[] = [
  {
    id: 'space-1',
    title: 'Friday Reflection: Lessons from Surah Al-Kahf',
    description: 'Join us for a live discussion on the timeless lessons from Surah Al-Kahf. Open Q&A session included.',
    hostId: 'imam-1',
    host: {
      id: 'imam-1',
      name: 'Sheikh Ahmad Hassan',
      username: 'sheikh_ahmad',
      role: 'host',
      isMuted: false,
      isSpeaking: true,
      joinedAt: '2025-03-16T14:00:00Z'
    },
    coHosts: [
      {
        id: 'imam-2',
        name: 'Hafiz Mohammed Yusuf',
        username: 'hafiz_yusuf',
        role: 'co-host',
        isMuted: true,
        isSpeaking: false,
        joinedAt: '2025-03-16T14:05:00Z'
      }
    ],
    speakers: [
      {
        id: 'user-3',
        name: 'Omar Farooq',
        username: 'omar_f',
        role: 'speaker',
        isMuted: false,
        isSpeaking: false,
        joinedAt: '2025-03-16T14:10:00Z'
      }
    ],
    listeners: [
      {
        id: 'user-2',
        name: 'Fatima Ali',
        username: 'fatima_a',
        role: 'listener',
        isMuted: true,
        joinedAt: '2025-03-16T14:02:00Z'
      },
      {
        id: 'user-4',
        name: 'Aisha Khan',
        username: 'aisha_k',
        role: 'listener',
        isMuted: true,
        joinedAt: '2025-03-16T14:08:00Z'
      }
    ],
    status: 'live',
    startedAt: '2025-03-16T14:00:00Z',
    category: 'quran',
    mosqueId: '1',
    mosqueName: 'Al-Noor Islamic Center',
    isRecorded: true,
    totalParticipants: 156,
    createdAt: '2025-03-16T10:00:00Z'
  },
  {
    id: 'space-2',
    title: 'Youth Talk: Navigating Faith in Modern Times',
    description: 'A safe space for young Muslims to discuss challenges and share experiences.',
    hostId: 'mgmt-6',
    host: {
      id: 'mgmt-6',
      name: 'Br. Zaid Ali',
      username: 'zaid_ali',
      role: 'host',
      isMuted: false,
      isSpeaking: false,
      joinedAt: '2025-03-16T18:00:00Z'
    },
    coHosts: [],
    speakers: [],
    listeners: [],
    status: 'scheduled',
    scheduledStart: '2025-03-17T18:00:00Z',
    category: 'youth',
    mosqueId: '1',
    mosqueName: 'Al-Noor Islamic Center',
    isRecorded: false,
    totalParticipants: 0,
    maxParticipants: 100,
    createdAt: '2025-03-15T12:00:00Z'
  },
  {
    id: 'space-3',
    title: 'Sisters Circle: Self-Care in Islam',
    description: 'Discussion on mental health and self-care from an Islamic perspective. Sisters only.',
    hostId: 'user-4',
    host: {
      id: 'user-4',
      name: 'Aisha Khan',
      username: 'aisha_k',
      role: 'host',
      isMuted: false,
      isSpeaking: true,
      joinedAt: '2025-03-16T15:00:00Z'
    },
    coHosts: [],
    speakers: [
      {
        id: 'user-5',
        name: 'Mariam Hassan',
        username: 'mariam_h',
        role: 'speaker',
        isMuted: false,
        isSpeaking: false,
        joinedAt: '2025-03-16T15:05:00Z'
      }
    ],
    listeners: [],
    status: 'live',
    startedAt: '2025-03-16T15:00:00Z',
    category: 'sisters',
    isRecorded: false,
    totalParticipants: 45,
    createdAt: '2025-03-16T08:00:00Z'
  },
  {
    id: 'space-4',
    title: 'Community Town Hall: Ramadan Preparation',
    description: 'Discussing plans for upcoming Ramadan activities and community iftar programs.',
    hostId: 'mgmt-1',
    host: {
      id: 'mgmt-1',
      name: 'Br. Hassan Ahmed',
      username: 'hassan_ahmed',
      role: 'host',
      isMuted: false,
      isSpeaking: false,
      joinedAt: '2025-03-18T19:00:00Z'
    },
    coHosts: [
      {
        id: 'imam-1',
        name: 'Sheikh Ahmad Hassan',
        username: 'sheikh_ahmad',
        role: 'co-host',
        isMuted: true,
        isSpeaking: false,
        joinedAt: '2025-03-18T19:00:00Z'
      }
    ],
    speakers: [],
    listeners: [],
    status: 'scheduled',
    scheduledStart: '2025-03-18T19:00:00Z',
    category: 'community',
    mosqueId: '1',
    mosqueName: 'Al-Noor Islamic Center',
    isRecorded: true,
    totalParticipants: 0,
    createdAt: '2025-03-14T10:00:00Z'
  }
]

// Initial mock video meetings
const initialVideoMeetings: VideoMeeting[] = [
  {
    id: 'meeting-1',
    title: 'Mosque Board Monthly Meeting',
    description: 'Monthly meeting to discuss mosque operations, finances, and upcoming events.',
    hostId: 'mgmt-1',
    host: {
      id: 'mgmt-1',
      name: 'Br. Hassan Ahmed',
      username: 'hassan_ahmed',
      role: 'host',
      isMuted: false,
      isVideoOn: true,
      joinedAt: '2025-03-16T19:00:00Z'
    },
    participants: [
      {
        id: 'imam-1',
        name: 'Sheikh Ahmad Hassan',
        username: 'sheikh_ahmad',
        role: 'co-host',
        isMuted: false,
        isVideoOn: true,
        joinedAt: '2025-03-16T19:02:00Z'
      },
      {
        id: 'mgmt-2',
        name: 'Sr. Zainab Patel',
        username: 'zainab_p',
        role: 'participant',
        isMuted: true,
        isVideoOn: true,
        joinedAt: '2025-03-16T19:05:00Z'
      }
    ],
    status: 'live',
    startedAt: '2025-03-16T19:00:00Z',
    category: 'meeting',
    mosqueId: '1',
    mosqueName: 'Al-Noor Islamic Center',
    isRecorded: true,
    recordings: [],
    meetingCode: 'ABC-123-XYZ',
    settings: {
      allowScreenShare: true,
      allowChat: true,
      waitingRoom: true,
      muteOnEntry: true,
      allowRecording: true
    },
    totalParticipants: 3,
    maxParticipants: 50,
    createdAt: '2025-03-14T10:00:00Z'
  },
  {
    id: 'meeting-2',
    title: 'Online Quran Class - Surah Al-Baqarah',
    description: 'Weekly online Quran class focusing on Surah Al-Baqarah. All levels welcome.',
    hostId: 'imam-2',
    host: {
      id: 'imam-2',
      name: 'Hafiz Mohammed Yusuf',
      username: 'hafiz_yusuf',
      role: 'host',
      isMuted: false,
      isVideoOn: true,
      joinedAt: '2025-03-17T10:00:00Z'
    },
    participants: [],
    status: 'scheduled',
    scheduledStart: '2025-03-17T10:00:00Z',
    category: 'quran',
    mosqueId: '1',
    mosqueName: 'Al-Noor Islamic Center',
    isRecorded: true,
    recordings: [],
    meetingCode: 'QRN-456-CLS',
    settings: {
      allowScreenShare: true,
      allowChat: true,
      waitingRoom: false,
      muteOnEntry: true,
      allowRecording: true
    },
    totalParticipants: 0,
    maxParticipants: 100,
    createdAt: '2025-03-15T08:00:00Z'
  },
  {
    id: 'meeting-3',
    title: 'Sisters Halaqah - Patience in Islam',
    description: 'Weekly sisters-only gathering to discuss Islamic topics in a comfortable environment.',
    hostId: 'user-4',
    host: {
      id: 'user-4',
      name: 'Aisha Khan',
      username: 'aisha_k',
      role: 'host',
      isMuted: false,
      isVideoOn: true,
      joinedAt: '2025-03-18T14:00:00Z'
    },
    participants: [],
    status: 'scheduled',
    scheduledStart: '2025-03-18T14:00:00Z',
    category: 'sisters',
    isRecorded: false,
    recordings: [],
    meetingCode: 'SIS-789-HLQ',
    password: 'sisters2025',
    settings: {
      allowScreenShare: false,
      allowChat: true,
      waitingRoom: true,
      muteOnEntry: false,
      allowRecording: false
    },
    totalParticipants: 0,
    maxParticipants: 30,
    createdAt: '2025-03-16T09:00:00Z'
  }
]

// Helper to generate unique IDs
const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

// Generate meeting code
const generateMeetingCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const nums = '0123456789'
  const part1 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  const part2 = Array.from({ length: 3 }, () => nums[Math.floor(Math.random() * nums.length)]).join('')
  const part3 = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `${part1}-${part2}-${part3}`
}

// Store interface
interface FeedStore {
  posts: Post[]
  currentUser: PostAuthor
  userProfile: UserProfile
  communityMembers: CommunityMember[]
  spaces: Space[]
  
  // Posts CRUD
  addPost: (post: Omit<Post, 'id' | 'createdAt' | 'updatedAt' | 'likes' | 'likedBy' | 'comments' | 'shares' | 'bookmarkedBy'>) => void
  updatePost: (id: string, post: Partial<Post>) => void
  deletePost: (id: string) => void
  
  // Interactions
  likePost: (postId: string, userId: string) => void
  unlikePost: (postId: string, userId: string) => void
  bookmarkPost: (postId: string, userId: string) => void
  unbookmarkPost: (postId: string, userId: string) => void
  sharePost: (postId: string) => void
  
  // Comments
  addComment: (postId: string, comment: Omit<PostComment, 'id' | 'createdAt' | 'likes' | 'likedBy'>) => void
  deleteComment: (postId: string, commentId: string) => void
  likeComment: (postId: string, commentId: string, userId: string) => void
  unlikeComment: (postId: string, commentId: string, userId: string) => void
  
  // Profile management
  updateProfile: (profile: Partial<UserProfile>) => void
  connectToMosque: (mosqueId: string, mosqueName: string) => void
  disconnectFromMosque: () => void
  followUser: (userId: string) => void
  unfollowUser: (userId: string) => void
  
  // Mosque-related posts
  getPostsByMosque: (mosqueId: string) => Post[]
  getPostsByUser: (userId: string) => Post[]
  
  // Community Members
  getMemberById: (memberId: string) => CommunityMember | undefined
  getMembersByMosque: (mosqueId: string) => CommunityMember[]
  getOnlineMembers: () => CommunityMember[]
  
  // Spaces
  createSpace: (space: Omit<Space, 'id' | 'createdAt' | 'totalParticipants' | 'speakers' | 'listeners' | 'coHosts'>) => void
  updateSpace: (spaceId: string, updates: Partial<Space>) => void
  deleteSpace: (spaceId: string) => void
  joinSpace: (spaceId: string, participant: SpaceParticipant) => void
  leaveSpace: (spaceId: string, participantId: string) => void
  promoteToSpeaker: (spaceId: string, participantId: string) => void
  demoteToListener: (spaceId: string, participantId: string) => void
  startSpace: (spaceId: string) => void
  endSpace: (spaceId: string) => void
  getLiveSpaces: () => Space[]
  getScheduledSpaces: () => Space[]
  getSpaceById: (spaceId: string) => Space | undefined
  addSpaceRecording: (spaceId: string, recording: Recording) => void
  
  // Video Meetings
  videoMeetings: VideoMeeting[]
  createMeeting: (meeting: Omit<VideoMeeting, 'id' | 'createdAt' | 'totalParticipants' | 'participants' | 'meetingCode' | 'recordings'>) => string
  updateMeeting: (meetingId: string, updates: Partial<VideoMeeting>) => void
  deleteMeeting: (meetingId: string) => void
  joinMeeting: (meetingId: string, participant: MeetingParticipant) => void
  leaveMeeting: (meetingId: string, participantId: string) => void
  toggleMeetingMute: (meetingId: string, participantId: string) => void
  toggleMeetingVideo: (meetingId: string, participantId: string) => void
  toggleScreenShare: (meetingId: string, participantId: string) => void
  raiseHand: (meetingId: string, participantId: string) => void
  lowerHand: (meetingId: string, participantId: string) => void
  startMeeting: (meetingId: string) => void
  endMeeting: (meetingId: string) => void
  getLiveMeetings: () => VideoMeeting[]
  getScheduledMeetings: () => VideoMeeting[]
  getMeetingById: (meetingId: string) => VideoMeeting | undefined
  getMeetingByCode: (code: string) => VideoMeeting | undefined
  addMeetingRecording: (meetingId: string, recording: Recording) => void
}

// Create the store
export const useFeedStore = create<FeedStore>()(
  persist(
    (set, get) => ({
      posts: initialPosts,
      currentUser: currentUser,
      userProfile: currentUserProfile,
      communityMembers: initialCommunityMembers,
      spaces: initialSpaces,
      videoMeetings: initialVideoMeetings,

      // Posts CRUD
      addPost: (post) => set((state) => ({
        posts: [{
          ...post,
          id: generateId('post'),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          likes: 0,
          likedBy: [],
          comments: [],
          shares: 0,
          bookmarkedBy: []
        }, ...state.posts]
      })),

      updatePost: (id, post) => set((state) => ({
        posts: state.posts.map(p => p.id === id ? { ...p, ...post, updatedAt: new Date().toISOString() } : p)
      })),

      deletePost: (id) => set((state) => ({
        posts: state.posts.filter(p => p.id !== id)
      })),

      // Interactions
      likePost: (postId, userId) => set((state) => ({
        posts: state.posts.map(p => {
          if (p.id === postId && !p.likedBy.includes(userId)) {
            return { ...p, likes: p.likes + 1, likedBy: [...p.likedBy, userId] }
          }
          return p
        })
      })),

      unlikePost: (postId, userId) => set((state) => ({
        posts: state.posts.map(p => {
          if (p.id === postId && p.likedBy.includes(userId)) {
            return { ...p, likes: p.likes - 1, likedBy: p.likedBy.filter(id => id !== userId) }
          }
          return p
        })
      })),

      bookmarkPost: (postId, userId) => set((state) => ({
        posts: state.posts.map(p => {
          if (p.id === postId && !p.bookmarkedBy.includes(userId)) {
            return { ...p, bookmarkedBy: [...p.bookmarkedBy, userId] }
          }
          return p
        })
      })),

      unbookmarkPost: (postId, userId) => set((state) => ({
        posts: state.posts.map(p => {
          if (p.id === postId && p.bookmarkedBy.includes(userId)) {
            return { ...p, bookmarkedBy: p.bookmarkedBy.filter(id => id !== userId) }
          }
          return p
        })
      })),

      sharePost: (postId) => set((state) => ({
        posts: state.posts.map(p => p.id === postId ? { ...p, shares: p.shares + 1 } : p)
      })),

      // Comments
      addComment: (postId, comment) => set((state) => ({
        posts: state.posts.map(p => {
          if (p.id === postId) {
            return {
              ...p,
              comments: [...p.comments, {
                ...comment,
                id: generateId('comment'),
                createdAt: new Date().toISOString(),
                likes: 0,
                likedBy: []
              }]
            }
          }
          return p
        })
      })),

      deleteComment: (postId, commentId) => set((state) => ({
        posts: state.posts.map(p => {
          if (p.id === postId) {
            return { ...p, comments: p.comments.filter(c => c.id !== commentId) }
          }
          return p
        })
      })),

      likeComment: (postId, commentId, userId) => set((state) => ({
        posts: state.posts.map(p => {
          if (p.id === postId) {
            return {
              ...p,
              comments: p.comments.map(c => {
                if (c.id === commentId && !c.likedBy.includes(userId)) {
                  return { ...c, likes: c.likes + 1, likedBy: [...c.likedBy, userId] }
                }
                return c
              })
            }
          }
          return p
        })
      })),

      unlikeComment: (postId, commentId, userId) => set((state) => ({
        posts: state.posts.map(p => {
          if (p.id === postId) {
            return {
              ...p,
              comments: p.comments.map(c => {
                if (c.id === commentId && c.likedBy.includes(userId)) {
                  return { ...c, likes: c.likes - 1, likedBy: c.likedBy.filter(id => id !== userId) }
                }
                return c
              })
            }
          }
          return p
        })
      })),

      // Profile management
      updateProfile: (profile) => set((state) => {
        const updatedProfile = { ...state.userProfile, ...profile }
        const updatedCurrentUser: PostAuthor = {
          id: updatedProfile.id,
          name: updatedProfile.name,
          username: updatedProfile.username,
          avatar: updatedProfile.avatar,
          verified: updatedProfile.verified,
          role: updatedProfile.role,
          connectedMosqueId: updatedProfile.connectedMosqueId,
          connectedMosqueName: updatedProfile.connectedMosqueName
        }
        return {
          userProfile: updatedProfile,
          currentUser: updatedCurrentUser
        }
      }),

      connectToMosque: (mosqueId, mosqueName) => set((state) => {
        const updatedProfile = {
          ...state.userProfile,
          connectedMosqueId: mosqueId,
          connectedMosqueName: mosqueName
        }
        return {
          userProfile: updatedProfile,
          currentUser: {
            ...state.currentUser,
            connectedMosqueId: mosqueId,
            connectedMosqueName: mosqueName
          }
        }
      }),

      disconnectFromMosque: () => set((state) => {
        const updatedProfile = {
          ...state.userProfile,
          connectedMosqueId: undefined,
          connectedMosqueName: undefined
        }
        return {
          userProfile: updatedProfile,
          currentUser: {
            ...state.currentUser,
            connectedMosqueId: undefined,
            connectedMosqueName: undefined
          }
        }
      }),

      followUser: (userId) => set((state) => ({
        userProfile: {
          ...state.userProfile,
          following: [...state.userProfile.following, userId],
          followingCount: state.userProfile.followingCount + 1
        }
      })),

      unfollowUser: (userId) => set((state) => ({
        userProfile: {
          ...state.userProfile,
          following: state.userProfile.following.filter(id => id !== userId),
          followingCount: state.userProfile.followingCount - 1
        }
      })),

      // Mosque-related posts
      getPostsByMosque: (mosqueId) => {
        const state = get()
        return state.posts.filter(p => 
          p.mosqueId === mosqueId || 
          p.author.connectedMosqueId === mosqueId ||
          p.content.toLowerCase().includes(mosqueId.toLowerCase())
        )
      },

      getPostsByUser: (userId) => {
        const state = get()
        return state.posts.filter(p => p.author.id === userId)
      },

      // Community Members
      getMemberById: (memberId) => {
        const state = get()
        return state.communityMembers.find(m => m.id === memberId)
      },

      getMembersByMosque: (mosqueId) => {
        const state = get()
        return state.communityMembers.filter(m => m.mosqueId === mosqueId)
      },

      getOnlineMembers: () => {
        const state = get()
        return state.communityMembers.filter(m => m.isOnline)
      },

      // Spaces
      createSpace: (space) => set((state) => ({
        spaces: [{
          ...space,
          id: generateId('space'),
          createdAt: new Date().toISOString(),
          totalParticipants: 1,
          coHosts: [],
          speakers: [],
          listeners: []
        }, ...state.spaces]
      })),

      updateSpace: (spaceId, updates) => set((state) => ({
        spaces: state.spaces.map(s => s.id === spaceId ? { ...s, ...updates } : s)
      })),

      deleteSpace: (spaceId) => set((state) => ({
        spaces: state.spaces.filter(s => s.id !== spaceId)
      })),

      joinSpace: (spaceId, participant) => set((state) => ({
        spaces: state.spaces.map(s => {
          if (s.id === spaceId) {
            return {
              ...s,
              listeners: [...s.listeners, participant],
              totalParticipants: s.totalParticipants + 1
            }
          }
          return s
        })
      })),

      leaveSpace: (spaceId, participantId) => set((state) => ({
        spaces: state.spaces.map(s => {
          if (s.id === spaceId) {
            return {
              ...s,
              listeners: s.listeners.filter(l => l.id !== participantId),
              speakers: s.speakers.filter(sp => sp.id !== participantId),
              coHosts: s.coHosts.filter(ch => ch.id !== participantId),
              totalParticipants: Math.max(1, s.totalParticipants - 1)
            }
          }
          return s
        })
      })),

      promoteToSpeaker: (spaceId, participantId) => set((state) => ({
        spaces: state.spaces.map(s => {
          if (s.id === spaceId) {
            const listener = s.listeners.find(l => l.id === participantId)
            if (listener) {
              return {
                ...s,
                listeners: s.listeners.filter(l => l.id !== participantId),
                speakers: [...s.speakers, { ...listener, role: 'speaker' as const, isMuted: false }]
              }
            }
          }
          return s
        })
      })),

      demoteToListener: (spaceId, participantId) => set((state) => ({
        spaces: state.spaces.map(s => {
          if (s.id === spaceId) {
            const speaker = s.speakers.find(sp => sp.id === participantId)
            if (speaker) {
              return {
                ...s,
                speakers: s.speakers.filter(sp => sp.id !== participantId),
                listeners: [...s.listeners, { ...speaker, role: 'listener' as const, isMuted: true }]
              }
            }
          }
          return s
        })
      })),

      startSpace: (spaceId) => set((state) => ({
        spaces: state.spaces.map(s => 
          s.id === spaceId 
            ? { ...s, status: 'live' as const, startedAt: new Date().toISOString() } 
            : s
        )
      })),

      endSpace: (spaceId) => set((state) => ({
        spaces: state.spaces.map(s => 
          s.id === spaceId 
            ? { ...s, status: 'ended' as const, endedAt: new Date().toISOString() } 
            : s
        )
      })),

      getLiveSpaces: () => {
        const state = get()
        return state.spaces.filter(s => s.status === 'live')
      },

      getScheduledSpaces: () => {
        const state = get()
        return state.spaces.filter(s => s.status === 'scheduled')
      },

      getSpaceById: (spaceId) => {
        const state = get()
        return state.spaces.find(s => s.id === spaceId)
      },

      addSpaceRecording: (spaceId, recording) => set((state) => ({
        spaces: state.spaces.map(s => 
          s.id === spaceId 
            ? { ...s, recordings: [...(s.recordings || []), recording] } 
            : s
        )
      })),

      // Video Meetings
      createMeeting: (meeting) => {
        const meetingId = generateId('meeting')
        const meetingCode = generateMeetingCode()
        set((state) => ({
          videoMeetings: [{
            ...meeting,
            id: meetingId,
            meetingCode,
            createdAt: new Date().toISOString(),
            totalParticipants: 1,
            participants: [],
            recordings: []
          }, ...state.videoMeetings]
        }))
        return meetingCode
      },

      updateMeeting: (meetingId, updates) => set((state) => ({
        videoMeetings: state.videoMeetings.map(m => m.id === meetingId ? { ...m, ...updates } : m)
      })),

      deleteMeeting: (meetingId) => set((state) => ({
        videoMeetings: state.videoMeetings.filter(m => m.id !== meetingId)
      })),

      joinMeeting: (meetingId, participant) => set((state) => ({
        videoMeetings: state.videoMeetings.map(m => {
          if (m.id === meetingId) {
            return {
              ...m,
              participants: [...m.participants, participant],
              totalParticipants: m.totalParticipants + 1
            }
          }
          return m
        })
      })),

      leaveMeeting: (meetingId, participantId) => set((state) => ({
        videoMeetings: state.videoMeetings.map(m => {
          if (m.id === meetingId) {
            return {
              ...m,
              participants: m.participants.filter(p => p.id !== participantId),
              totalParticipants: Math.max(1, m.totalParticipants - 1)
            }
          }
          return m
        })
      })),

      toggleMeetingMute: (meetingId, participantId) => set((state) => ({
        videoMeetings: state.videoMeetings.map(m => {
          if (m.id === meetingId) {
            if (m.host.id === participantId) {
              return { ...m, host: { ...m.host, isMuted: !m.host.isMuted } }
            }
            return {
              ...m,
              participants: m.participants.map(p => 
                p.id === participantId ? { ...p, isMuted: !p.isMuted } : p
              )
            }
          }
          return m
        })
      })),

      toggleMeetingVideo: (meetingId, participantId) => set((state) => ({
        videoMeetings: state.videoMeetings.map(m => {
          if (m.id === meetingId) {
            if (m.host.id === participantId) {
              return { ...m, host: { ...m.host, isVideoOn: !m.host.isVideoOn } }
            }
            return {
              ...m,
              participants: m.participants.map(p => 
                p.id === participantId ? { ...p, isVideoOn: !p.isVideoOn } : p
              )
            }
          }
          return m
        })
      })),

      toggleScreenShare: (meetingId, participantId) => set((state) => ({
        videoMeetings: state.videoMeetings.map(m => {
          if (m.id === meetingId) {
            // Turn off screen share for everyone else first
            const participants = m.participants.map(p => ({ ...p, isScreenSharing: false }))
            const host = { ...m.host, isScreenSharing: false }
            
            if (m.host.id === participantId) {
              return { ...m, host: { ...host, isScreenSharing: !m.host.isScreenSharing }, participants }
            }
            return {
              ...m,
              host,
              participants: participants.map(p => 
                p.id === participantId ? { ...p, isScreenSharing: !m.participants.find(mp => mp.id === participantId)?.isScreenSharing } : p
              )
            }
          }
          return m
        })
      })),

      raiseHand: (meetingId, participantId) => set((state) => ({
        videoMeetings: state.videoMeetings.map(m => {
          if (m.id === meetingId) {
            return {
              ...m,
              participants: m.participants.map(p => 
                p.id === participantId ? { ...p, isHandRaised: true } : p
              )
            }
          }
          return m
        })
      })),

      lowerHand: (meetingId, participantId) => set((state) => ({
        videoMeetings: state.videoMeetings.map(m => {
          if (m.id === meetingId) {
            return {
              ...m,
              participants: m.participants.map(p => 
                p.id === participantId ? { ...p, isHandRaised: false } : p
              )
            }
          }
          return m
        })
      })),

      startMeeting: (meetingId) => set((state) => ({
        videoMeetings: state.videoMeetings.map(m => 
          m.id === meetingId 
            ? { ...m, status: 'live' as const, startedAt: new Date().toISOString() } 
            : m
        )
      })),

      endMeeting: (meetingId) => set((state) => ({
        videoMeetings: state.videoMeetings.map(m => 
          m.id === meetingId 
            ? { ...m, status: 'ended' as const, endedAt: new Date().toISOString() } 
            : m
        )
      })),

      getLiveMeetings: () => {
        const state = get()
        return state.videoMeetings.filter(m => m.status === 'live')
      },

      getScheduledMeetings: () => {
        const state = get()
        return state.videoMeetings.filter(m => m.status === 'scheduled')
      },

      getMeetingById: (meetingId) => {
        const state = get()
        return state.videoMeetings.find(m => m.id === meetingId)
      },

      getMeetingByCode: (code) => {
        const state = get()
        return state.videoMeetings.find(m => m.meetingCode === code)
      },

      addMeetingRecording: (meetingId, recording) => set((state) => ({
        videoMeetings: state.videoMeetings.map(m => 
          m.id === meetingId 
            ? { ...m, recordings: [...(m.recordings || []), recording] } 
            : m
        )
      }))
    }),
    {
      name: 'mosque-connect-feed',
    }
  )
)
