import type { 
  Mosque, 
  Event, 
  FinanceRecord, 
  Announcement, 
  DonationGoal,
  PrayerTime,
  Imam,
  ManagementMember 
} from '../types'

export const mockMosques: Mosque[] = [
  {
    id: '1',
    name: 'Al-Noor Islamic Center',
    address: '123 Peace Street',
    city: 'New York',
    state: 'NY',
    country: 'USA',
    zipCode: '10001',
    latitude: 40.7128,
    longitude: -74.0060,
    phone: '+1 (212) 555-0100',
    email: 'info@alnoor.org',
    website: 'https://alnoor.org',
    description: 'A welcoming community mosque serving the heart of Manhattan with daily prayers, educational programs, and community services.',
    imageUrl: '/images/mosque-1.jpg',
    facilities: ['Prayer Hall', 'Wudu Area', 'Library', 'Parking', 'Wheelchair Accessible', 'Sisters Section'],
    capacity: 500,
    establishedYear: 1995,
    isVerified: true,
    createdAt: '2024-01-01',
    updatedAt: '2024-03-01'
  },
  {
    id: '2',
    name: 'Masjid Al-Rahman',
    address: '456 Unity Avenue',
    city: 'Brooklyn',
    state: 'NY',
    country: 'USA',
    zipCode: '11201',
    latitude: 40.6892,
    longitude: -73.9857,
    phone: '+1 (718) 555-0200',
    email: 'contact@alrahman.org',
    website: 'https://alrahman.org',
    description: 'A vibrant mosque in Brooklyn offering comprehensive Islamic education, youth programs, and interfaith dialogues.',
    imageUrl: '/images/mosque-2.jpg',
    facilities: ['Prayer Hall', 'Wudu Area', 'Classroom', 'Community Kitchen', 'Playground'],
    capacity: 800,
    establishedYear: 2001,
    isVerified: true,
    createdAt: '2024-01-15',
    updatedAt: '2024-02-20'
  },
  {
    id: '3',
    name: 'Islamic Center of Queens',
    address: '789 Harmony Boulevard',
    city: 'Queens',
    state: 'NY',
    country: 'USA',
    zipCode: '11375',
    latitude: 40.7282,
    longitude: -73.8317,
    phone: '+1 (718) 555-0300',
    email: 'info@icqueens.org',
    description: 'Serving the diverse Muslim community of Queens with multiple language services and cultural programs.',
    imageUrl: '/images/mosque-3.jpg',
    facilities: ['Prayer Hall', 'Wudu Area', 'Gym', 'Library', 'Funeral Services'],
    capacity: 1200,
    establishedYear: 1988,
    isVerified: true,
    createdAt: '2024-02-01',
    updatedAt: '2024-03-10'
  },
  {
    id: '4',
    name: 'Masjid As-Salam',
    address: '321 Tranquility Lane',
    city: 'Jersey City',
    state: 'NJ',
    country: 'USA',
    zipCode: '07302',
    latitude: 40.7178,
    longitude: -74.0431,
    phone: '+1 (201) 555-0400',
    email: 'info@assalam.org',
    description: 'A peaceful mosque in Jersey City with a focus on spiritual growth and community welfare.',
    imageUrl: '/images/mosque-4.jpg',
    facilities: ['Prayer Hall', 'Wudu Area', 'Parking', 'Conference Room'],
    capacity: 350,
    establishedYear: 2010,
    isVerified: true,
    createdAt: '2024-02-15',
    updatedAt: '2024-03-05'
  },
  {
    id: '5',
    name: 'Bronx Muslim Center',
    address: '567 Faith Avenue',
    city: 'Bronx',
    state: 'NY',
    country: 'USA',
    zipCode: '10451',
    latitude: 40.8176,
    longitude: -73.9219,
    phone: '+1 (718) 555-0500',
    email: 'info@bronxmuslim.org',
    description: 'Community-focused mosque providing essential services and support to Muslims in the Bronx.',
    imageUrl: '/images/mosque-5.jpg',
    facilities: ['Prayer Hall', 'Wudu Area', 'Food Pantry', 'Tutoring Center'],
    capacity: 400,
    establishedYear: 2005,
    isVerified: false,
    createdAt: '2024-03-01',
    updatedAt: '2024-03-15'
  },
  {
    id: '6',
    name: 'Staten Island Islamic Center',
    address: '890 Blessing Road',
    city: 'Staten Island',
    state: 'NY',
    country: 'USA',
    zipCode: '10301',
    latitude: 40.6424,
    longitude: -74.0764,
    phone: '+1 (718) 555-0600',
    email: 'info@siic.org',
    description: 'The primary Islamic center serving Staten Island with full weekend school and youth activities.',
    imageUrl: '/images/mosque-6.jpg',
    facilities: ['Prayer Hall', 'Wudu Area', 'School', 'Library', 'Sports Field'],
    capacity: 600,
    establishedYear: 1998,
    isVerified: true,
    createdAt: '2024-01-20',
    updatedAt: '2024-03-12'
  }
]

