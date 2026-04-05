import type { 
  ShuraMember, 
  MosqueVisit, 
  ShuraMeeting, 
  MosqueRegistration, 
  MosqueAssessment,
  ImamAppointment 
} from '../types'

// Shura Council Members
export const shuraMembers: ShuraMember[] = [
  {
    id: 'shura-1',
    name: 'Sheikh Dr. Abdul Rahman Al-Farsi',
    title: 'chairman',
    photoUrl: '/images/shura-1.jpg',
    biography: 'Sheikh Dr. Abdul Rahman has dedicated over 35 years to Islamic scholarship and community leadership. A graduate of Al-Azhar University, he has served Muslim communities across three continents. His vision for unified mosque governance has shaped the foundation of our Shura Council, emphasizing accountability, transparency, and service excellence.',
    email: 'chairman@shuracouncil.org',
    phone: '+1 (212) 555-1001',
    education: [
      { degree: 'PhD', institution: 'Al-Azhar University', field: 'Islamic Jurisprudence', year: 1995 },
      { degree: 'MA', institution: 'International Islamic University Malaysia', field: 'Comparative Fiqh', year: 1990 },
      { degree: 'BA', institution: 'Islamic University of Madinah', field: 'Sharia', year: 1985 }
    ],
    expertise: ['Islamic Jurisprudence', 'Mosque Governance', 'Interfaith Relations', 'Conflict Resolution', 'Strategic Planning'],
    languages: ['Arabic', 'English', 'Urdu', 'Malay'],
    yearsInShura: 12,
    previousPositions: [
      { position: 'Head Imam', organization: 'Islamic Center of London', years: '2000-2012' },
      { position: 'Professor of Islamic Studies', organization: 'IIUM Malaysia', years: '1995-2000' }
    ],
    responsibilities: [
      'Chair all Shura Council meetings',
      'Final approval on major decisions affecting mosques',
      'Represent the Council in interfaith dialogues',
      'Oversee strategic direction of all affiliated mosques',
      'Approve imam appointments for major positions'
    ],
    assignedRegions: ['Northeast', 'International Relations'],
    certifications: ['Ijazah in Six Books of Hadith', 'Islamic Finance Certification'],
    personalStatement: 'Our mosques are the hearts of our communities. My life\'s mission is to ensure every mosque under our care operates with the highest standards of Islamic authenticity, transparent governance, and genuine service to the Ummah. We are accountable to Allah first, then to the communities we serve.',
    availability: 'Available by appointment, prefers scheduled meetings',
    officeHours: 'Tuesdays & Thursdays: 10 AM - 2 PM',
    appointmentDate: '2012-01-15',
    isActive: true,
    createdAt: '2024-01-01'
  },
  {
    id: 'shura-2',
    name: 'Dr. Amina Khatib',
    title: 'vice_chairman',
    photoUrl: '/images/shura-2.jpg',
    biography: 'Dr. Amina brings a unique combination of Islamic scholarship and modern organizational expertise. With a PhD in Islamic Studies and an MBA, she has pioneered programs for women\'s engagement in mosque governance. Her research on inclusive mosque practices has been published internationally.',
    email: 'vice.chairman@shuracouncil.org',
    phone: '+1 (212) 555-1002',
    education: [
      { degree: 'PhD', institution: 'McGill University', field: 'Islamic Studies', year: 2005 },
      { degree: 'MBA', institution: 'Wharton School', field: 'Non-Profit Management', year: 2008 },
      { degree: 'BA', institution: 'University of Jordan', field: 'Arabic Literature', year: 1998 }
    ],
    expertise: ['Women\'s Programs', 'Organizational Development', 'Education Curriculum', 'Community Outreach', 'Policy Development'],
    languages: ['Arabic', 'English', 'French'],
    yearsInShura: 8,
    previousPositions: [
      { position: 'Director of Women\'s Programs', organization: 'Islamic Society of North America', years: '2008-2016' },
      { position: 'Assistant Professor', organization: 'Hartford Seminary', years: '2005-2008' }
    ],
    responsibilities: [
      'Deputize for Chairman in all matters',
      'Lead women\'s facility assessments at mosques',
      'Develop educational standards for mosque schools',
      'Coordinate inter-mosque programs',
      'Chair the Education Committee'
    ],
    assignedRegions: ['Midwest', 'Women\'s Programs Nationwide'],
    personalStatement: 'Islam honors women, and our mosques must reflect that honor. I work to ensure every mosque provides dignified, accessible, and engaging spaces for our sisters. Inclusion is not optional—it is an Islamic mandate.',
    availability: 'Available via email and scheduled calls',
    officeHours: 'Mondays & Wednesdays: 1 PM - 4 PM',
    appointmentDate: '2016-06-01',
    isActive: true,
    createdAt: '2024-01-01'
  },
  {
    id: 'shura-3',
    name: 'Sheikh Yusuf Ibrahim',
    title: 'religious_advisor',
    photoUrl: '/images/shura-3.jpg',
    biography: 'Sheikh Yusuf is a renowned scholar specializing in Imam training and mosque religious standards. He has trained over 200 imams and established the certification program used across our network. His expertise in various schools of thought enables him to advise on diverse community needs.',
    email: 'religious.advisor@shuracouncil.org',
    phone: '+1 (212) 555-1003',
    education: [
      { degree: 'Traditional Ijazah', institution: 'Darul Uloom Deoband', field: 'Islamic Sciences', year: 1988 },
      { degree: 'MA', institution: 'University of Oxford', field: 'Islamic History', year: 1992 }
    ],
    expertise: ['Imam Training', 'Fatwa Guidance', 'Quranic Sciences', 'Hadith Studies', 'Fiqh Counseling'],
    languages: ['Arabic', 'English', 'Urdu', 'Persian'],
    yearsInShura: 15,
    previousPositions: [
      { position: 'Director of Imam Training', organization: 'Zaytuna College', years: '2000-2009' },
      { position: 'Senior Imam', organization: 'East London Mosque', years: '1992-2000' }
    ],
    responsibilities: [
      'Evaluate imam qualifications and appointments',
      'Conduct imam performance reviews',
      'Provide religious guidance on disputed matters',
      'Develop religious curriculum standards',
      'Lead imam training workshops'
    ],
    assignedRegions: ['All Regions - Religious Matters'],
    certifications: ['Ijazah in Quran (10 Qiraat)', 'Ijazah in Bukhari & Muslim', 'Licensed Mufti'],
    personalStatement: 'The imam is the shepherd of the community. My role is to ensure we have qualified, compassionate, and knowledgeable shepherds leading our mosques. Quality religious leadership transforms communities.',
    availability: 'Available for urgent religious consultations anytime',
    officeHours: 'Daily after Dhuhr prayer (by appointment)',
    appointmentDate: '2009-03-01',
    isActive: true,
    createdAt: '2024-01-01'
  },
  {
    id: 'shura-4',
    name: 'Br. Tariq Mahmoud, CPA',
    title: 'treasurer',
    photoUrl: '/images/shura-4.jpg',
    biography: 'Brother Tariq is a certified public accountant with expertise in non-profit financial management. He has developed the financial transparency standards used across all affiliated mosques and conducts regular audits to ensure accountability.',
    email: 'treasurer@shuracouncil.org',
    phone: '+1 (212) 555-1004',
    education: [
      { degree: 'CPA', institution: 'AICPA', year: 2000 },
      { degree: 'MBA', institution: 'NYU Stern', field: 'Finance', year: 1998 },
      { degree: 'BS', institution: 'Rutgers University', field: 'Accounting', year: 1995 }
    ],
    expertise: ['Financial Auditing', 'Non-Profit Compliance', 'Zakat Distribution', 'Budgeting', 'Grant Management'],
    languages: ['English', 'Arabic', 'Urdu'],
    yearsInShura: 10,
    previousPositions: [
      { position: 'CFO', organization: 'Islamic Relief USA', years: '2005-2014' },
      { position: 'Senior Auditor', organization: 'Deloitte', years: '1998-2005' }
    ],
    responsibilities: [
      'Oversee financial audits of all mosques',
      'Review and approve mosque budgets',
      'Ensure zakat compliance standards',
      'Train mosque treasurers',
      'Manage Shura Council finances'
    ],
    assignedRegions: ['All Regions - Financial Oversight'],
    personalStatement: 'Every dollar donated is a trust from Allah. My job is to ensure that trust is honored through rigorous transparency and accountability. When communities trust their mosque finances, they give more generously.',
    availability: 'Available for financial emergencies',
    officeHours: 'Fridays: 9 AM - 12 PM',
    appointmentDate: '2014-01-01',
    isActive: true,
    createdAt: '2024-01-01'
  },
  {
    id: 'shura-5',
    name: 'Sr. Khadija Osman',
    title: 'outreach_coordinator',
    photoUrl: '/images/shura-5.jpg',
    biography: 'Sister Khadija specializes in bringing unaffiliated mosques into the network and establishing relationships with new Muslim communities. Her background in community organizing and interfaith work has helped onboard 50+ mosques.',
    email: 'outreach@shuracouncil.org',
    phone: '+1 (212) 555-1005',
    education: [
      { degree: 'MA', institution: 'Columbia University', field: 'Social Work', year: 2010 },
      { degree: 'BA', institution: 'Howard University', field: 'Political Science', year: 2006 }
    ],
    expertise: ['Community Organizing', 'Mosque Registration', 'Interfaith Relations', 'New Muslim Support', 'Conflict Mediation'],
    languages: ['English', 'Arabic', 'Somali', 'Swahili'],
    yearsInShura: 6,
    previousPositions: [
      { position: 'Community Liaison', organization: 'NYC Mayor\'s Office', years: '2010-2018' },
      { position: 'Outreach Director', organization: 'Islamic Circle of North America', years: '2006-2010' }
    ],
    responsibilities: [
      'Process new mosque registrations',
      'Conduct initial mosque assessments',
      'Build relationships with unaffiliated mosques',
      'Coordinate interfaith initiatives',
      'Support new Muslim communities'
    ],
    assignedRegions: ['Southeast', 'New Registrations Nationwide'],
    personalStatement: 'Every mosque, no matter how small or new, deserves support and guidance. I see my role as extending a helping hand to communities that want to be part of something bigger—a unified Ummah working together.',
    availability: 'Highly available, travels frequently',
    officeHours: 'By appointment (prefers in-person visits)',
    appointmentDate: '2018-09-01',
    isActive: true,
    createdAt: '2024-01-01'
  },
  {
    id: 'shura-6',
    name: 'Dr. Hassan Malik',
    title: 'education_head',
    photoUrl: '/images/shura-6.jpg',
    biography: 'Dr. Hassan leads the educational standards and curriculum development for all mosque schools and programs. With experience in both Islamic and Western educational systems, he bridges traditional knowledge with modern pedagogy.',
    email: 'education@shuracouncil.org',
    phone: '+1 (212) 555-1006',
    education: [
      { degree: 'EdD', institution: 'Harvard Graduate School of Education', field: 'Educational Leadership', year: 2012 },
      { degree: 'MA', institution: 'Islamic University of Madinah', field: 'Hadith Sciences', year: 2005 },
      { degree: 'BA', institution: 'UC Berkeley', field: 'Education', year: 2000 }
    ],
    expertise: ['Curriculum Development', 'Teacher Training', 'Youth Programs', 'Islamic Pedagogy', 'Assessment Standards'],
    languages: ['English', 'Arabic'],
    yearsInShura: 5,
    previousPositions: [
      { position: 'Principal', organization: 'Al-Noor Academy', years: '2012-2019' },
      { position: 'Education Consultant', organization: 'Muslim American Society', years: '2008-2012' }
    ],
    responsibilities: [
      'Develop educational standards for mosque schools',
      'Train and certify mosque teachers',
      'Assess educational programs during visits',
      'Create youth engagement frameworks',
      'Coordinate Quran memorization programs'
    ],
    assignedRegions: ['West Coast', 'Education Programs Nationwide'],
    personalStatement: 'Our children are our future scholars, leaders, and community builders. I work to ensure every mosque provides excellent Islamic education that is authentic, engaging, and relevant to the challenges our youth face.',
    availability: 'Available during school hours',
    officeHours: 'Saturdays: 10 AM - 1 PM (Weekend School Visits)',
    appointmentDate: '2019-06-15',
    isActive: true,
    createdAt: '2024-01-01'
  }
]

