// Core Types for Mosque Management Application

export interface Mosque {
  id: string
  name: string
  address: string
  city: string
  state: string
  country: string
  zipCode: string
  latitude: number
  longitude: number
  phone: string
  email: string
  website?: string
  description: string
  imageUrl: string
  facilities: string[]
  capacity: number
  establishedYear: number
  isVerified: boolean
  adminId?: string
  createdAt: string
  updatedAt: string
}

export interface PrayerTime {
  id: string
  mosqueId: string
  date: string
  fajr: string
  fajrIqama: string
  sunrise: string
  dhuhr: string
  dhuhrIqama: string
  asr: string
  asrIqama: string
  maghrib: string
  maghribIqama: string
  isha: string
  ishaIqama: string
  jummah?: string
  jummahIqama?: string
  isAutoCalculated: boolean
}

export interface Event {
  id: string
  mosqueId: string
  title: string
  description: string
  category: EventCategory
  startDate: string
  endDate: string
  startTime: string
  endTime: string
  location: string
  speaker?: string
  isRecurring: boolean
  recurrencePattern?: RecurrencePattern
  maxAttendees?: number
  currentAttendees: number
  imageUrl?: string
  isActive: boolean
  createdAt: string
}

export type EventCategory = 
  | 'jummah'
  | 'lecture'
  | 'class'
  | 'quran_study'
  | 'youth_program'
  | 'sisters_program'
  | 'community_event'
  | 'fundraiser'
  | 'iftar'
  | 'eid'
  | 'other'

export type RecurrencePattern = 'daily' | 'weekly' | 'monthly' | 'yearly'

export interface FinanceRecord {
  id: string
  mosqueId: string
  type: 'donation' | 'expense'
  category: FinanceCategory
  amount: number
  description: string
  date: string
  donorName?: string
  isAnonymous: boolean
  receiptNumber?: string
  createdAt: string
}

export type FinanceCategory = 
  | 'zakat'
  | 'sadaqah'
  | 'building_fund'
  | 'operational'
  | 'education'
  | 'utilities'
  | 'maintenance'
  | 'salaries'
  | 'events'
  | 'charity'
  | 'other'

export interface DonationGoal {
  id: string
  mosqueId: string
  title: string
  description: string
  targetAmount: number
  currentAmount: number
  startDate: string
  endDate: string
  isActive: boolean
}

export interface Announcement {
  id: string
  mosqueId: string
  title: string
  content: string
  category: AnnouncementCategory
  isPinned: boolean
  publishDate: string
  expiryDate?: string
  authorName: string
  isActive: boolean
  createdAt: string
}

export type AnnouncementCategory = 
  | 'general'
  | 'prayer'
  | 'event'
  | 'urgent'
  | 'community'
  | 'education'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  mosqueId?: string
  avatarUrl?: string
  phone?: string
  createdAt: string
}

export type UserRole = 'admin' | 'mosque_admin' | 'member' | 'visitor'

// Imam Profile
export interface Imam {
  id: string
  mosqueId: string
  name: string
  title: string // e.g., "Head Imam", "Assistant Imam", "Khateeb"
  photoUrl?: string
  biography: string
  education: ImamEducation[]
  specializations: string[] // e.g., "Quranic Recitation", "Islamic Jurisprudence", "Youth Counseling"
  languages: string[]
  yearsOfExperience: number
  previousPositions: ImamPosition[]
  certifications: string[]
  contactEmail?: string
  contactPhone?: string
  officeHours?: string
  socialMedia?: {
    youtube?: string
    twitter?: string
    facebook?: string
    instagram?: string
  }
  publications?: string[]
  // Enhanced character and personal details
  characterTraits?: string[] // e.g., "Compassionate", "Patient", "Scholarly"
  teachingStyle?: string // Description of how they teach
  communityFocus?: string[] // Areas they focus on in the community
  personalMessage?: string // A message from the imam to the community
  availableServices?: string[] // Services they provide: counseling, nikah, etc.
  weeklySchedule?: ImamWeeklySchedule[]
  isActive: boolean
  appointmentDate: string
  createdAt: string
}