export const mockEvents: Event[] = [
  {
    id: '1',
    mosqueId: '1',
    title: 'Friday Jummah Prayer',
    description: 'Weekly congregational prayer with sermon by Imam Abdullah.',
    category: 'jummah',
    startDate: '2024-03-22',
    endDate: '2024-03-22',
    startTime: '13:00',
    endTime: '14:00',
    location: 'Main Prayer Hall',
    speaker: 'Imam Abdullah',
    isRecurring: true,
    recurrencePattern: 'weekly',
    currentAttendees: 0,
    isActive: true,
    createdAt: '2024-01-01'
  },
  {
    id: '2',
    mosqueId: '1',
    title: 'Tafseer Class: Understanding Surah Al-Baqarah',
    description: 'Deep dive into the meanings and lessons of Surah Al-Baqarah. Open to all levels.',
    category: 'quran_study',
    startDate: '2024-03-23',
    endDate: '2024-03-23',
    startTime: '19:00',
    endTime: '20:30',
    location: 'Classroom A',
    speaker: 'Sheikh Ahmad',
    isRecurring: true,
    recurrencePattern: 'weekly',
    maxAttendees: 50,
    currentAttendees: 35,
    isActive: true,
    createdAt: '2024-02-01'
  },
  {
    id: '3',
    mosqueId: '1',
    title: 'Youth Halaqah',
    description: 'Interactive session for teens discussing contemporary challenges and Islamic solutions.',
    category: 'youth_program',
    startDate: '2024-03-24',
    endDate: '2024-03-24',
    startTime: '16:00',
    endTime: '17:30',
    location: 'Youth Center',
    speaker: 'Brother Yusuf',
    isRecurring: true,
    recurrencePattern: 'weekly',
    maxAttendees: 30,
    currentAttendees: 22,
    isActive: true,
    createdAt: '2024-02-15'
  },
  {
    id: '4',
    mosqueId: '2',
    title: 'Sisters Circle',
    description: 'Weekly gathering for sisters to discuss Islamic topics and build community bonds.',
    category: 'sisters_program',
    startDate: '2024-03-25',
    endDate: '2024-03-25',
    startTime: '10:00',
    endTime: '12:00',
    location: 'Sisters Hall',
    speaker: 'Sister Fatima',
    isRecurring: true,
    recurrencePattern: 'weekly',
    maxAttendees: 40,
    currentAttendees: 28,
    isActive: true,
    createdAt: '2024-02-10'
  },
  {
    id: '5',
    mosqueId: '1',
    title: 'Community Iftar',
    description: 'Join us for a blessed iftar during the holy month of Ramadan.',
    category: 'iftar',
    startDate: '2024-03-26',
    endDate: '2024-03-26',
    startTime: '18:30',
    endTime: '20:00',
    location: 'Community Hall',
    isRecurring: false,
    maxAttendees: 200,
    currentAttendees: 150,
    isActive: true,
    createdAt: '2024-03-01'
  },
  {
    id: '6',
    mosqueId: '3',
    title: 'Arabic Language Course',
    description: 'Beginner Arabic classes focusing on Quranic Arabic vocabulary and grammar.',
    category: 'class',
    startDate: '2024-03-27',
    endDate: '2024-06-27',
    startTime: '18:00',
    endTime: '19:30',
    location: 'Classroom B',
    speaker: 'Ustadh Mohammed',
    isRecurring: true,
    recurrencePattern: 'weekly',
    maxAttendees: 25,
    currentAttendees: 20,
    isActive: true,
    createdAt: '2024-03-05'
  },
  {
    id: '7',
    mosqueId: '1',
    title: 'Fundraiser Dinner: Building Expansion',
    description: 'Annual fundraising dinner to support our mosque expansion project.',
    category: 'fundraiser',
    startDate: '2024-04-15',
    endDate: '2024-04-15',
    startTime: '18:00',
    endTime: '21:00',
    location: 'Grand Hall',
    speaker: 'Guest Scholars',
    isRecurring: false,
    maxAttendees: 300,
    currentAttendees: 180,
    isActive: true,
    createdAt: '2024-03-10'
  },
  {
    id: '8',
    mosqueId: '2',
    title: 'Islamic History Lecture Series',
    description: 'Exploring the golden age of Islamic civilization and its contributions to humanity.',
    category: 'lecture',
    startDate: '2024-03-28',
    endDate: '2024-03-28',
    startTime: '19:30',
    endTime: '21:00',
    location: 'Main Hall',
    speaker: 'Dr. Khalid Hassan',
    isRecurring: true,
    recurrencePattern: 'monthly',
    currentAttendees: 0,
    isActive: true,
    createdAt: '2024-03-12'
  }
]

export const mockFinanceRecords: FinanceRecord[] = [
  {
    id: '1',
    mosqueId: '1',
    type: 'donation',
    category: 'sadaqah',
    amount: 5000,
    description: 'General donation',
    date: '2024-03-01',
    donorName: 'Anonymous',
    isAnonymous: true,
    createdAt: '2024-03-01'
  },
  {
    id: '2',
    mosqueId: '1',
    type: 'donation',
    category: 'zakat',
    amount: 10000,
    description: 'Zakat contribution',
    date: '2024-03-05',
    donorName: 'Ahmad Family',
    isAnonymous: false,
    receiptNumber: 'ZKT-2024-001',
    createdAt: '2024-03-05'
  },
  {
    id: '3',
    mosqueId: '1',
    type: 'expense',
    category: 'utilities',
    amount: 1500,
    description: 'Monthly electricity bill',
    date: '2024-03-10',
    isAnonymous: false,
    createdAt: '2024-03-10'
  },
  {
    id: '4',
    mosqueId: '1',
    type: 'expense',
    category: 'maintenance',
    amount: 2500,
    description: 'HVAC system repair',
    date: '2024-03-12',
    isAnonymous: false,
    createdAt: '2024-03-12'
  },
  {
    id: '5',
    mosqueId: '1',
    type: 'donation',
    category: 'building_fund',
    amount: 25000,
    description: 'Building expansion fund contribution',
    date: '2024-03-15',
    donorName: 'Khan Foundation',
    isAnonymous: false,
    receiptNumber: 'BLD-2024-001',
    createdAt: '2024-03-15'
  },
  {
    id: '6',
    mosqueId: '1',
    type: 'expense',
    category: 'salaries',
    amount: 8000,
    description: 'Staff salaries - March',
    date: '2024-03-15',
    isAnonymous: false,
    createdAt: '2024-03-15'
  },
  {
    id: '7',
    mosqueId: '1',
    type: 'donation',
    category: 'education',
    amount: 3000,
    description: 'Donation for weekend school supplies',
    date: '2024-03-18',
    isAnonymous: true,
    createdAt: '2024-03-18'
  },
  {
    id: '8',
    mosqueId: '1',
    type: 'expense',
    category: 'events',
    amount: 1200,
    description: 'Community iftar supplies',
    date: '2024-03-20',
    isAnonymous: false,
    createdAt: '2024-03-20'
  }
]

