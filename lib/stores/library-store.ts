"use client"

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { LibraryBook, LibraryItem, BookBorrowing, BookCategory, BookCondition, LibraryItemStatus, LibraryItemType, BorrowingStatus } from '../types'

// Initial mock data for books
const initialBooks: LibraryBook[] = [
  {
    id: 'book-1',
    mosqueId: '1',
    title: 'Tafsir Ibn Kathir (Complete Set)',
    author: 'Ibn Kathir',
    isbn: '978-1591440208',
    category: 'tafseer',
    language: 'English',
    description: 'The most popular and most widely accepted explanation of the Quran in the entire world. This comprehensive tafsir offers detailed commentary on each verse.',
    publisher: 'Darussalam',
    publishYear: 2003,
    totalCopies: 3,
    availableCopies: 2,
    location: 'Main Library - Shelf A1',
    condition: 'excellent',
    addedBy: 'admin',
    addedByName: 'Library Admin',
    status: 'approved',
    approvedBy: 'imam-1',
    approvedDate: '2024-01-15',
    tags: ['tafsir', 'quran commentary', 'classical'],
    isReferencOnly: false,
    createdAt: '2024-01-10',
    updatedAt: '2024-01-15'
  },
  {
    id: 'book-2',
    mosqueId: '1',
    title: 'Sahih Al-Bukhari (9 Volume Set)',
    author: 'Imam Bukhari',
    isbn: '978-9960717315',
    category: 'hadith',
    language: 'Arabic/English',
    description: 'The most authentic collection of hadith, compiled by Imam al-Bukhari. This bilingual edition includes Arabic text with English translation.',
    publisher: 'Darussalam',
    publishYear: 1997,
    totalCopies: 2,
    availableCopies: 1,
    location: 'Main Library - Shelf A2',
    condition: 'good',
    addedBy: 'admin',
    addedByName: 'Library Admin',
    status: 'approved',
    approvedBy: 'imam-1',
    approvedDate: '2024-01-20',
    tags: ['hadith', 'sunnah', 'classical', 'authentic'],
    isReferencOnly: true,
    createdAt: '2024-01-18',
    updatedAt: '2024-01-20'
  },
  {
    id: 'book-3',
    mosqueId: '1',
    title: 'The Sealed Nectar (Ar-Raheeq Al-Makhtum)',
    author: 'Safiur Rahman Mubarakpuri',
    isbn: '978-9960899558',
    category: 'seerah',
    language: 'English',
    description: 'Award-winning biography of Prophet Muhammad (PBUH). This book won first prize in the seerah writing competition organized by the Muslim World League.',
    publisher: 'Darussalam',
    publishYear: 1979,
    totalCopies: 5,
    availableCopies: 3,
    location: 'Main Library - Shelf B1',
    condition: 'excellent',
    addedBy: 'member-1',
    addedByName: 'Ahmad Hassan',
    status: 'approved',
    approvedBy: 'imam-1',
    approvedDate: '2024-02-01',
    tags: ['seerah', 'prophet', 'biography', 'award-winning'],
    isReferencOnly: false,
    createdAt: '2024-01-25',
    updatedAt: '2024-02-01'
  },
  {
    id: 'book-4',
    mosqueId: '1',
    title: 'Riyadh us-Saliheen',
    author: 'Imam An-Nawawi',
    isbn: '978-9960740812',
    category: 'hadith',
    language: 'Arabic/English',
    description: 'A collection of verses from the Quran and hadith compiled by Imam An-Nawawi. Covers various aspects of Islamic life and ethics.',
    publisher: 'Darussalam',
    publishYear: 1999,
    totalCopies: 4,
    availableCopies: 4,
    location: 'Main Library - Shelf A2',
    condition: 'good',
    addedBy: 'admin',
    addedByName: 'Library Admin',
    status: 'approved',
    approvedBy: 'imam-1',
    approvedDate: '2024-02-05',
    tags: ['hadith', 'ethics', 'guidance'],
    isReferencOnly: false,
    createdAt: '2024-02-01',
    updatedAt: '2024-02-05'
  },
  {
    id: 'book-5',
    mosqueId: '1',
    title: 'Stories of the Prophets',
    author: 'Ibn Kathir',
    isbn: '978-9960897165',
    category: 'children',
    language: 'English',
    description: 'Beautifully illustrated stories of the prophets for young readers. Perfect for children aged 6-12.',
    publisher: 'Darussalam Kids',
    publishYear: 2010,
    totalCopies: 8,
    availableCopies: 6,
    location: 'Children Section - Shelf C1',
    condition: 'excellent',
    addedBy: 'member-2',
    addedByName: 'Fatima Khan',
    status: 'approved',
    approvedBy: 'imam-2',
    approvedDate: '2024-02-10',
    tags: ['children', 'prophets', 'stories', 'illustrated'],
    isReferencOnly: false,
    createdAt: '2024-02-08',
    updatedAt: '2024-02-10'
  },
  {
    id: 'book-6',
    mosqueId: '1',
    title: 'Fortress of the Muslim (Hisnul Muslim)',
    author: 'Said bin Ali bin Wahf Al-Qahtani',
    isbn: '978-9960740300',
    category: 'spirituality',
    language: 'Arabic/English',
    description: 'Comprehensive collection of authentic supplications and duas from the Quran and Sunnah for daily use.',
    publisher: 'Darussalam',
    publishYear: 1998,
    totalCopies: 15,
    availableCopies: 12,
    location: 'Main Hall - Near Entrance',
    condition: 'good',
    addedBy: 'admin',
    addedByName: 'Library Admin',
    status: 'approved',
    approvedBy: 'imam-1',
    approvedDate: '2024-01-05',
    tags: ['duas', 'supplications', 'daily', 'pocket-size'],
    isReferencOnly: false,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-05'
  },
  {
    id: 'book-7',
    mosqueId: '1',
    title: 'Arabic Made Easy',
    author: 'Dr. Abdur Rahim',
    isbn: '978-8178984032',
    category: 'arabic',
    language: 'English/Arabic',
    description: 'A comprehensive course for learning Arabic language with focus on Quranic vocabulary.',
    publisher: 'Islamic Foundation',
    publishYear: 2015,
    totalCopies: 6,
    availableCopies: 4,
    location: 'Education Room - Shelf D1',
    condition: 'excellent',
    addedBy: 'admin',
    addedByName: 'Library Admin',
    status: 'approved',
    approvedBy: 'imam-2',
    approvedDate: '2024-02-15',
    tags: ['arabic', 'learning', 'course', 'quranic'],
    isReferencOnly: false,
    createdAt: '2024-02-12',
    updatedAt: '2024-02-15'
  },
  {
    id: 'book-8',
    mosqueId: '1',
    title: 'Fiqh us-Sunnah',
    author: 'Sayyid Sabiq',
    isbn: '978-0892590483',
    category: 'fiqh',
    language: 'English',
    description: 'Comprehensive guide to Islamic jurisprudence based on Quran and authentic hadith.',
    publisher: 'American Trust Publications',
    publishYear: 1991,
    totalCopies: 3,
    availableCopies: 2,
    location: 'Main Library - Shelf A3',
    condition: 'good',
    addedBy: 'admin',
    addedByName: 'Library Admin',
    status: 'approved',
    approvedBy: 'imam-1',
    approvedDate: '2024-02-20',
    tags: ['fiqh', 'jurisprudence', 'sunnah', 'practical'],
    isReferencOnly: false,
    createdAt: '2024-02-18',
    updatedAt: '2024-02-20'
  },
  {
    id: 'book-9',
    mosqueId: '1',
    title: 'My First Quran Storybook',
    author: 'Saniyasnain Khan',
    category: 'children',
    language: 'English',
    description: 'Colorful stories from the Quran for very young children. Ages 3-6.',
    publisher: 'Goodword Books',
    publishYear: 2018,
    totalCopies: 10,
    availableCopies: 8,
    location: 'Children Section - Shelf C2',
    condition: 'excellent',
    addedBy: 'member-3',
    addedByName: 'Sarah Ahmed',
    status: 'pending_approval',
    tags: ['children', 'quran', 'stories', 'toddler'],
    isReferencOnly: false,
    createdAt: '2024-03-10',
    updatedAt: '2024-03-10'
  },
  {
    id: 'book-10',
    mosqueId: '2',
    title: 'In the Footsteps of the Prophet',
    author: 'Tariq Ramadan',
    isbn: '978-0195308808',
    category: 'seerah',
    language: 'English',
    description: 'Modern biography focusing on the spiritual and ethical teachings from the life of Prophet Muhammad (PBUH).',
    publisher: 'Oxford University Press',
    publishYear: 2007,
    totalCopies: 4,
    availableCopies: 3,
    location: 'Main Library - Shelf B2',
    condition: 'excellent',
    addedBy: 'admin',
    addedByName: 'Library Admin',
    status: 'approved',
    approvedBy: 'imam-3',
    approvedDate: '2024-02-25',
    tags: ['seerah', 'modern', 'spiritual', 'ethics'],
    isReferencOnly: false,
    createdAt: '2024-02-22',
    updatedAt: '2024-02-25'
  }
]