export interface ImamWeeklySchedule {
  day: string
  activities: string[]
}

export interface ImamEducation {
  institution: string
  degree: string
  field: string
  year: number
  location: string
}

export interface ImamPosition {
  mosqueName: string
  position: string
  location: string
  startYear: number
  endYear?: number
}

// Mosque Management Body / Committee
export interface ManagementMember {
  id: string
  mosqueId: string
  name: string
  position: ManagementPosition
  department?: string
  photoUrl?: string
  biography?: string
  email: string
  phone?: string
  responsibilities: string[]
  termStartDate: string
  termEndDate?: string
  isElected: boolean
  isActive: boolean
  createdAt: string
  // Enhanced profile fields
  profession?: string // Their day job / professional background
  education?: MemberEducation[]
  skills?: string[] // Professional skills they bring
  achievements?: string[] // Notable achievements in mosque service
  previousRoles?: MemberPreviousRole[] // Previous roles in mosque/community
  availability?: string // When they're available for meetings
  officeHours?: string // If applicable
  languages?: string[]
  yearsOfService?: number
  personalStatement?: string // Why they serve
  committees?: string[] // Committees they're part of
  socialMedia?: {
    linkedin?: string
    twitter?: string
  }
}

export interface MemberEducation {
  degree: string
  institution: string
  field?: string
  year?: number
}

export interface MemberPreviousRole {
  position: string
  organization: string
  years: string
}

export type ManagementPosition = 
  | 'president'
  | 'vice_president'
  | 'secretary'
  | 'treasurer'
  | 'trustee'
  | 'board_member'
  | 'committee_head'
  | 'volunteer_coordinator'
  | 'education_director'
  | 'youth_director'
  | 'women_coordinator'
  | 'facilities_manager'
  | 'security_head'
  | 'other'

export interface PrayerTimesApiResponse {
  code: number
  status: string
  data: {
    timings: {
      Fajr: string
      Sunrise: string
      Dhuhr: string
      Asr: string
      Maghrib: string
      Isha: string
    }
    date: {
      readable: string
      gregorian: {
        date: string
        day: string
        month: { number: number; en: string }
        year: string
      }
      hijri: {
        date: string
        day: string
        month: { number: number; en: string; ar: string }
        year: string
      }
    }
  }
}

// ==========================================
// SHURA COUNCIL TYPES
// High-level governance overseeing all mosques
// ==========================================

export interface ShuraMember {
  id: string
  name: string
  title: ShuraTitle
  photoUrl?: string
  biography: string
  email: string
  phone: string
  education: MemberEducation[]
  expertise: string[]
  languages: string[]
  yearsInShura: number
  previousPositions: MemberPreviousRole[]
  responsibilities: string[]
  assignedRegions?: string[] // Regions/areas they oversee
  certifications?: string[]
  personalStatement?: string
  availability: string
  officeHours?: string
  socialMedia?: {
    linkedin?: string
    twitter?: string
  }
  appointmentDate: string
  termEndDate?: string
  isActive: boolean
  createdAt: string
}

export type ShuraTitle =
  | 'chairman'
  | 'vice_chairman'
  | 'secretary_general'
  | 'treasurer'
  | 'religious_advisor'
  | 'education_head'
  | 'outreach_coordinator'
  | 'member'

// Mosque Visit by Shura Member
export interface MosqueVisit {
  id: string
  mosqueId: string
  shuraMemberId: string
  visitType: VisitType
  scheduledDate: string
  scheduledTime: string
  actualDate?: string
  duration?: number // in minutes
  status: VisitStatus
  purpose: string
  agenda: string[]
  attendees: string[] // Names of people attending
  findings?: string
  recommendations?: string[]
  followUpRequired: boolean
  followUpDate?: string
  followUpNotes?: string
  rating?: MosqueVisitRating
  createdAt: string
  updatedAt: string
}