export const mockDonationGoals: DonationGoal[] = [
  {
    id: '1',
    mosqueId: '1',
    title: 'Building Expansion Fund',
    description: 'Help us expand our prayer hall to accommodate our growing community.',
    targetAmount: 500000,
    currentAmount: 325000,
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    isActive: true
  },
  {
    id: '2',
    mosqueId: '1',
    title: 'Ramadan Food Drive',
    description: 'Providing meals for families in need during the blessed month.',
    targetAmount: 15000,
    currentAmount: 12500,
    startDate: '2024-03-01',
    endDate: '2024-04-15',
    isActive: true
  },
  {
    id: '3',
    mosqueId: '2',
    title: 'Youth Center Renovation',
    description: 'Modernizing our youth center with new facilities and equipment.',
    targetAmount: 75000,
    currentAmount: 45000,
    startDate: '2024-02-01',
    endDate: '2024-08-31',
    isActive: true
  }
]

export const mockAnnouncements: Announcement[] = [
  {
    id: '1',
    mosqueId: '1',
    title: 'Ramadan Prayer Schedule Changes',
    content: 'Dear community members, please note that our prayer times will be adjusted for Ramadan. Taraweeh prayers will begin 30 minutes after Isha. Please arrive early to secure your spot.',
    category: 'prayer',
    isPinned: true,
    publishDate: '2024-03-01',
    authorName: 'Imam Abdullah',
    isActive: true,
    createdAt: '2024-03-01'
  },
  {
    id: '2',
    mosqueId: '1',
    title: 'Volunteer Registration Open',
    content: 'We are seeking volunteers for our upcoming community iftar programs. If you can help with cooking, serving, or cleanup, please register at the front desk or contact us via email.',
    category: 'community',
    isPinned: false,
    publishDate: '2024-03-05',
    authorName: 'Community Committee',
    isActive: true,
    createdAt: '2024-03-05'
  },
  {
    id: '3',
    mosqueId: '1',
    title: 'Weekend School Registration',
    content: 'Registration for the Spring semester of our weekend Islamic school is now open. Classes available for ages 5-16. Limited spots available.',
    category: 'education',
    isPinned: true,
    publishDate: '2024-03-10',
    expiryDate: '2024-04-01',
    authorName: 'Education Department',
    isActive: true,
    createdAt: '2024-03-10'
  },
  {
    id: '4',
    mosqueId: '1',
    title: 'Parking Lot Maintenance',
    content: 'The parking lot will be closed for maintenance this Saturday from 6 AM to 2 PM. Please use street parking during this time.',
    category: 'general',
    isPinned: false,
    publishDate: '2024-03-15',
    expiryDate: '2024-03-17',
    authorName: 'Facilities Manager',
    isActive: true,
    createdAt: '2024-03-15'
  },
  {
    id: '5',
    mosqueId: '2',
    title: 'New Imam Welcome Ceremony',
    content: 'Join us in welcoming our new Imam, Sheikh Hassan, to our community. A special welcome ceremony will be held after Jummah prayer this Friday.',
    category: 'event',
    isPinned: true,
    publishDate: '2024-03-18',
    authorName: 'Board of Directors',
    isActive: true,
    createdAt: '2024-03-18'
  }
]