// Mosque Visits
export const mosqueVisits: MosqueVisit[] = [
  {
    id: 'visit-1',
    mosqueId: '1',
    shuraMemberId: 'shura-1',
    visitType: 'routine_inspection',
    scheduledDate: '2024-03-15',
    scheduledTime: '10:00',
    actualDate: '2024-03-15',
    duration: 180,
    status: 'completed',
    purpose: 'Annual comprehensive assessment of mosque operations, facilities, and programs',
    agenda: [
      'Meet with mosque president and board',
      'Review financial records',
      'Inspect facilities and prayer halls',
      'Assess educational programs',
      'Meet with head imam',
      'Community feedback session'
    ],
    attendees: ['Sheikh Dr. Abdul Rahman', 'Br. Ahmed Khalil', 'Sheikh Abdullah Siddiqui', 'Dr. Yusuf Ali'],
    findings: 'Excellent overall management. Facilities well-maintained. Strong educational programs. Community engagement is exemplary. Minor improvements needed in women\'s section ventilation.',
    recommendations: [
      'Upgrade HVAC system in women\'s prayer area',
      'Consider expanding youth programs to include career counseling',
      'Document financial processes for new treasurer training'
    ],
    followUpRequired: true,
    followUpDate: '2024-06-15',
    followUpNotes: 'Check on HVAC upgrades and youth program expansion',
    rating: {
      overallRating: 4.5,
      categories: {
        cleanliness: 5,
        prayerServices: 5,
        educationPrograms: 4,
        communityEngagement: 5,
        financialTransparency: 5,
        managementEfficiency: 4,
        imamPerformance: 5,
        youthPrograms: 4,
        womenFacilities: 3,
        safetyCompliance: 5
      },
      strengths: ['Strong leadership', 'Excellent imam', 'Active community', 'Transparent finances'],
      areasForImprovement: ['Women\'s facilities', 'Youth career programs'],
      comments: 'One of our top-performing mosques. A model for others to follow.'
    },
    createdAt: '2024-02-01',
    updatedAt: '2024-03-16'
  },
  {
    id: 'visit-2',
    mosqueId: '2',
    shuraMemberId: 'shura-3',
    visitType: 'imam_meeting',
    scheduledDate: '2024-03-20',
    scheduledTime: '14:00',
    status: 'scheduled',
    purpose: 'Annual imam performance review and guidance session',
    agenda: [
      'Review khutbah quality and topics',
      'Discuss community feedback on imam services',
      'Assess educational classes',
      'Provide guidance on contemporary issues',
      'Plan for Ramadan preparations'
    ],
    attendees: ['Sheikh Yusuf Ibrahim', 'Sheikh Hassan Ahmed', 'Mosque President'],
    followUpRequired: false,
    createdAt: '2024-03-01',
    updatedAt: '2024-03-01'
  },
  {
    id: 'visit-3',
    mosqueId: '3',
    shuraMemberId: 'shura-5',
    visitType: 'special_assessment',
    scheduledDate: '2024-03-25',
    scheduledTime: '11:00',
    status: 'confirmed',
    purpose: 'Initial assessment for newly registered mosque seeking full membership',
    agenda: [
      'Verify registration documents',
      'Assess facilities and capacity',
      'Meet with local leadership',
      'Evaluate current programs',
      'Discuss membership requirements',
      'Address any concerns or questions'
    ],
    attendees: ['Sr. Khadija Osman', 'Local Mosque Committee'],
    followUpRequired: true,
    createdAt: '2024-03-05',
    updatedAt: '2024-03-10'
  },
  {
    id: 'visit-4',
    mosqueId: '1',
    shuraMemberId: 'shura-2',
    visitType: 'lecture_delivery',
    scheduledDate: '2024-04-05',
    scheduledTime: '19:30',
    status: 'scheduled',
    purpose: 'Deliver lecture on "Women\'s Leadership in Islamic History" for sisters program',
    agenda: [
      'Evening lecture (1.5 hours)',
      'Q&A session',
      'Meet with women\'s committee',
      'Brief assessment of women\'s programs'
    ],
    attendees: ['Dr. Amina Khatib', 'Women\'s Committee Members'],
    followUpRequired: false,
    createdAt: '2024-03-10',
    updatedAt: '2024-03-10'
  }
]