// Initial mock data for other library items
const initialItems: LibraryItem[] = [
  {
    id: 'item-1',
    mosqueId: '1',
    name: 'Premium Prayer Mats (Green)',
    type: 'prayer_mat',
    category: 'Prayer Essentials',
    description: 'High-quality padded prayer mats in green color. Perfect for visitors.',
    quantity: 50,
    availableQuantity: 45,
    location: 'Main Prayer Hall - Back Storage',
    condition: 'excellent',
    addedBy: 'admin',
    addedByName: 'Facilities Manager',
    status: 'approved',
    approvedBy: 'manager-1',
    approvedDate: '2024-01-10',
    createdAt: '2024-01-08',
    updatedAt: '2024-01-10'
  },
  {
    id: 'item-2',
    mosqueId: '1',
    name: 'Wooden Quran Stands (Rehal)',
    type: 'quran_stand',
    category: 'Reading Accessories',
    description: 'Hand-carved wooden Quran stands. Various sizes available.',
    quantity: 25,
    availableQuantity: 23,
    location: 'Library Area',
    condition: 'good',
    addedBy: 'admin',
    addedByName: 'Library Admin',
    status: 'approved',
    approvedBy: 'imam-1',
    approvedDate: '2024-01-15',
    createdAt: '2024-01-12',
    updatedAt: '2024-01-15'
  },
  {
    id: 'item-3',
    mosqueId: '1',
    name: 'Prayer Caps (White)',
    type: 'prayer_cap',
    category: 'Prayer Essentials',
    description: 'White cotton prayer caps in various sizes.',
    quantity: 100,
    availableQuantity: 85,
    location: 'Main Prayer Hall - Entrance',
    condition: 'new',
    addedBy: 'admin',
    addedByName: 'Facilities Manager',
    status: 'approved',
    approvedBy: 'manager-1',
    approvedDate: '2024-02-01',
    createdAt: '2024-01-28',
    updatedAt: '2024-02-01'
  },
  {
    id: 'item-4',
    mosqueId: '1',
    name: 'Portable Microphone System',
    type: 'audio_equipment',
    category: 'Audio/Visual',
    description: 'Wireless microphone system for lectures and events.',
    quantity: 3,
    availableQuantity: 2,
    location: 'Storage Room - AV Cabinet',
    condition: 'excellent',
    addedBy: 'admin',
    addedByName: 'Facilities Manager',
    status: 'approved',
    approvedBy: 'manager-1',
    approvedDate: '2024-02-05',
    createdAt: '2024-02-02',
    updatedAt: '2024-02-05'
  }
]