export const mockImams: Imam[] = [
  {
    id: 'imam-1',
    mosqueId: '1',
    name: 'Sheikh Abdullah Al-Farooq',
    title: 'Head Imam',
    photoUrl: '/images/imam-1.jpg',
    biography: 'Sheikh Abdullah Al-Farooq has been serving the Muslim community for over 20 years. Known for his profound knowledge of Islamic jurisprudence and his compassionate approach to community issues, he has been instrumental in building bridges between diverse communities. His Friday sermons are known for addressing contemporary issues while staying true to Islamic principles.',
    education: [
      {
        institution: 'Al-Azhar University',
        degree: 'PhD',
        field: 'Islamic Jurisprudence (Fiqh)',
        year: 2005,
        location: 'Cairo, Egypt'
      },
      {
        institution: 'International Islamic University',
        degree: 'Masters',
        field: 'Quranic Studies',
        year: 2000,
        location: 'Islamabad, Pakistan'
      },
      {
        institution: 'Darul Uloom Deoband',
        degree: 'Alimiyyah',
        field: 'Islamic Sciences',
        year: 1998,
        location: 'India'
      }
    ],
    specializations: ['Islamic Jurisprudence', 'Quranic Tafseer', 'Family Counseling', 'Interfaith Dialogue', 'Youth Mentorship'],
    languages: ['Arabic', 'English', 'Urdu', 'Hindi'],
    yearsOfExperience: 22,
    previousPositions: [
      {
        mosqueName: 'Islamic Center of Chicago',
        position: 'Associate Imam',
        location: 'Chicago, IL',
        startYear: 2005,
        endYear: 2010
      },
      {
        mosqueName: 'Masjid Al-Hikmah',
        position: 'Head Imam',
        location: 'Detroit, MI',
        startYear: 2010,
        endYear: 2015
      }
    ],
    certifications: ['Ijazah in Quran Recitation', 'Licensed Marriage Counselor', 'Certified Chaplain'],
    contactEmail: 'imam.abdullah@alnoor.org',
    officeHours: 'Monday - Thursday: 10 AM - 12 PM, After Maghrib Prayer',
    socialMedia: {
      youtube: 'https://youtube.com/@imamabdullah',
      twitter: 'https://twitter.com/imamabdullah'
    },
    publications: [
      'Living Islam in the Modern World (2018)',
      'Understanding the Quran: A Contemporary Approach (2020)',
      'Muslim Family Values: A Practical Guide (2022)'
    ],
    characterTraits: ['Compassionate', 'Scholarly', 'Patient', 'Approachable', 'Inspiring'],
    teachingStyle: 'Sheikh Abdullah combines traditional Islamic scholarship with contemporary examples, making complex topics accessible to all. He encourages questions and promotes critical thinking within Islamic principles.',
    communityFocus: ['Family Counseling', 'Interfaith Relations', 'Youth Guidance', 'New Muslim Support', 'Marriage Counseling'],
    personalMessage: 'Assalamu Alaikum, my dear brothers and sisters. It is my honor and privilege to serve this blessed community. My door is always open to anyone seeking guidance, whether you are a lifelong Muslim or just beginning your journey. Together, we can build a stronger, more united community that embodies the beautiful teachings of Islam.',
    availableServices: ['Marriage Counseling', 'Nikah Services', 'Funeral Services', 'New Muslim Guidance', 'Family Mediation', 'Youth Counseling', 'Spiritual Guidance'],
    weeklySchedule: [
      { day: 'Monday', activities: ['Fajr Prayer', 'Office Hours (10 AM - 12 PM)', 'Evening Tafseer Class'] },
      { day: 'Tuesday', activities: ['Fajr Prayer', 'Community Visits', 'Marriage Counseling Sessions'] },
      { day: 'Wednesday', activities: ['Fajr Prayer', 'Office Hours (10 AM - 12 PM)', 'Youth Halaqah'] },
      { day: 'Thursday', activities: ['Fajr Prayer', 'Interfaith Meeting', 'Family Counseling'] },
      { day: 'Friday', activities: ['Jummah Khutbah', 'Post-Jummah Q&A', 'Evening Programs'] },
      { day: 'Saturday', activities: ['Weekend School Visit', 'Community Events'] },
      { day: 'Sunday', activities: ['Family Day', 'Available by appointment'] }
    ],
    isActive: true,
    appointmentDate: '2015-06-01',
    createdAt: '2024-01-01'
  },
  {
    id: 'imam-2',
    mosqueId: '1',
    name: 'Hafiz Mohammed Yusuf',
    title: 'Assistant Imam & Quran Teacher',
    photoUrl: '/images/imam-2.jpg',
    biography: 'Hafiz Mohammed Yusuf memorized the entire Quran at the age of 12 and has dedicated his life to teaching the art of Tajweed and Quran memorization. He leads Taraweeh prayers during Ramadan and conducts regular Quran classes for all age groups.',
    education: [
      {
        institution: 'Jamia Al-Kauthar',
        degree: 'Hifz Certificate',
        field: 'Quran Memorization',
        year: 2008,
        location: 'Lancashire, UK'
      },
      {
        institution: 'Islamic University of Madinah',
        degree: 'Bachelors',
        field: 'Quranic Sciences',
        year: 2014,
        location: 'Madinah, Saudi Arabia'
      }
    ],
    specializations: ['Quran Memorization', 'Tajweed', 'Arabic Language', 'Children Education'],
    languages: ['Arabic', 'English', 'Bengali'],
    yearsOfExperience: 12,
    previousPositions: [
      {
        mosqueName: 'East London Mosque',
        position: 'Quran Teacher',
        location: 'London, UK',
        startYear: 2014,
        endYear: 2018
      }
    ],
    certifications: ['Ijazah in Seven Qiraat', 'Islamic Education Teaching Certificate'],
    contactEmail: 'hafiz.yusuf@alnoor.org',
    officeHours: 'Daily: After Fajr and Asr prayers',
    characterTraits: ['Patient', 'Gentle', 'Dedicated', 'Encouraging', 'Precise'],
    teachingStyle: 'Hafiz Yusuf is known for his patient and methodical approach to Quran teaching. He adapts his methods to each student\'s learning pace and provides personalized attention to ensure proper Tajweed and memorization.',
    communityFocus: ['Quran Education', 'Children\'s Programs', 'Taraweeh Leadership', 'Hifz Program'],
    personalMessage: 'The Quran is a light that guides us through life. My mission is to help every Muslim, regardless of age, connect with the words of Allah. Whether you want to improve your recitation or memorize the entire Quran, I am here to guide you on this blessed journey.',
    availableServices: ['Quran Classes', 'Hifz Program', 'Tajweed Correction', 'Children\'s Islamic Education', 'Taraweeh Leadership'],
    weeklySchedule: [
      { day: 'Monday', activities: ['Fajr Prayer + Hifz Circle', 'Asr Tajweed Class', 'Evening Quran Class'] },
      { day: 'Tuesday', activities: ['Fajr Prayer + Hifz Circle', 'Children\'s Quran Class', 'Adult Beginners Class'] },
      { day: 'Wednesday', activities: ['Fajr Prayer + Hifz Circle', 'Asr Tajweed Class', 'Advanced Recitation'] },
      { day: 'Thursday', activities: ['Fajr Prayer + Hifz Circle', 'Women\'s Quran Circle', 'Evening Review Session'] },
      { day: 'Friday', activities: ['Fajr Prayer', 'Post-Jummah Quran Session'] },
      { day: 'Saturday', activities: ['Weekend School Quran Classes', 'Hifz Program Intensive'] },
      { day: 'Sunday', activities: ['Weekend School', 'Family Quran Time'] }
    ],
    isActive: true,
    appointmentDate: '2018-09-01',
    createdAt: '2024-01-01'
  },
  {
    id: 'imam-3',
    mosqueId: '2',
    name: 'Sheikh Hassan Al-Amiri',
    title: 'Head Imam',
    photoUrl: '/images/imam-3.jpg',
    biography: 'Sheikh Hassan Al-Amiri brings a wealth of knowledge in Hadith sciences and Islamic history. His engaging lectures and community-focused approach have made him a beloved figure in Brooklyn. He is particularly passionate about youth engagement and addressing contemporary challenges facing Muslims in the West.',
    education: [
      {
        institution: 'University of Jordan',
        degree: 'PhD',
        field: 'Hadith Sciences',
        year: 2012,
        location: 'Amman, Jordan'
      },
      {
        institution: 'Al-Azhar University',
        degree: 'Masters',
        field: 'Islamic History',
        year: 2007,
        location: 'Cairo, Egypt'
      }
    ],
    specializations: ['Hadith Sciences', 'Islamic History', 'Youth Programs', 'Dawah'],
    languages: ['Arabic', 'English', 'French'],
    yearsOfExperience: 15,
    previousPositions: [
      {
        mosqueName: 'Paris Grand Mosque',
        position: 'Lecturer',
        location: 'Paris, France',
        startYear: 2012,
        endYear: 2017
      }
    ],
    certifications: ['Ijazah in Sahih Bukhari', 'Community Leadership Certificate'],
    contactEmail: 'imam.hassan@alrahman.org',
    officeHours: 'Tuesday & Thursday: 2 PM - 5 PM',
    socialMedia: {
      youtube: 'https://youtube.com/@sheikhhassan',
      facebook: 'https://facebook.com/sheikhhassan'
    },
    characterTraits: ['Dynamic', 'Engaging', 'Visionary', 'Youthful', 'Accessible'],
    teachingStyle: 'Sheikh Hassan brings Islamic history to life through storytelling and connects historical lessons to contemporary challenges. His lectures are known for being engaging and thought-provoking, especially popular among young adults.',
    communityFocus: ['Youth Engagement', 'Islamic History', 'Dawah', 'Social Media Outreach', 'Converts Support'],
    personalMessage: 'Islam is not just a religion of the past - it is a living, breathing way of life that addresses all of our modern challenges. I am committed to helping our youth understand the beauty and relevance of Islam in today\'s world. Let us learn from our glorious past to build an even better future.',
    availableServices: ['Youth Counseling', 'New Muslim Support', 'Pre-Marriage Counseling', 'Community Lectures', 'Online Classes'],
    weeklySchedule: [
      { day: 'Monday', activities: ['Morning Research', 'Youth Drop-in Hours', 'Evening Lecture Prep'] },
      { day: 'Tuesday', activities: ['Office Hours (2-5 PM)', 'Young Adults Halaqah', 'Online Q&A Session'] },
      { day: 'Wednesday', activities: ['Community Outreach', 'School Visits', 'Dawah Activities'] },
      { day: 'Thursday', activities: ['Office Hours (2-5 PM)', 'Marriage Counseling', 'Islamic History Class'] },
      { day: 'Friday', activities: ['Jummah Khutbah', 'Post-Jummah Youth Meetup'] },
      { day: 'Saturday', activities: ['Weekend Youth Programs', 'Community Events', 'Online Live Session'] },
      { day: 'Sunday', activities: ['Family Programs', 'Available for appointments'] }
    ],
    isActive: true,
    appointmentDate: '2017-03-15',
    createdAt: '2024-01-15'
  }
]