// Shura Meetings
export const shuraMeetings: ShuraMeeting[] = [
  {
    id: 'meeting-1',
    title: 'Q1 2024 Shura Council Meeting',
    meetingType: 'shura_council',
    date: '2024-03-01',
    startTime: '10:00',
    endTime: '15:00',
    location: 'Shura Council Headquarters',
    isVirtual: false,
    attendees: [
      { id: 'shura-1', name: 'Sheikh Dr. Abdul Rahman Al-Farsi', role: 'Chairman', isShuraMember: true, attendance: 'present' },
      { id: 'shura-2', name: 'Dr. Amina Khatib', role: 'Vice Chairman', isShuraMember: true, attendance: 'present' },
      { id: 'shura-3', name: 'Sheikh Yusuf Ibrahim', role: 'Religious Advisor', isShuraMember: true, attendance: 'present' },
      { id: 'shura-4', name: 'Br. Tariq Mahmoud', role: 'Treasurer', isShuraMember: true, attendance: 'present' },
      { id: 'shura-5', name: 'Sr. Khadija Osman', role: 'Outreach Coordinator', isShuraMember: true, attendance: 'present' },
      { id: 'shura-6', name: 'Dr. Hassan Malik', role: 'Education Head', isShuraMember: true, attendance: 'excused' }
    ],
    agenda: [
      { id: 'agenda-1', title: 'Review of Q4 2023 Visit Reports', presenter: 'Sr. Khadija Osman', duration: 45, priority: 'high', status: 'discussed' },
      { id: 'agenda-2', title: 'Financial Report - All Mosques', presenter: 'Br. Tariq Mahmoud', duration: 30, priority: 'high', status: 'discussed' },
      { id: 'agenda-3', title: 'New Mosque Registration Applications', presenter: 'Sr. Khadija Osman', duration: 45, priority: 'medium', status: 'discussed' },
      { id: 'agenda-4', title: 'Imam Appointment - Masjid Al-Hidayah', presenter: 'Sheikh Yusuf Ibrahim', duration: 30, priority: 'high', status: 'discussed' },
      { id: 'agenda-5', title: 'Education Standards Update', presenter: 'Dr. Hassan Malik', duration: 30, priority: 'medium', status: 'deferred' },
      { id: 'agenda-6', title: 'Ramadan Coordination Plan', presenter: 'Dr. Amina Khatib', duration: 45, priority: 'high', status: 'discussed' }
    ],
    minutes: 'Full minutes recorded and distributed to all members. Key discussions centered on expanding outreach to unaffiliated mosques in the Southeast region and standardizing Ramadan programs across the network.',
    decisions: [
      'Approved 3 new mosque registrations for full membership',
      'Appointed Sheikh Ibrahim Hassan as Imam of Masjid Al-Hidayah',
      'Allocated $50,000 for mosque improvement grants',
      'Established unified Ramadan taraweeh schedule guidelines'
    ],
    actionItems: [
      { id: 'action-1', description: 'Send approval letters to newly registered mosques', assignedTo: 'Sr. Khadija Osman', dueDate: '2024-03-08', status: 'completed', priority: 'high' },
      { id: 'action-2', description: 'Coordinate imam appointment ceremony', assignedTo: 'Sheikh Yusuf Ibrahim', dueDate: '2024-03-15', status: 'completed', priority: 'high' },
      { id: 'action-3', description: 'Distribute Ramadan guidelines to all mosques', assignedTo: 'Dr. Amina Khatib', dueDate: '2024-03-10', status: 'in_progress', priority: 'medium' }
    ],
    status: 'completed',
    createdBy: 'shura-1',
    createdAt: '2024-02-15',
    updatedAt: '2024-03-02'
  },
  {
    id: 'meeting-2',
    title: 'Imam Interview - Candidate for Al-Rahman Mosque',
    meetingType: 'imam_interview',
    date: '2024-03-18',
    startTime: '14:00',
    endTime: '16:00',
    location: 'Online',
    isVirtual: true,
    meetingLink: 'https://zoom.us/j/123456789',
    mosqueId: '2',
    attendees: [
      { id: 'shura-3', name: 'Sheikh Yusuf Ibrahim', role: 'Religious Advisor', isShuraMember: true, attendance: 'pending' },
      { id: 'shura-1', name: 'Sheikh Dr. Abdul Rahman Al-Farsi', role: 'Chairman', isShuraMember: true, attendance: 'pending' },
      { id: 'candidate-1', name: 'Sheikh Muhammad Ali', role: 'Imam Candidate', isShuraMember: false, attendance: 'pending' },
      { id: 'mgmt-al-rahman', name: 'Mosque President - Al-Rahman', role: 'Observer', isShuraMember: false, attendance: 'pending' }
    ],
    agenda: [
      { id: 'agenda-1', title: 'Candidate Introduction & Background', duration: 20, priority: 'high', status: 'pending' },
      { id: 'agenda-2', title: 'Quranic Recitation Assessment', duration: 15, priority: 'high', status: 'pending' },
      { id: 'agenda-3', title: 'Fiqh Knowledge Evaluation', duration: 30, priority: 'high', status: 'pending' },
      { id: 'agenda-4', title: 'Community Leadership Questions', duration: 20, priority: 'medium', status: 'pending' },
      { id: 'agenda-5', title: 'Q&A with Candidate', duration: 25, priority: 'medium', status: 'pending' }
    ],
    status: 'scheduled',
    createdBy: 'shura-3',
    createdAt: '2024-03-10',
    updatedAt: '2024-03-10'
  },
  {
    id: 'meeting-3',
    title: 'Emergency Meeting - Dispute Resolution at Masjid Al-Taqwa',
    meetingType: 'dispute_resolution',
    date: '2024-03-12',
    startTime: '18:00',
    endTime: '20:00',
    location: 'Masjid Al-Taqwa',
    isVirtual: false,
    mosqueId: '3',
    attendees: [
      { id: 'shura-1', name: 'Sheikh Dr. Abdul Rahman Al-Farsi', role: 'Chairman', isShuraMember: true, attendance: 'present' },
      { id: 'shura-2', name: 'Dr. Amina Khatib', role: 'Vice Chairman', isShuraMember: true, attendance: 'present' },
      { id: 'local-1', name: 'Br. Yusuf Khan', role: 'Mosque President', isShuraMember: false, attendance: 'present' },
      { id: 'local-2', name: 'Br. Ahmad Malik', role: 'Board Member', isShuraMember: false, attendance: 'present' }
    ],
    agenda: [
      { id: 'agenda-1', title: 'Understand the Dispute', duration: 30, priority: 'high', status: 'discussed' },
      { id: 'agenda-2', title: 'Hear All Parties', duration: 45, priority: 'high', status: 'discussed' },
      { id: 'agenda-3', title: 'Mediation & Resolution', duration: 45, priority: 'high', status: 'discussed' }
    ],
    minutes: 'Dispute regarding governance procedures. Both parties agreed to follow updated bylaws. New election to be held within 60 days.',
    decisions: [
      'Current board to continue operations until new election',
      'Shura Council to oversee election process',
      'Updated bylaws to be adopted immediately'
    ],
    status: 'completed',
    createdBy: 'shura-1',
    createdAt: '2024-03-11',
    updatedAt: '2024-03-13'
  }
]