// Initial borrowing records
const initialBorrowings: BookBorrowing[] = [
  {
    id: 'borrow-1',
    bookId: 'book-1',
    mosqueId: '1',
    borrowerName: 'Muhammad Ali',
    borrowerEmail: 'mali@email.com',
    borrowerPhone: '(555) 123-4567',
    borrowDate: '2024-03-01',
    dueDate: '2024-03-15',
    status: 'active',
    createdAt: '2024-03-01'
  },
  {
    id: 'borrow-2',
    bookId: 'book-3',
    mosqueId: '1',
    borrowerName: 'Aisha Rahman',
    borrowerEmail: 'aisha@email.com',
    borrowerPhone: '(555) 234-5678',
    borrowDate: '2024-02-20',
    dueDate: '2024-03-05',
    returnDate: '2024-03-03',
    status: 'returned',
    createdAt: '2024-02-20'
  },
  {
    id: 'borrow-3',
    bookId: 'book-5',
    mosqueId: '1',
    borrowerName: 'Ibrahim Khan',
    borrowerEmail: 'ibrahim@email.com',
    borrowerPhone: '(555) 345-6789',
    borrowDate: '2024-03-05',
    dueDate: '2024-03-19',
    status: 'active',
    createdAt: '2024-03-05'
  }
]