export const mockManagementMembers: ManagementMember[] = [
  {
    id: 'mgmt-1',
    mosqueId: '1',
    name: 'Br. Ahmed Khalil',
    position: 'president',
    photoUrl: '/images/mgmt-1.jpg',
    biography: 'Brother Ahmed has been serving the Muslim community for over 15 years. A successful businessman and entrepreneur, he brings exceptional leadership and strategic vision to our mosque. His passion for community building and interfaith dialogue has helped position our mosque as a beacon of Islamic values in the broader community.',
    email: 'president@alnoor.org',
    phone: '+1 (212) 555-0101',
    responsibilities: [
      'Overall mosque operations and strategic direction',
      'Chairing board meetings and general assembly',
      'Community representation and outreach',
      'Fundraising leadership',
      'Conflict resolution'
    ],
    termStartDate: '2023-01-01',
    termEndDate: '2025-12-31',
    isElected: true,
    isActive: true,
    createdAt: '2024-01-01',
    profession: 'CEO & Founder, Khalil Enterprises',
    education: [
      { degree: 'MBA', institution: 'Columbia Business School', field: 'Business Administration', year: 2005 },
      { degree: 'BS', institution: 'NYU', field: 'Computer Science', year: 2000 }
    ],
    skills: ['Strategic Planning', 'Fundraising', 'Public Speaking', 'Community Organizing', 'Business Development'],
    achievements: [
      'Led successful $2M mosque expansion campaign',
      'Established interfaith dialogue program with 5 local churches and synagogues',
      'Increased community membership by 40% during tenure',
      'Created youth scholarship fund benefiting 50+ students'
    ],
    previousRoles: [
      { position: 'Vice President', organization: 'Al-Noor Islamic Center', years: '2019-2022' },
      { position: 'Board Member', organization: 'Islamic Council of New York', years: '2015-2019' },
      { position: 'Youth Committee Chair', organization: 'Al-Noor Islamic Center', years: '2010-2015' }
    ],
    availability: 'Available for meetings Monday-Thursday evenings',
    officeHours: 'Saturdays 10 AM - 12 PM (by appointment)',
    languages: ['English', 'Arabic', 'Urdu'],
    yearsOfService: 15,
    personalStatement: 'I believe in the power of community. Our mosque is not just a place of worship, but a home for every Muslim - whether you were born into the faith or found it later in life. My goal is to make our mosque welcoming to all and to build bridges with our neighbors of all faiths. Together, we can create a legacy that benefits generations to come.',
    committees: ['Executive Committee', 'Finance Committee', 'Building Committee', 'Interfaith Committee'],
    socialMedia: { linkedin: 'https://linkedin.com/in/ahmedkhalil' }
  },
  {
    id: 'mgmt-2',
    mosqueId: '1',
    name: 'Dr. Yusuf Ali',
    position: 'vice_president',
    photoUrl: '/images/mgmt-2.jpg',
    biography: 'Dr. Yusuf is a practicing cardiologist and dedicated community leader. With his medical expertise, he has established health awareness programs and free clinic days for underserved community members. His passion for technology has also led to the modernization of our mosque operations.',
    email: 'vp@alnoor.org',
    phone: '+1 (212) 555-0102',
    responsibilities: [
      'Assist President in mosque operations',
      'Lead in absence of President',
      'Coordinate between committees',
      'Technology and digital initiatives',
      'Community outreach programs'
    ],
    termStartDate: '2023-01-01',
    termEndDate: '2025-12-31',
    isElected: true,
    isActive: true,
    createdAt: '2024-01-01',
    profession: 'Cardiologist, Mount Sinai Hospital',
    education: [
      { degree: 'MD', institution: 'Johns Hopkins School of Medicine', field: 'Medicine', year: 2008 },
      { degree: 'BS', institution: 'Harvard University', field: 'Biology', year: 2004 }
    ],
    skills: ['Healthcare Administration', 'Technology Implementation', 'Crisis Management', 'Team Building'],
    achievements: [
      'Established monthly free health clinic serving 100+ community members',
      'Implemented digital prayer time system and mobile app',
      'Organized COVID-19 vaccination drive vaccinating 500+ people',
      'Created health education seminar series'
    ],
    previousRoles: [
      { position: 'Health Committee Chair', organization: 'Al-Noor Islamic Center', years: '2018-2022' },
      { position: 'Volunteer Coordinator', organization: 'Islamic Medical Association', years: '2015-2018' }
    ],
    availability: 'Evenings after 7 PM, weekends flexible',
    languages: ['English', 'Arabic', 'French'],
    yearsOfService: 8,
    personalStatement: 'As a physician, I see the whole person - body, mind, and soul. Our mosque should nurture all three. I am committed to bringing modern solutions to our community while preserving our timeless traditions. Healthcare and technology can empower our community to thrive.',
    committees: ['Executive Committee', 'Health & Wellness Committee', 'Technology Committee'],
    socialMedia: { linkedin: 'https://linkedin.com/in/dryusufali', twitter: 'https://twitter.com/dryusufali' }
  },
  {
    id: 'mgmt-3',
    mosqueId: '1',
    name: 'Sr. Fatima Hassan',
    position: 'secretary',
    photoUrl: '/images/mgmt-3.jpg',
    biography: 'Sister Fatima is a corporate lawyer with expertise in non-profit law. She has been managing the administrative affairs of the mosque with excellence for the past 5 years, bringing professionalism and organization to all operations. Her legal background ensures our mosque operates in full compliance with all regulations.',
    email: 'secretary@alnoor.org',
    phone: '+1 (212) 555-0103',
    responsibilities: [
      'Maintain official records and documentation',
      'Record minutes of all meetings',
      'Handle correspondence',
      'Manage membership database',
      'Coordinate administrative staff'
    ],
    termStartDate: '2023-01-01',
    termEndDate: '2025-12-31',
    isElected: true,
    isActive: true,
    createdAt: '2024-01-01',
    profession: 'Corporate Lawyer, Davis & Associates LLP',
    education: [
      { degree: 'JD', institution: 'Yale Law School', year: 2012 },
      { degree: 'BA', institution: 'University of Michigan', field: 'Political Science', year: 2009 }
    ],
    skills: ['Legal Compliance', 'Documentation', 'Policy Development', 'Organization', 'Communication'],
    achievements: [
      'Restructured mosque bylaws and governance documents',
      'Implemented secure digital record-keeping system',
      'Achieved 501(c)(3) compliance excellence rating',
      'Mentored 3 aspiring Muslim women lawyers'
    ],
    previousRoles: [
      { position: 'Assistant Secretary', organization: 'Al-Noor Islamic Center', years: '2020-2022' },
      { position: 'Legal Advisor', organization: 'Muslim Women Lawyers Association', years: '2016-present' }
    ],
    availability: 'Available via email anytime, meetings on weekends',
    languages: ['English', 'Arabic'],
    yearsOfService: 5,
    personalStatement: 'I believe that good governance and transparency are essential for any organization, especially a house of worship. My role is to ensure that our mosque operates with integrity, accountability, and professionalism. Every document, every meeting, every decision should reflect our commitment to excellence.',
    committees: ['Executive Committee', 'Governance Committee', 'Legal Review Committee']
  },
  {
    id: 'mgmt-4',
    mosqueId: '1',
    name: 'Br. Omar Farooqi',
    position: 'treasurer',
    photoUrl: '/images/mgmt-4.jpg',
    biography: 'Brother Omar is a Certified Public Accountant with 20 years of experience in financial management at Fortune 500 companies. He ensures complete transparency in all financial matters and has implemented robust financial controls that have earned the trust of our community.',
    email: 'treasurer@alnoor.org',
    phone: '+1 (212) 555-0104',
    responsibilities: [
      'Manage all financial accounts and transactions',
      'Prepare and present financial reports',
      'Oversee donation collection and recording',
      'Budget planning and monitoring',
      'Annual audit coordination'
    ],
    termStartDate: '2023-01-01',
    termEndDate: '2025-12-31',
    isElected: true,
    isActive: true,
    createdAt: '2024-01-01',
    profession: 'Senior Financial Controller, Goldman Sachs',
    education: [
      { degree: 'CPA', institution: 'AICPA Certification', year: 2005 },
      { degree: 'MS', institution: 'Baruch College', field: 'Accounting', year: 2003 },
      { degree: 'BBA', institution: 'CUNY', field: 'Finance', year: 2001 }
    ],
    skills: ['Financial Reporting', 'Budget Management', 'Audit Coordination', 'Zakat Calculation', 'Investment Management'],
    achievements: [
      'Implemented transparent online donation tracking system',
      'Achieved clean audit reports for 5 consecutive years',
      'Increased donation efficiency by 35% through digital payments',
      'Established endowment fund now worth $500K+'
    ],
    previousRoles: [
      { position: 'Finance Committee Member', organization: 'Al-Noor Islamic Center', years: '2015-2022' },
      { position: 'Zakat Committee Chair', organization: 'Islamic Relief USA', years: '2012-2015' }
    ],
    availability: 'Available for financial inquiries weekdays after 6 PM',
    languages: ['English', 'Urdu', 'Hindi'],
    yearsOfService: 10,
    personalStatement: 'Financial stewardship is a sacred trust (amanah). Every dollar donated to our mosque is a trust from Allah through our community members. I am committed to ensuring that every cent is accounted for, transparently reported, and spent wisely in accordance with Islamic principles.',
    committees: ['Executive Committee', 'Finance Committee', 'Zakat Distribution Committee', 'Investment Committee']
  },
  {
    id: 'mgmt-5',
    mosqueId: '1',
    name: 'Sr. Aisha Rahman',
    position: 'education_director',
    department: 'Education',
    photoUrl: '/images/mgmt-5.jpg',
    biography: 'Sister Aisha is a former school principal with over 25 years in education. Her passion for Islamic education has transformed our weekend school into a vibrant learning center that serves over 200 students weekly.',
    email: 'education@alnoor.org',
    phone: '+1 (212) 555-0105',
    responsibilities: [
      'Manage weekend Islamic school',
      'Coordinate adult education classes',
      'Hire and supervise teachers',
      'Curriculum development',
      'Student enrollment and progress tracking'
    ],
    termStartDate: '2023-01-01',
    isElected: false,
    isActive: true,
    createdAt: '2024-01-01',
    profession: 'Retired School Principal',
    education: [
      { degree: 'MEd', institution: 'Teachers College, Columbia', field: 'Educational Leadership', year: 1998 },
      { degree: 'BA', institution: 'Hunter College', field: 'Elementary Education', year: 1992 }
    ],
    skills: ['Curriculum Design', 'Teacher Training', 'Child Development', 'Educational Administration'],
    achievements: [
      'Grew weekend school enrollment from 50 to 200+ students',
      'Established Quran Hifz program with 15 Huffaz graduates',
      'Created online learning platform during pandemic',
      'Developed standardized Islamic studies curriculum'
    ],
    yearsOfService: 7,
    personalStatement: 'Every child is a trust from Allah. Our mission is to nurture their hearts with the love of Islam while preparing their minds for academic excellence. Education is the key to building strong Muslim families and communities.',
    committees: ['Education Committee', 'Youth Committee', 'Women\'s Committee']
  },
  {
    id: 'mgmt-6',
    mosqueId: '1',
    name: 'Br. Zaid Ali',
    position: 'youth_director',
    department: 'Youth Programs',
    photoUrl: '/images/mgmt-6.jpg',
    biography: 'Brother Zaid is a licensed youth counselor and former college basketball player. His dynamic approach and relatability have made him extremely popular among our youth, with over 100 teenagers actively participating in programs.',
    email: 'youth@alnoor.org',
    phone: '+1 (212) 555-0106',
    responsibilities: [
      'Organize youth halaqas and programs',
      'Sports and recreational activities',
      'Youth mentorship programs',
      'College preparation workshops',
      'Summer camp coordination'
    ],
    termStartDate: '2023-06-01',
    isElected: false,
    isActive: true,
    createdAt: '2024-01-01',
    profession: 'Youth Counselor, NYC Schools',
    education: [
      { degree: 'MS', institution: 'Fordham University', field: 'Counseling Psychology', year: 2018 },
      { degree: 'BA', institution: 'St. John\'s University', field: 'Psychology', year: 2015 }
    ],
    skills: ['Youth Counseling', 'Sports Coaching', 'Mentorship', 'Event Planning', 'Social Media'],
    achievements: [
      'Launched weekly youth basketball league with 8 teams',
      'Sent 20+ students to Muslim Youth Leadership camps',
      'Created mentorship program pairing youth with professionals',
      'Organized annual youth retreat with 80+ participants'
    ],
    yearsOfService: 4,
    personalStatement: 'Our youth are not just the future - they are the present. My mission is to create a space where young Muslims can be themselves, ask difficult questions, and grow in faith while having fun. The masjid should be their second home.',
    committees: ['Youth Committee', 'Sports Committee', 'Events Committee'],
    socialMedia: { twitter: 'https://twitter.com/brzaidali' }
  },
  {
    id: 'mgmt-7',
    mosqueId: '1',
    name: 'Sr. Maryam Qureshi',
    position: 'women_coordinator',
    department: 'Women\'s Affairs',
    photoUrl: '/images/mgmt-7.jpg',
    biography: 'Sister Maryam coordinates all women-focused programs and ensures sisters have a voice in mosque affairs.',
    email: 'women@alnoor.org',
    phone: '+1 (212) 555-0107',
    responsibilities: [
      'Coordinate sisters\' programs and events',
      'Women\'s counseling services',
      'New Muslim sister support',
      'Manage women\'s prayer area',
      'Advocate for women\'s needs in mosque'
    ],
    termStartDate: '2023-01-01',
    isElected: false,
    isActive: true,
    createdAt: '2024-01-01'
  },
  {
    id: 'mgmt-8',
    mosqueId: '1',
    name: 'Br. Tariq Hassan',
    position: 'facilities_manager',
    department: 'Operations',
    photoUrl: '/images/mgmt-8.jpg',
    biography: 'Brother Tariq manages the mosque facilities ensuring a clean, safe, and welcoming environment for all worshippers.',
    email: 'facilities@alnoor.org',
    phone: '+1 (212) 555-0108',
    responsibilities: [
      'Building maintenance and repairs',
      'Cleaning and janitorial oversight',
      'HVAC and utilities management',
      'Security system maintenance',
      'Parking lot management'
    ],
    termStartDate: '2022-06-01',
    isElected: false,
    isActive: true,
    createdAt: '2024-01-01'
  },
  {
    id: 'mgmt-9',
    mosqueId: '2',
    name: 'Dr. Ibrahim Malik',
    position: 'president',
    photoUrl: '/images/mgmt-9.jpg',
    biography: 'Dr. Ibrahim is a professor of Islamic Studies and leads the mosque with a focus on education and community building.',
    email: 'president@alrahman.org',
    phone: '+1 (718) 555-0201',
    responsibilities: [
      'Oversee mosque operations',
      'Strategic planning',
      'Community representation',
      'Board leadership',
      'Major decision making'
    ],
    termStartDate: '2022-07-01',
    termEndDate: '2026-06-30',
    isElected: true,
    isActive: true,
    createdAt: '2024-01-15'
  },
  {
    id: 'mgmt-10',
    mosqueId: '2',
    name: 'Sr. Khadijah Adams',
    position: 'treasurer',
    photoUrl: '/images/mgmt-10.jpg',
    biography: 'Sister Khadijah is a financial analyst who brings professional expertise to managing the mosque\'s finances.',
    email: 'treasurer@alrahman.org',
    phone: '+1 (718) 555-0202',
    responsibilities: [
      'Financial management',
      'Donation tracking',
      'Budget oversight',
      'Financial reporting',
      'Audit coordination'
    ],
    termStartDate: '2022-07-01',
    termEndDate: '2026-06-30',
    isElected: true,
    isActive: true,
    createdAt: '2024-01-15'
  }
]