// Mosque Registrations
export const mosqueRegistrations: MosqueRegistration[] = [
  {
    id: 'reg-1',
    mosqueName: 'Masjid Al-Hidayah',
    address: '456 Community Drive',
    city: 'Houston',
    state: 'Texas',
    country: 'USA',
    zipCode: '77001',
    contactPerson: 'Br. Ibrahim Hassan',
    contactEmail: 'info@masjidalhidayah.org',
    contactPhone: '+1 (713) 555-0100',
    estimatedCapacity: 400,
    establishedYear: 2020,
    currentImamName: 'Sheikh Bilal Ahmad',
    facilities: ['Prayer Hall', 'Wudu Area', 'Parking', 'Community Room'],
    description: 'Growing community mosque seeking to join the network for guidance and support.',
    submittedDate: '2024-02-15',
    status: 'approved',
    reviewedBy: 'shura-5',
    reviewDate: '2024-03-01',
    reviewNotes: 'Excellent facility, dedicated leadership. Approved for full membership.',
    assignedShuraMember: 'shura-5',
    createdAt: '2024-02-15'
  },
  {
    id: 'reg-2',
    mosqueName: 'Islamic Center of Riverside',
    address: '789 Riverside Blvd',
    city: 'Riverside',
    state: 'California',
    country: 'USA',
    zipCode: '92501',
    contactPerson: 'Sr. Fatima Gonzalez',
    contactEmail: 'contact@icriverside.org',
    contactPhone: '+1 (951) 555-0200',
    estimatedCapacity: 250,
    establishedYear: 2018,
    currentImamName: 'Imam Abdul Kareem',
    facilities: ['Prayer Hall', 'Women\'s Section', 'Classroom', 'Kitchen'],
    description: 'Diverse community serving Riverside area. Seeking resources for youth programs.',
    submittedDate: '2024-03-05',
    status: 'visit_scheduled',
    reviewedBy: 'shura-5',
    reviewDate: '2024-03-10',
    reviewNotes: 'Promising application. Site visit scheduled to assess facilities.',
    assignedShuraMember: 'shura-6',
    visitScheduled: '2024-03-25',
    createdAt: '2024-03-05'
  },
  {
    id: 'reg-3',
    mosqueName: 'Masjid Al-Furqan',
    address: '321 Oak Street',
    city: 'Atlanta',
    state: 'Georgia',
    country: 'USA',
    zipCode: '30301',
    contactPerson: 'Br. Mustafa Williams',
    contactEmail: 'admin@masjidalfurqan.org',
    contactPhone: '+1 (404) 555-0300',
    estimatedCapacity: 150,
    establishedYear: 2022,
    facilities: ['Prayer Hall', 'Small Parking Lot'],
    description: 'Small but growing community. Need guidance on governance and programming.',
    submittedDate: '2024-03-10',
    status: 'under_review',
    assignedShuraMember: 'shura-5',
    createdAt: '2024-03-10'
  },
  {
    id: 'reg-4',
    mosqueName: 'Baitul Mukarram',
    address: '555 Queens Blvd',
    city: 'New York',
    state: 'New York',
    country: 'USA',
    zipCode: '11373',
    contactPerson: 'Br. Rahim Chowdhury',
    contactEmail: 'info@baitulmukarram.org',
    contactPhone: '+1 (718) 555-0400',
    estimatedCapacity: 800,
    establishedYear: 2010,
    currentImamName: 'Maulana Abdul Haq',
    facilities: ['Large Prayer Hall', 'Women\'s Section', 'Weekend School', 'Funeral Services', 'Parking Garage'],
    description: 'Established mosque serving Bangladeshi community. Seeking to join network for inter-mosque collaboration.',
    submittedDate: '2024-03-12',
    status: 'pending_review',
    createdAt: '2024-03-12'
  }
]

