"use client"

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { 
  shuraMembers as initialShuraMembers,
  mosqueVisits as initialMosqueVisits,
  shuraMeetings as initialShuraMeetings,
  mosqueRegistrations as initialMosqueRegistrations,
  mosqueAssessments as initialMosqueAssessments,
  imamAppointments as initialImamAppointments,
  lectures as initialLectures,
  mosques as initialMosques,
  imamCandidates as initialImamCandidates,
  shuraTeams as initialShuraTeams
} from '@/lib/data/shura-mock-data'

// Types for enhanced CRUD operations
export interface ShuraMemberCRUD {
  id: string
  name: string
  title: string
  photoUrl?: string
  biography?: string
  email: string
  phone: string
  role: string
  status: 'active' | 'inactive' | 'on-leave'
  assignedRegions: string[]
  mosquesAssigned: number
  visitsCompleted: number
  performanceScore: number
  joinDate: string
  expertise?: string[]
  languages?: string[]
}

export interface MosqueVisitCRUD {
  id: string
  mosqueId: string
  shuraMemberId: string
  visitType: string
  scheduledDate: string
  scheduledTime: string
  actualDate?: string
  duration?: number
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'postponed'
  purpose: string
  agenda: string[]
  attendees: string[]
  findings?: string
  recommendations?: string[]
  followUpRequired: boolean
  followUpDate?: string
  followUpNotes?: string
  rating?: {
    overallRating: number
    categories: Record<string, number>
    strengths: string[]
    areasForImprovement: string[]
    comments?: string
  }
  createdAt: string
  updatedAt: string
}

export interface ShuraMeetingCRUD {
  id: string
  title: string
  meetingType: string
  scheduledDate: string
  scheduledTime: string
  duration: number
  location: string
  isVirtual: boolean
  meetingLink?: string
  mosqueId?: string
  attendeeIds: string[]
  agenda: string
  notes?: string
  decisions?: string[]
  actionItems?: string[]
  status: 'draft' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  organizerId: string
  createdAt: string
  updatedAt: string
}

export interface MosqueRegistrationCRUD {
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
  status: 'pending_review' | 'under_review' | 'visit_scheduled' | 'approved' | 'rejected' | 'on_hold' | 'more_info_needed'
  reviewedBy?: string
  reviewDate?: string
  reviewNotes?: string
  assignedShuraMember?: string
  visitScheduled?: string
  createdAt: string
}

export interface MosqueAssessmentCRUD {
  id: string
  mosqueId: string
  overallRating: number
  totalVisits: number
  lastVisitDate: string
  status: 'excellent' | 'good' | 'satisfactory' | 'needs_improvement' | 'under_review' | 'probation'
  categoryRatings: Record<string, number>
  certificationLevel?: 'gold' | 'silver' | 'bronze' | 'basic'
  nextScheduledVisit?: string
  notes?: string
  updatedAt: string
}

export interface LectureCRUD {
  id: string
  title: string
  topic: string
  speaker: string
  speakerId?: string
  speakerImage?: string
  speakerRole?: string
  type: 'friday-khutbah' | 'educational' | 'special-event' | 'training'
  date: string
  time: string
  duration?: string
  venue: string
  venueId?: string
  status: 'upcoming' | 'completed' | 'cancelled'
  attendees: number
  hasRecording: boolean
  recordingUrl?: string
  views?: number
  description?: string
  createdAt: string
}

export interface ImamAppointmentCRUD {
  id: string
  candidateName: string
  candidateEmail: string
  candidatePhone: string
  candidateImage?: string
  mosqueName: string
  mosqueId: string
  position: string
  qualifications: string
  experience: string
  references: string
  interviewDate?: string
  interviewNotes?: string
  status: 'pending' | 'interview' | 'approved' | 'rejected' | 'appointed'
  proposedDate: string
  notes?: string
  reviewedBy: string[]
  decision?: 'approved' | 'rejected' | 'deferred'
  decisionDate?: string
  decisionNotes?: string
  createdAt: string
}

export interface MosqueCRUD {
  id: string
  name: string
  address: string
  city?: string
  state?: string
  zipCode?: string
  country?: string
  website?: string
  facilities?: string[]
  programs?: string[]
  notes?: string
  region: string
  capacity: number
  registrationStatus: 'registered' | 'pending' | 'unregistered'
  needsImam: boolean
  positionNeeded?: string
  imam?: string
  phone?: string
  email?: string
  rating?: number
  lastVisit?: string
  assignedShuraMember?: string
}