export const mockPrayerTimes: PrayerTime[] = [
  {
    id: '1',
    mosqueId: '1',
    date: new Date().toISOString().split('T')[0],
    fajr: '05:15',
    fajrIqama: '05:45',
    sunrise: '06:30',
    dhuhr: '12:30',
    dhuhrIqama: '13:00',
    asr: '15:45',
    asrIqama: '16:15',
    maghrib: '18:30',
    maghribIqama: '18:35',
    isha: '20:00',
    ishaIqama: '20:30',
    jummah: '13:00',
    jummahIqama: '13:30',
    isAutoCalculated: false
  }
]

// Helper functions
export function getMosqueById(id: string): Mosque | undefined {
  return mockMosques.find(m => m.id === id)
}

export function getEventsByMosqueId(mosqueId: string): Event[] {
  return mockEvents.filter(e => e.mosqueId === mosqueId)
}

export function getFinanceByMosqueId(mosqueId: string): FinanceRecord[] {
  return mockFinanceRecords.filter(f => f.mosqueId === mosqueId)
}

export function getAnnouncementsByMosqueId(mosqueId: string): Announcement[] {
  return mockAnnouncements.filter(a => a.mosqueId === mosqueId)
}

export function getDonationGoalsByMosqueId(mosqueId: string): DonationGoal[] {
  return mockDonationGoals.filter(d => d.mosqueId === mosqueId)
}