// Mosque Assessments
export const mosqueAssessments: MosqueAssessment[] = [
  {
    id: 'assess-1',
    mosqueId: '1',
    overallRating: 4.5,
    totalVisits: 8,
    lastVisitDate: '2024-03-15',
    status: 'excellent',
    categoryRatings: {
      cleanliness: 5,
      prayerServices: 5,
      educationPrograms: 4,
      communityEngagement: 5,
      financialTransparency: 5,
      managementEfficiency: 4,
      imamPerformance: 5,
      youthPrograms: 4,
      womenFacilities: 3,
      safetyCompliance: 5
    },
    certificationLevel: 'gold',
    nextScheduledVisit: '2024-09-15',
    notes: 'Consistently high performer. Model mosque for the network.',
    updatedAt: '2024-03-16'
  },
  {
    id: 'assess-2',
    mosqueId: '2',
    overallRating: 4.0,
    totalVisits: 5,
    lastVisitDate: '2024-01-20',
    status: 'good',
    categoryRatings: {
      cleanliness: 4,
      prayerServices: 5,
      educationPrograms: 4,
      communityEngagement: 4,
      financialTransparency: 4,
      managementEfficiency: 4,
      imamPerformance: 4,
      youthPrograms: 3,
      womenFacilities: 4,
      safetyCompliance: 4
    },
    certificationLevel: 'silver',
    nextScheduledVisit: '2024-07-20',
    notes: 'Good overall. Youth programs need strengthening.',
    updatedAt: '2024-01-21'
  },
  {
    id: 'assess-3',
    mosqueId: '3',
    overallRating: 3.2,
    totalVisits: 3,
    lastVisitDate: '2023-12-01',
    status: 'needs_improvement',
    categoryRatings: {
      cleanliness: 3,
      prayerServices: 4,
      educationPrograms: 3,
      communityEngagement: 3,
      financialTransparency: 2,
      managementEfficiency: 3,
      imamPerformance: 4,
      youthPrograms: 3,
      womenFacilities: 3,
      safetyCompliance: 4
    },
    certificationLevel: 'bronze',
    nextScheduledVisit: '2024-04-01',
    notes: 'Governance issues being addressed. Financial transparency needs improvement.',
    updatedAt: '2023-12-02'
  }
]