interface LibraryState {
  books: LibraryBook[]
  items: LibraryItem[]
  borrowings: BookBorrowing[]
  
  // Book CRUD
  addBook: (book: Omit<LibraryBook, 'id' | 'createdAt' | 'updatedAt'>) => string
  updateBook: (id: string, updates: Partial<LibraryBook>) => void
  deleteBook: (id: string) => void
  approveBook: (id: string, approvedBy: string) => void
  rejectBook: (id: string, reason: string) => void
  
  // Item CRUD
  addItem: (item: Omit<LibraryItem, 'id' | 'createdAt' | 'updatedAt'>) => string
  updateItem: (id: string, updates: Partial<LibraryItem>) => void
  deleteItem: (id: string) => void
  approveItem: (id: string, approvedBy: string) => void
  rejectItem: (id: string, reason: string) => void
  
  // Borrowing CRUD
  addBorrowing: (borrowing: Omit<BookBorrowing, 'id' | 'createdAt'>) => string
  returnBook: (borrowingId: string) => void
  markAsLost: (borrowingId: string) => void
  
  // Getters
  getBooksByMosque: (mosqueId: string) => LibraryBook[]
  getItemsByMosque: (mosqueId: string) => LibraryItem[]
  getBorrowingsByMosque: (mosqueId: string) => BookBorrowing[]
  getPendingBooks: (mosqueId?: string) => LibraryBook[]
  getPendingItems: (mosqueId?: string) => LibraryItem[]
  getActiveBorrowings: (mosqueId: string) => BookBorrowing[]
  getOverdueBorrowings: (mosqueId: string) => BookBorrowing[]
  getBookById: (id: string) => LibraryBook | undefined
  getItemById: (id: string) => LibraryItem | undefined
}