export function getPrayerTimesByMosqueId(mosqueId: string): PrayerTime | undefined {
  return mockPrayerTimes.find(p => p.mosqueId === mosqueId)
}

export function getImamsByMosqueId(mosqueId: string): Imam[] {
  return mockImams.filter(i => i.mosqueId === mosqueId && i.isActive)
}

export function getImamById(id: string): Imam | undefined {
  return mockImams.find(i => i.id === id)
}

export function getManagementByMosqueId(mosqueId: string): ManagementMember[] {
  return mockManagementMembers.filter(m => m.mosqueId === mosqueId && m.isActive)
}

export function getManagementMemberById(id: string): ManagementMember | undefined {
  return mockManagementMembers.find(m => m.id === id)
}

// Export aliases for admin pages
export const mosques = mockMosques
export const events = mockEvents
export const announcements = mockAnnouncements
export const donations = mockFinanceRecords.filter(r => r.type === 'donation')
export const expenses = mockFinanceRecords.filter(r => r.type === 'expense')
export const donationGoals = mockDonationGoals
export const imams = mockImams
export const managementMembers = mockManagementMembers

// Calculate distance between two coordinates (Haversine formula)
export function calculateDistance(
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): number {
  const R = 3959 // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

export function getNearbyMosques(
  latitude: number, 
  longitude: number, 
  radiusMiles: number = 10
): (Mosque & { distance: number })[] {
  return mockMosques
    .map(mosque => ({
      ...mosque,
      distance: calculateDistance(latitude, longitude, mosque.latitude, mosque.longitude)
    }))
    .filter(mosque => mosque.distance <= radiusMiles)
    .sort((a, b) => a.distance - b.distance)
}