// Imam Appointments
export const imamAppointments: ImamAppointment[] = [
  {
    id: 'appt-1',
    candidateName: 'Sheikh Muhammad Ali',
    candidateEmail: 'sheikh.mali@email.com',
    candidatePhone: '+1 (555) 123-4567',
    targetMosqueId: '2',
    position: 'Assistant Imam',
    qualifications: [
      { institution: 'Islamic University of Madinah', degree: 'BA', field: 'Islamic Studies', year: 2018, location: 'Saudi Arabia' },
      { institution: 'Al-Azhar University', degree: 'MA', field: 'Hadith Sciences', year: 2021, location: 'Egypt' }
    ],
    experience: [
      { mosqueName: 'Islamic Center of Denver', position: 'Youth Coordinator', location: 'Denver, CO', startYear: 2021, endYear: 2023 }
    ],
    references: [
      { name: 'Sheikh Ahmad Bilal', position: 'Head Imam', organization: 'Islamic Center of Denver', phone: '+1 (303) 555-1000', email: 'sheikh.bilal@icd.org', relationship: 'Direct Supervisor' },
      { name: 'Dr. Yusuf Khan', position: 'Professor', organization: 'Al-Azhar University', phone: '+20 2 555 1000', email: 'ykhan@alazhar.edu', relationship: 'Thesis Advisor' }
    ],
    interviewDate: '2024-03-18',
    status: 'interview_scheduled',
    reviewedBy: ['shura-3', 'shura-1'],
    createdAt: '2024-03-01'
  },
  {
    id: 'appt-2',
    candidateName: 'Hafiz Ibrahim Hassan',
    candidateEmail: 'hafiz.ibrahim@email.com',
    candidatePhone: '+1 (555) 234-5678',
    targetMosqueId: 'new-mosque-1',
    position: 'Head Imam',
    qualifications: [
      { institution: 'Darul Uloom Deoband', degree: 'Alim Course', field: 'Islamic Sciences', year: 2010, location: 'India' },
      { institution: 'Certified Hafiz', degree: 'Hifz', field: 'Quran Memorization', year: 2005, location: 'Pakistan' }
    ],
    experience: [
      { mosqueName: 'Masjid Bilal', position: 'Head Imam', location: 'Philadelphia, PA', startYear: 2015, endYear: 2024 },
      { mosqueName: 'Islamic Center of Reading', position: 'Assistant Imam', location: 'Reading, PA', startYear: 2010, endYear: 2015 }
    ],
    references: [
      { name: 'Br. Khalid Rahman', position: 'President', organization: 'Masjid Bilal', phone: '+1 (215) 555-2000', email: 'khalid@masjidbilal.org', relationship: 'Board President' }
    ],
    interviewDate: '2024-02-20',
    interviewNotes: 'Excellent candidate. Strong Quranic recitation. 14 years of experience. Highly recommended.',
    status: 'approved',
    reviewedBy: ['shura-3', 'shura-1', 'shura-2'],
    decision: 'approved',
    decisionDate: '2024-02-25',
    decisionNotes: 'Unanimously approved. Well-qualified and experienced.',
    appointmentDate: '2024-04-01',
    createdAt: '2024-02-01'
  }
]