export interface ImamCandidateCRUD {
  id: string
  name: string
  specialization: string
  education: string
  experience: number
  rating: number
  languages: string[]
  status: 'available' | 'assigned' | 'unavailable'
  image?: string
  email?: string
  phone?: string
  currentMosque?: string
}

export interface ShuraTeamCRUD {
  id: string
  name: string
  description: string
  lead: string
  leadId: string
  region: string
  members: string[]
  tasksCompleted: number
  totalTasks: number
  createdAt: string
}

// Store interface
interface ShuraStore {
  // Data
  members: ShuraMemberCRUD[]
  visits: MosqueVisitCRUD[]
  meetings: ShuraMeetingCRUD[]
  registrations: MosqueRegistrationCRUD[]
  assessments: MosqueAssessmentCRUD[]
  lectures: LectureCRUD[]
  imamAppointments: ImamAppointmentCRUD[]
  mosques: MosqueCRUD[]
  imamCandidates: ImamCandidateCRUD[]
  teams: ShuraTeamCRUD[]

  // Members CRUD
  addMember: (member: Omit<ShuraMemberCRUD, 'id'>) => void
  updateMember: (id: string, member: Partial<ShuraMemberCRUD>) => void
  deleteMember: (id: string) => void

  // Visits CRUD
  addVisit: (visit: Omit<MosqueVisitCRUD, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateVisit: (id: string, visit: Partial<MosqueVisitCRUD>) => void
  deleteVisit: (id: string) => void

  // Meetings CRUD
  addMeeting: (meeting: Omit<ShuraMeetingCRUD, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateMeeting: (id: string, meeting: Partial<ShuraMeetingCRUD>) => void
  deleteMeeting: (id: string) => void

  // Registrations CRUD
  addRegistration: (registration: Omit<MosqueRegistrationCRUD, 'id' | 'createdAt' | 'submittedDate'>) => void
  updateRegistration: (id: string, registration: Partial<MosqueRegistrationCRUD>) => void
  deleteRegistration: (id: string) => void
  approveRegistration: (id: string, notes?: string) => void
  rejectRegistration: (id: string, notes?: string) => void

  // Assessments CRUD
  addAssessment: (assessment: Omit<MosqueAssessmentCRUD, 'id' | 'updatedAt'>) => void
  updateAssessment: (id: string, assessment: Partial<MosqueAssessmentCRUD>) => void
  deleteAssessment: (id: string) => void

  // Lectures CRUD
  addLecture: (lecture: Omit<LectureCRUD, 'id' | 'createdAt'>) => void
  updateLecture: (id: string, lecture: Partial<LectureCRUD>) => void
  deleteLecture: (id: string) => void

  // Imam Appointments CRUD
  addImamAppointment: (appointment: Omit<ImamAppointmentCRUD, 'id' | 'createdAt'>) => void
  updateImamAppointment: (id: string, appointment: Partial<ImamAppointmentCRUD>) => void
  deleteImamAppointment: (id: string) => void
  approveImamAppointment: (id: string, notes?: string) => void
  rejectImamAppointment: (id: string, notes?: string) => void

  // Mosques CRUD
  addMosque: (mosque: Omit<MosqueCRUD, 'id'>) => void
  updateMosque: (id: string, mosque: Partial<MosqueCRUD>) => void
  deleteMosque: (id: string) => void

  // Imam Candidates CRUD
  addImamCandidate: (candidate: Omit<ImamCandidateCRUD, 'id'>) => void
  updateImamCandidate: (id: string, candidate: Partial<ImamCandidateCRUD>) => void
  deleteImamCandidate: (id: string) => void

  // Teams CRUD
  addTeam: (team: Omit<ShuraTeamCRUD, 'id' | 'createdAt'>) => void
  updateTeam: (id: string, team: Partial<ShuraTeamCRUD>) => void
  deleteTeam: (id: string) => void
}

// Helper to generate unique IDs
const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

// Transform initial data to match our CRUD types
const transformInitialMembers = (): ShuraMemberCRUD[] => {
  return initialShuraMembers.map((m, idx) => ({
    id: m.id,
    name: m.name,
    title: m.title,
    photoUrl: m.photoUrl,
    biography: m.biography,
    email: m.email,
    phone: m.phone,
    role: m.title.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    status: m.isActive ? 'active' as const : 'inactive' as const,
    assignedRegions: m.assignedRegions || ['General'],
    mosquesAssigned: [12, 8, 0, 0, 15, 10][idx] || 5,
    visitsCompleted: [45, 32, 28, 15, 52, 24][idx] || 20,
    performanceScore: [95, 92, 88, 90, 94, 86][idx] || 85,
    joinDate: m.appointmentDate,
    expertise: m.expertise,
    languages: m.languages
  }))
}

const transformInitialVisits = (): MosqueVisitCRUD[] => {
  return initialMosqueVisits.map(v => ({
    ...v,
    status: v.status as MosqueVisitCRUD['status']
  }))
}

const transformInitialMeetings = (): ShuraMeetingCRUD[] => {
  return initialShuraMeetings.map(m => {
    const start = new Date(`1970-01-01T${m.startTime.length === 5 ? m.startTime + ':00' : m.startTime}Z`)
    const end = new Date(`1970-01-01T${m.endTime.length === 5 ? m.endTime + ':00' : m.endTime}Z`)
    const duration = Math.round((end.getTime() - start.getTime()) / 60000)

    return {
      id: m.id,
      title: m.title,
      meetingType: m.meetingType,
      scheduledDate: m.date,
      scheduledTime: m.startTime,
      duration: duration || 60,
    location: m.location,
    isVirtual: m.isVirtual,
    meetingLink: m.meetingLink,
    mosqueId: m.mosqueId,
    attendeeIds: m.attendees.map(a => a.id),
    agenda: m.agenda.map(a => a.title).join('\n'),
    notes: m.minutes,
    decisions: m.decisions,
    actionItems: m.actionItems?.map(a => a.description),
    status: m.status as ShuraMeetingCRUD['status'],
    organizerId: m.createdBy,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt
  }
})
}

const transformInitialRegistrations = (): MosqueRegistrationCRUD[] => {
  return initialMosqueRegistrations.map(r => ({
    ...r,
    status: r.status as MosqueRegistrationCRUD['status']
  }))
}

const transformInitialAssessments = (): MosqueAssessmentCRUD[] => {
  return initialMosqueAssessments.map(a => ({
    ...a,
    status: a.status as MosqueAssessmentCRUD['status'],
    certificationLevel: a.certificationLevel as MosqueAssessmentCRUD['certificationLevel']
  }))
}

const transformInitialLectures = (): LectureCRUD[] => {
  return initialLectures.map(l => ({
    id: l.id,
    title: l.title,
    topic: l.topic,
    speaker: l.speaker,
    speakerImage: l.speakerImage,
    speakerRole: l.speakerRole,
    type: l.type as LectureCRUD['type'],
    date: l.date,
    time: l.time,
    duration: l.duration,
    venue: l.venue,
    status: l.status as LectureCRUD['status'],
    attendees: l.attendees || 0,
    hasRecording: l.hasRecording || false,
    views: l.views,
    createdAt: l.date
  }))
}

const transformInitialImamAppointments = (): ImamAppointmentCRUD[] => {
  return initialImamAppointments.map(a => ({
    id: a.id,
    candidateName: a.candidateName,
    candidateEmail: a.candidateEmail,
    candidatePhone: a.candidatePhone,
    photoUrl: a.photoUrl,
    mosqueName: initialMosques.find(m => m.id === a.targetMosqueId)?.name || 'Unknown Mosque',
    mosqueId: a.targetMosqueId,
    position: a.position,
    qualifications: a.qualifications.map(q => `${q.degree} in ${q.field} from ${q.institution}`).join(', '),
    experience: a.experience.map(e => `${e.position} at ${e.mosqueName}`).join(', '),
    references: a.references.map(r => `${r.name} (${r.position})`).join(', '),
    interviewDate: a.interviewDate,
    interviewNotes: a.interviewNotes,
    status: (a.status === 'interview_scheduled' ? 'interview' : 
             a.status === 'application_received' ? 'pending' :
             a.status === 'pending_decision' ? 'pending' :
             a.status) as ImamAppointmentCRUD['status'],
    proposedDate: a.appointmentDate || a.interviewDate || a.createdAt,
    notes: a.decisionNotes,
    reviewedBy: a.reviewedBy,
    decision: a.decision,
    decisionDate: a.decisionDate,
    decisionNotes: a.decisionNotes,
    createdAt: a.createdAt
  }))
}

const transformInitialMosques = (): MosqueCRUD[] => {
  return initialMosques.map(m => ({
    id: m.id,
    name: m.name,
    address: m.address,
    region: m.region,
    capacity: m.capacity,
    registrationStatus: m.registrationStatus as MosqueCRUD['registrationStatus'],
    needsImam: m.needsImam,
    positionNeeded: m.positionNeeded
  }))
}

const transformInitialCandidates = (): ImamCandidateCRUD[] => {
  return initialImamCandidates.map(c => ({
    id: c.id,
    name: c.name,
    specialization: c.specialization,
    education: c.education,
    experience: c.experience,
    rating: c.rating,
    languages: c.languages,
    status: c.status as ImamCandidateCRUD['status'],
    image: c.image
  }))
}

const transformInitialTeams = (): ShuraTeamCRUD[] => {
  return initialShuraTeams.map(t => ({
    id: t.id,
    name: t.name,
    description: t.description,
    lead: t.lead,
    leadId: t.members[0] || '',
    region: t.region,
    members: t.members,
    tasksCompleted: t.tasksCompleted,
    totalTasks: t.totalTasks,
    createdAt: new Date().toISOString()
  }))
}

// Create the store
export const useShuraStore = create<ShuraStore>()(
  persist(
    (set) => ({
      // Initial data
      members: transformInitialMembers(),
      visits: transformInitialVisits(),
      meetings: transformInitialMeetings(),
      registrations: transformInitialRegistrations(),
      assessments: transformInitialAssessments(),
      lectures: transformInitialLectures(),
      imamAppointments: transformInitialImamAppointments(),
      mosques: transformInitialMosques(),
      imamCandidates: transformInitialCandidates(),
      teams: transformInitialTeams(),

      // Members CRUD
      addMember: (member) => set((state) => ({
        members: [...state.members, { ...member, id: generateId('member') }]
      })),
      updateMember: (id, member) => set((state) => ({
        members: state.members.map(m => m.id === id ? { ...m, ...member } : m)
      })),
      deleteMember: (id) => set((state) => ({
        members: state.members.filter(m => m.id !== id)
      })),

      // Visits CRUD
      addVisit: (visit) => set((state) => ({
        visits: [...state.visits, { 
          ...visit, 
          id: generateId('visit'),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }]
      })),
      updateVisit: (id, visit) => set((state) => ({
        visits: state.visits.map(v => v.id === id ? { ...v, ...visit, updatedAt: new Date().toISOString() } : v)
      })),
      deleteVisit: (id) => set((state) => ({
        visits: state.visits.filter(v => v.id !== id)
      })),

      // Meetings CRUD
      addMeeting: (meeting) => set((state) => ({
        meetings: [...state.meetings, { 
          ...meeting, 
          id: generateId('meeting'),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }]
      })),
      updateMeeting: (id, meeting) => set((state) => ({
        meetings: state.meetings.map(m => m.id === id ? { ...m, ...meeting, updatedAt: new Date().toISOString() } : m)
      })),
      deleteMeeting: (id) => set((state) => ({
        meetings: state.meetings.filter(m => m.id !== id)
      })),

      // Registrations CRUD
      addRegistration: (registration) => set((state) => ({
        registrations: [...state.registrations, { 
          ...registration, 
          id: generateId('reg'),
          createdAt: new Date().toISOString(),
          submittedDate: new Date().toISOString(),
          status: 'pending_review' as const
        }]
      })),
      updateRegistration: (id, registration) => set((state) => ({
        registrations: state.registrations.map(r => r.id === id ? { ...r, ...registration } : r)
      })),
      deleteRegistration: (id) => set((state) => ({
        registrations: state.registrations.filter(r => r.id !== id)
      })),
      approveRegistration: (id, notes) => set((state) => ({
        registrations: state.registrations.map(r => r.id === id ? { 
          ...r, 
          status: 'approved' as const,
          reviewDate: new Date().toISOString(),
          reviewNotes: notes
        } : r)
      })),
      rejectRegistration: (id, notes) => set((state) => ({
        registrations: state.registrations.map(r => r.id === id ? { 
          ...r, 
          status: 'rejected' as const,
          reviewDate: new Date().toISOString(),
          reviewNotes: notes
        } : r)
      })),

      // Assessments CRUD
      addAssessment: (assessment) => set((state) => ({
        assessments: [...state.assessments, { 
          ...assessment, 
          id: generateId('assess'),
          updatedAt: new Date().toISOString()
        }]
      })),
      updateAssessment: (id, assessment) => set((state) => ({
        assessments: state.assessments.map(a => a.id === id ? { ...a, ...assessment, updatedAt: new Date().toISOString() } : a)
      })),
      deleteAssessment: (id) => set((state) => ({
        assessments: state.assessments.filter(a => a.id !== id)
      })),

      // Lectures CRUD
      addLecture: (lecture) => set((state) => ({
        lectures: [...state.lectures, { 
          ...lecture, 
          id: generateId('lecture'),
          createdAt: new Date().toISOString()
        }]
      })),
      updateLecture: (id, lecture) => set((state) => ({
        lectures: state.lectures.map(l => l.id === id ? { ...l, ...lecture } : l)
      })),
      deleteLecture: (id) => set((state) => ({
        lectures: state.lectures.filter(l => l.id !== id)
      })),

      // Imam Appointments CRUD
      addImamAppointment: (appointment) => set((state) => ({
        imamAppointments: [...state.imamAppointments, { 
          ...appointment, 
          id: generateId('appt'),
          createdAt: new Date().toISOString(),
          status: 'pending' as const
        }]
      })),
      updateImamAppointment: (id, appointment) => set((state) => ({
        imamAppointments: state.imamAppointments.map(a => a.id === id ? { ...a, ...appointment } : a)
      })),
      deleteImamAppointment: (id) => set((state) => ({
        imamAppointments: state.imamAppointments.filter(a => a.id !== id)
      })),
      approveImamAppointment: (id, notes) => set((state) => ({
        imamAppointments: state.imamAppointments.map(a => a.id === id ? { 
          ...a, 
          status: 'approved' as const,
          decision: 'approved' as const,
          decisionDate: new Date().toISOString(),
          decisionNotes: notes
        } : a)
      })),
      rejectImamAppointment: (id, notes) => set((state) => ({
        imamAppointments: state.imamAppointments.map(a => a.id === id ? { 
          ...a, 
          status: 'rejected' as const,
          decision: 'rejected' as const,
          decisionDate: new Date().toISOString(),
          decisionNotes: notes
        } : a)
      })),

      // Mosques CRUD
      addMosque: (mosque) => set((state) => ({
        mosques: [...state.mosques, { ...mosque, id: generateId('mosque') }]
      })),
      updateMosque: (id, mosque) => set((state) => ({
        mosques: state.mosques.map(m => m.id === id ? { ...m, ...mosque } : m)
      })),
      deleteMosque: (id) => set((state) => ({
        mosques: state.mosques.filter(m => m.id !== id)
      })),

      // Imam Candidates CRUD
      addImamCandidate: (candidate) => set((state) => ({
        imamCandidates: [...state.imamCandidates, { ...candidate, id: generateId('cand') }]
      })),
      updateImamCandidate: (id, candidate) => set((state) => ({
        imamCandidates: state.imamCandidates.map(c => c.id === id ? { ...c, ...candidate } : c)
      })),
      deleteImamCandidate: (id) => set((state) => ({
        imamCandidates: state.imamCandidates.filter(c => c.id !== id)
      })),

      // Teams CRUD
      addTeam: (team) => set((state) => ({
        teams: [...state.teams, { 
          ...team, 
          id: generateId('team'),
          createdAt: new Date().toISOString()
        }]
      })),
      updateTeam: (id, team) => set((state) => ({
        teams: state.teams.map(t => t.id === id ? { ...t, ...team } : t)
      })),
      deleteTeam: (id) => set((state) => ({
        teams: state.teams.filter(t => t.id !== id)
      })),
    }),
    {
      name: 'shura-storage',
      version: 1,
    }
  )
)