export type VisitType = 
  | 'routine_inspection'
  | 'imam_meeting'
  | 'management_meeting'
  | 'special_assessment'
  | 'follow_up'
  | 'emergency'
  | 'inauguration'
  | 'lecture_delivery'

export type VisitStatus = 
  | 'scheduled'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'postponed'

export interface MosqueVisitRating {
  overallRating: number // 1-5
  categories: {
    cleanliness: number
    prayerServices: number
    educationPrograms: number
    communityEngagement: number
    financialTransparency: number
    managementEfficiency: number
    imamPerformance: number
    youthPrograms: number
    womenFacilities: number
    safetyCompliance: number
  }
  strengths: string[]
  areasForImprovement: string[]
  comments?: string
}

// Shura Meeting
export interface ShuraMeeting {
  id: string
  title: string
  meetingType: ShuraMeetingType
  date: string
  startTime: string
  endTime: string
  location: string // Can be physical location or "Online"
  isVirtual: boolean
  meetingLink?: string
  attendees: ShuraMeetingAttendee[]
  mosqueId?: string // If meeting is with specific mosque
  imamId?: string // If meeting is with specific imam
  agenda: ShuraAgendaItem[]
  minutes?: string
  decisions?: string[]
  actionItems?: ShuraActionItem[]
  status: MeetingStatus
  createdBy: string
  createdAt: string
  updatedAt: string
}

export type ShuraMeetingType =
  | 'shura_council'
  | 'mosque_review'
  | 'imam_interview'
  | 'imam_evaluation'
  | 'dispute_resolution'
  | 'planning_session'
  | 'emergency'
  | 'training'
  | 'community_outreach'

export type MeetingStatus =
  | 'draft'
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'cancelled'

export interface ShuraMeetingAttendee {
  id: string
  name: string
  role: string
  isShuraMember: boolean
  attendance?: 'present' | 'absent' | 'excused' | 'pending'
}

export interface ShuraAgendaItem {
  id: string
  title: string
  description?: string
  presenter?: string
  duration: number // in minutes
  priority: 'high' | 'medium' | 'low'
  status: 'pending' | 'discussed' | 'deferred'
  notes?: string
}

export interface ShuraActionItem {
  id: string
  description: string
  assignedTo: string
  dueDate: string
  status: 'pending' | 'in_progress' | 'completed' | 'overdue'
  priority: 'high' | 'medium' | 'low'
}

// Mosque Registration (for mosques not yet part of network)
export interface MosqueRegistration {
  id: string
  mosqueName: string
  address: string
  city: string
  state: string
  country: string
  zipCode: string
  contactPerson: string
  contactEmail: string
  contactPhone: string
  estimatedCapacity: number
  establishedYear?: number
  currentImamName?: string
  facilities: string[]
  description?: string
  submittedDate: string
  status: RegistrationStatus
  reviewedBy?: string
  reviewDate?: string
  reviewNotes?: string
  assignedShuraMember?: string
  visitScheduled?: string
  documents?: RegistrationDocument[]
  createdAt: string
}

export type RegistrationStatus =
  | 'pending_review'
  | 'under_review'
  | 'visit_scheduled'
  | 'approved'
  | 'rejected'
  | 'on_hold'
  | 'more_info_needed'

export interface RegistrationDocument {
  id: string
  name: string
  type: 'registration_cert' | 'tax_exempt' | 'bylaws' | 'photos' | 'other'
  url: string
  uploadedAt: string
}