// Additional data for Shura Panel pages

// Simplified Shura Members for panel views
export const shuraTeams = [
  {
    id: 'team-1',
    name: 'Mosque Assessment Team',
    description: 'Responsible for conducting comprehensive assessments of affiliated mosques',
    lead: 'Sheikh Dr. Abdul Rahman Al-Farsi',
    region: 'Northeast',
    members: ['shura-1', 'shura-3', 'shura-4'],
    tasksCompleted: 24,
    totalTasks: 30
  },
  {
    id: 'team-2',
    name: 'Women\'s Programs Team',
    description: 'Focuses on developing and evaluating women\'s programs across mosques',
    lead: 'Dr. Amina Khatib',
    region: 'Nationwide',
    members: ['shura-2', 'shura-5'],
    tasksCompleted: 18,
    totalTasks: 22
  },
  {
    id: 'team-3',
    name: 'Educational Standards Team',
    description: 'Develops curriculum and assesses educational programs',
    lead: 'Dr. Hassan Malik',
    region: 'West Coast',
    members: ['shura-6', 'shura-2'],
    tasksCompleted: 15,
    totalTasks: 20
  },
  {
    id: 'team-4',
    name: 'Outreach & Registration Team',
    description: 'Handles new mosque registrations and community outreach',
    lead: 'Sr. Khadija Osman',
    region: 'Southeast',
    members: ['shura-5', 'shura-4'],
    tasksCompleted: 32,
    totalTasks: 35
  }
]

// Enhanced Shura Members with additional fields for panel
export const enhancedShuraMembers = shuraMembers.map((member, idx) => ({
  ...member,
  role: member.title.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
  image: member.photoUrl,
  status: 'active',
  mosquesAssigned: [12, 8, 0, 0, 15, 10][idx] || 5,
  visitsCompleted: [45, 32, 28, 15, 52, 24][idx] || 20,
  performanceScore: [95, 92, 88, 90, 94, 86][idx] || 85,
  assignedRegions: member.assignedRegions || ['General']
}))

// Mosques data for Shura Panel
export const mosques = [
  { id: '1', name: 'Al-Furqan Islamic Center', address: '123 Main Street, New York, NY', region: 'Northeast', capacity: 800, registrationStatus: 'registered', needsImam: false },
  { id: '2', name: 'Masjid Al-Rahman', address: '456 Oak Avenue, Boston, MA', region: 'Northeast', capacity: 500, registrationStatus: 'registered', needsImam: true, positionNeeded: 'Assistant Imam' },
  { id: '3', name: 'Islamic Center of Chicago', address: '789 Lake Drive, Chicago, IL', region: 'Midwest', capacity: 1200, registrationStatus: 'registered', needsImam: false },
  { id: '4', name: 'Al-Noor Mosque', address: '321 Sunset Blvd, Los Angeles, CA', region: 'West Coast', capacity: 600, registrationStatus: 'pending', needsImam: true, positionNeeded: 'Head Imam' },
  { id: '5', name: 'Masjid Al-Taqwa', address: '555 Peace Road, Atlanta, GA', region: 'Southeast', capacity: 400, registrationStatus: 'registered', needsImam: false },
  { id: '6', name: 'Islamic Society of Houston', address: '888 Unity Lane, Houston, TX', region: 'South', capacity: 1000, registrationStatus: 'registered', needsImam: false },
  { id: '7', name: 'Dar Al-Salam Mosque', address: '222 Harmony Street, Seattle, WA', region: 'West Coast', capacity: 350, registrationStatus: 'pending', needsImam: true, positionNeeded: 'Head Imam' },
  { id: '8', name: 'Al-Hidayah Center', address: '444 Faith Avenue, Denver, CO', region: 'Mountain', capacity: 300, registrationStatus: 'registered', needsImam: false },
]

// Imam Candidates for appointments
export const imamCandidates = [
  { id: 'cand-1', name: 'Sheikh Muhammad Ali', specialization: 'Fiqh & Hadith', education: 'Al-Azhar University', experience: 5, rating: 4.8, languages: ['Arabic', 'English', 'Urdu'], status: 'available', image: '' },
  { id: 'cand-2', name: 'Hafiz Ibrahim Hassan', specialization: 'Quran & Tajweed', education: 'Darul Uloom Deoband', experience: 14, rating: 4.9, languages: ['Arabic', 'English', 'Urdu'], status: 'assigned', image: '' },
  { id: 'cand-3', name: 'Sheikh Ahmad Bilal', specialization: 'Islamic Studies', education: 'Islamic University of Madinah', experience: 8, rating: 4.6, languages: ['Arabic', 'English'], status: 'available', image: '' },
  { id: 'cand-4', name: 'Mufti Yusuf Rahman', specialization: 'Fatwa & Counseling', education: 'Jamia Islamia', experience: 12, rating: 4.7, languages: ['Arabic', 'English', 'Bengali'], status: 'available', image: '' },
]