export const useLibraryStore = create<LibraryState>()(
  persist(
    (set, get) => ({
      books: initialBooks,
      items: initialItems,
      borrowings: initialBorrowings,
      
      // Book CRUD
      addBook: (book) => {
        const id = `book-${Date.now()}`
        const now = new Date().toISOString().split('T')[0]
        set((state) => ({
          books: [...state.books, { 
            ...book, 
            id, 
            createdAt: now, 
            updatedAt: now,
            status: 'pending_approval' as LibraryItemStatus
          }]
        }))
        return id
      },
      
      updateBook: (id, updates) => {
        const now = new Date().toISOString().split('T')[0]
        set((state) => ({
          books: state.books.map((book) =>
            book.id === id ? { ...book, ...updates, updatedAt: now } : book
          )
        }))
      },
      
      deleteBook: (id) => {
        set((state) => ({
          books: state.books.filter((book) => book.id !== id),
          borrowings: state.borrowings.filter((b) => b.bookId !== id)
        }))
      },
      
      approveBook: (id, approvedBy) => {
        const now = new Date().toISOString().split('T')[0]
        set((state) => ({
          books: state.books.map((book) =>
            book.id === id
              ? { ...book, status: 'approved' as LibraryItemStatus, approvedBy, approvedDate: now, updatedAt: now }
              : book
          )
        }))
      },
      
      rejectBook: (id, reason) => {
        const now = new Date().toISOString().split('T')[0]
        set((state) => ({
          books: state.books.map((book) =>
            book.id === id
              ? { ...book, status: 'rejected' as LibraryItemStatus, rejectionReason: reason, updatedAt: now }
              : book
          )
        }))
      },
      
      // Item CRUD
      addItem: (item) => {
        const id = `item-${Date.now()}`
        const now = new Date().toISOString().split('T')[0]
        set((state) => ({
          items: [...state.items, { 
            ...item, 
            id, 
            createdAt: now, 
            updatedAt: now,
            status: 'pending_approval' as LibraryItemStatus
          }]
        }))
        return id
      },
      
      updateItem: (id, updates) => {
        const now = new Date().toISOString().split('T')[0]
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, ...updates, updatedAt: now } : item
          )
        }))
      },
      
      deleteItem: (id) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== id)
        }))
      },
      
      approveItem: (id, approvedBy) => {
        const now = new Date().toISOString().split('T')[0]
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id
              ? { ...item, status: 'approved' as LibraryItemStatus, approvedBy, approvedDate: now, updatedAt: now }
              : item
          )
        }))
      },
      
      rejectItem: (id, reason) => {
        const now = new Date().toISOString().split('T')[0]
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id
              ? { ...item, status: 'rejected' as LibraryItemStatus, rejectionReason: reason, updatedAt: now }
              : item
          )
        }))
      },
      
      // Borrowing CRUD
      addBorrowing: (borrowing) => {
        const id = `borrow-${Date.now()}`
        const now = new Date().toISOString().split('T')[0]
        
        // Decrease available copies
        set((state) => ({
          borrowings: [...state.borrowings, { ...borrowing, id, createdAt: now }],
          books: state.books.map((book) =>
            book.id === borrowing.bookId
              ? { ...book, availableCopies: Math.max(0, book.availableCopies - 1) }
              : book
          )
        }))
        return id
      },
      
      returnBook: (borrowingId) => {
        const borrowing = get().borrowings.find((b) => b.id === borrowingId)
        if (!borrowing) return
        
        const now = new Date().toISOString().split('T')[0]
        set((state) => ({
          borrowings: state.borrowings.map((b) =>
            b.id === borrowingId
              ? { ...b, returnDate: now, status: 'returned' as BorrowingStatus }
              : b
          ),
          books: state.books.map((book) =>
            book.id === borrowing.bookId
              ? { ...book, availableCopies: book.availableCopies + 1 }
              : book
          )
        }))
      },
      
      markAsLost: (borrowingId) => {
        set((state) => ({
          borrowings: state.borrowings.map((b) =>
            b.id === borrowingId
              ? { ...b, status: 'lost' as BorrowingStatus }
              : b
          )
        }))
      },
      
      // Getters
      getBooksByMosque: (mosqueId) => {
        return get().books.filter((book) => book.mosqueId === mosqueId && book.status === 'approved')
      },
      
      getItemsByMosque: (mosqueId) => {
        return get().items.filter((item) => item.mosqueId === mosqueId && item.status === 'approved')
      },
      
      getBorrowingsByMosque: (mosqueId) => {
        return get().borrowings.filter((b) => b.mosqueId === mosqueId)
      },
      
      getPendingBooks: (mosqueId) => {
        const books = get().books.filter((book) => book.status === 'pending_approval')
        return mosqueId ? books.filter((b) => b.mosqueId === mosqueId) : books
      },
      
      getPendingItems: (mosqueId) => {
        const items = get().items.filter((item) => item.status === 'pending_approval')
        return mosqueId ? items.filter((i) => i.mosqueId === mosqueId) : items
      },
      
      getActiveBorrowings: (mosqueId) => {
        return get().borrowings.filter((b) => b.mosqueId === mosqueId && b.status === 'active')
      },
      
      getOverdueBorrowings: (mosqueId) => {
        const today = new Date().toISOString().split('T')[0]
        return get().borrowings.filter(
          (b) => b.mosqueId === mosqueId && b.status === 'active' && b.dueDate < today
        )
      },
      
      getBookById: (id) => {
        return get().books.find((book) => book.id === id)
      },
      
      getItemById: (id) => {
        return get().items.find((item) => item.id === id)
      }
    }),
    {
      name: 'library-storage'
    }
  )
)

// Helper functions
export const bookCategoryLabels: Record<BookCategory, string> = {
  quran: 'Quran',
  hadith: 'Hadith',
  fiqh: 'Fiqh (Jurisprudence)',
  tafseer: 'Tafseer',
  seerah: 'Seerah (Biography)',
  arabic: 'Arabic Language',
  islamic_history: 'Islamic History',
  spirituality: 'Spirituality & Tasawwuf',
  children: "Children's Books",
  youth: 'Youth Books',
  women: "Women's Section",
  comparative_religion: 'Comparative Religion',
  general_islamic: 'General Islamic',
  other: 'Other'
}

export const conditionLabels: Record<BookCondition, string> = {
  new: 'New',
  excellent: 'Excellent',
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor'
}

export const itemTypeLabels: Record<LibraryItemType, string> = {
  prayer_mat: 'Prayer Mat',
  prayer_cap: 'Prayer Cap',
  quran_stand: 'Quran Stand (Rehal)',
  audio_equipment: 'Audio Equipment',
  educational_material: 'Educational Material',
  display_item: 'Display Item',
  furniture: 'Furniture',
  other: 'Other'
}