// Mosque Rating & Assessment (cumulative from visits)
export interface MosqueAssessment {
  id: string
  mosqueId: string
  overallRating: number
  totalVisits: number
  lastVisitDate: string
  status: MosqueComplianceStatus
  categoryRatings: {
    cleanliness: number
    prayerServices: number
    educationPrograms: number
    communityEngagement: number
    financialTransparency: number
    managementEfficiency: number
    imamPerformance: number
    youthPrograms: number
    womenFacilities: number
    safetyCompliance: number
  }
  certificationLevel?: 'gold' | 'silver' | 'bronze' | 'basic'
  nextScheduledVisit?: string
  notes?: string
  updatedAt: string
}

export type MosqueComplianceStatus =
  | 'excellent'
  | 'good'
  | 'satisfactory'
  | 'needs_improvement'
  | 'under_review'
  | 'probation'

// Imam Appointment by Shura
export interface ImamAppointment {
  id: string
  candidateName: string
  candidateEmail: string
  candidatePhone: string
  photoUrl?: string
  targetMosqueId: string
  position: string
  qualifications: ImamEducation[]
  experience: ImamPosition[]
  references: ImamReference[]
  interviewDate?: string
  interviewNotes?: string
  status: AppointmentStatus
  reviewedBy: string[]
  decision?: 'approved' | 'rejected' | 'deferred'
  decisionDate?: string
  decisionNotes?: string
  appointmentDate?: string
  createdAt: string
}

export type AppointmentStatus =
  | 'application_received'
  | 'under_review'
  | 'interview_scheduled'
  | 'interview_completed'
  | 'pending_decision'
  | 'approved'
  | 'rejected'
  | 'appointed'

export interface ImamReference {
  name: string
  position: string
  organization: string
  phone: string
  email: string
  relationship: string
}

// ==========================================
// LIBRARY / SHELF TYPES
// Books and inventory management for mosques
// ==========================================

export interface LibraryBook {
  id: string
  mosqueId: string
  title: string
  author: string
  isbn?: string
  category: BookCategory
  language: string
  description?: string
  coverImageUrl?: string
  publisher?: string
  publishYear?: number
  totalCopies: number
  availableCopies: number
  location: string // e.g., "Shelf A-3", "Main Library"
  condition: BookCondition
  addedBy: string
  addedByName: string
  status: LibraryItemStatus
  approvedBy?: string
  approvedDate?: string
  rejectionReason?: string
  tags?: string[]
  isReferencOnly?: boolean // Cannot be borrowed
  createdAt: string
  updatedAt: string
}

export type BookCategory =
  | 'quran'
  | 'hadith'
  | 'fiqh'
  | 'tafseer'
  | 'seerah'
  | 'arabic'
  | 'islamic_history'
  | 'spirituality'
  | 'children'
  | 'youth'
  | 'women'
  | 'comparative_religion'
  | 'general_islamic'
  | 'other'

export type BookCondition =
  | 'new'
  | 'excellent'
  | 'good'
  | 'fair'
  | 'poor'

export type LibraryItemStatus =
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'archived'

export interface LibraryItem {
  id: string
  mosqueId: string
  name: string
  type: LibraryItemType
  category: string
  description?: string
  imageUrl?: string
  quantity: number
  availableQuantity: number
  location: string
  condition: BookCondition
  addedBy: string
  addedByName: string
  status: LibraryItemStatus
  approvedBy?: string
  approvedDate?: string
  rejectionReason?: string
  createdAt: string
  updatedAt: string
}

export type LibraryItemType =
  | 'prayer_mat'
  | 'prayer_cap'
  | 'quran_stand'
  | 'audio_equipment'
  | 'educational_material'
  | 'display_item'
  | 'furniture'
  | 'other'

export interface BookBorrowing {
  id: string
  bookId: string
  mosqueId: string
  borrowerName: string
  borrowerEmail: string
  borrowerPhone: string
  borrowDate: string
  dueDate: string
  returnDate?: string
  status: BorrowingStatus
  notes?: string
  createdAt: string
}

export type BorrowingStatus =
  | 'active'
  | 'returned'
  | 'overdue'
  | 'lost'