// Enhanced Imam Appointments for panel
export const enhancedImamAppointments = [
  { id: 'appt-1', candidateName: 'Sheikh Muhammad Ali', candidateImage: '', mosqueName: 'Masjid Al-Rahman', position: 'Assistant Imam', status: 'interview', proposedDate: '2024-04-01', notes: 'Strong candidate with excellent references' },
  { id: 'appt-2', candidateName: 'Hafiz Ibrahim Hassan', candidateImage: '', mosqueName: 'Al-Hidayah Center', position: 'Head Imam', status: 'appointed', proposedDate: '2024-03-01', notes: 'Successfully appointed and serving' },
  { id: 'appt-3', candidateName: 'Sheikh Ahmad Bilal', candidateImage: '', mosqueName: 'Al-Noor Mosque', position: 'Head Imam', status: 'pending', proposedDate: '2024-05-01', notes: 'Application under review' },
  { id: 'appt-4', candidateName: 'Mufti Yusuf Rahman', candidateImage: '', mosqueName: 'Dar Al-Salam Mosque', position: 'Head Imam', status: 'approved', proposedDate: '2024-04-15', notes: 'Approved, pending start date confirmation' },
]

// Lectures data
export const lectures = [
  { id: 'lec-1', title: 'Understanding the Quran in Modern Times', topic: 'Tafsir and contemporary application', speaker: 'Sheikh Dr. Abdul Rahman Al-Farsi', speakerImage: '', speakerRole: 'Chairman', type: 'friday-khutbah', date: '2024-03-22', time: '13:00', venue: 'Al-Furqan Islamic Center', status: 'upcoming', attendees: 0, hasRecording: false },
  { id: 'lec-2', title: 'Women\'s Leadership in Islamic History', topic: 'Historical female scholars and leaders', speaker: 'Dr. Amina Khatib', speakerImage: '', speakerRole: 'Vice Chairman', type: 'educational', date: '2024-04-05', time: '19:30', venue: 'Al-Furqan Islamic Center', status: 'upcoming', attendees: 0, hasRecording: false },
  { id: 'lec-3', title: 'Youth and Identity', topic: 'Navigating faith in the modern world', speaker: 'Dr. Hassan Malik', speakerImage: '', speakerRole: 'Education Head', type: 'special-event', date: '2024-03-28', time: '18:00', venue: 'Islamic Center of Chicago', status: 'upcoming', attendees: 0, hasRecording: false },
  { id: 'lec-4', title: 'Financial Ethics in Islam', topic: 'Halal earning and spending', speaker: 'Br. Tariq Mahmoud', speakerImage: '', speakerRole: 'Treasurer', type: 'educational', date: '2024-02-15', time: '19:00', venue: 'Masjid Al-Taqwa', status: 'completed', attendees: 85, hasRecording: true, duration: '1:30:00', views: 320 },
  { id: 'lec-5', title: 'The Art of Supplication', topic: 'How to make effective dua', speaker: 'Sheikh Yusuf Ibrahim', speakerImage: '', speakerRole: 'Religious Advisor', type: 'friday-khutbah', date: '2024-02-09', time: '13:00', venue: 'Multiple Mosques', status: 'completed', attendees: 450, hasRecording: true, duration: '0:45:00', views: 1250 },
  { id: 'lec-6', title: 'Building Strong Muslim Families', topic: 'Family dynamics and Islamic values', speaker: 'Sr. Khadija Osman', speakerImage: '', speakerRole: 'Outreach Coordinator', type: 'training', date: '2024-01-20', time: '10:00', venue: 'Online', status: 'completed', attendees: 120, hasRecording: true, duration: '2:00:00', views: 560 },
]

// Helper functions
export function getShuraMemberById(id: string): ShuraMember | undefined {
  return shuraMembers.find(m => m.id === id)
}

export function getVisitsByMosqueId(mosqueId: string): MosqueVisit[] {
  return mosqueVisits.filter(v => v.mosqueId === mosqueId)
}

export function getVisitsByShuraMemberId(shuraMemberId: string): MosqueVisit[] {
  return mosqueVisits.filter(v => v.shuraMemberId === shuraMemberId)
}

export function getAssessmentByMosqueId(mosqueId: string): MosqueAssessment | undefined {
  return mosqueAssessments.find(a => a.mosqueId === mosqueId)
}

export function getPendingRegistrations(): MosqueRegistration[] {
  return mosqueRegistrations.filter(r => r.status === 'pending_review' || r.status === 'under_review')
}

export function getUpcomingMeetings(): ShuraMeeting[] {
  const today = new Date().toISOString().split('T')[0]
  return shuraMeetings.filter(m => m.date >= today && m.status !== 'cancelled')
}

export function getScheduledVisits(): MosqueVisit[] {
  return mosqueVisits.filter(v => v.status === 'scheduled' || v.status === 'confirmed')
}
