# MosqueConnect - Enhanced Social Feed & Messaging System

## What's Been Implemented

### 1. **Fast Data Fetching with SWR**
- Implemented SWR (stale-while-revalidate) for automatic data refresh
- Feed posts refresh every 10 seconds for real-time updates
- Online users refresh every 15 seconds
- Community members refresh every 30 seconds
- Automatic deduplication to prevent excessive requests

### 2. **Real Online Users & Community Members**
- `/api/users/online` - Fetches users active in last 5 minutes
- `/api/users/community` - Fetches all active community members
- `/api/users/status` - Updates user's last_seen_at timestamp every 30 seconds
- Real-time status tracking for online indicator (green dot)

### 3. **Enhanced Social Feed**
- **Create Posts**: Share text content with optional photo upload
- **Photo Upload**: Drag-and-drop or click to upload images via Vercel Blob
- **Like & Comment**: Interact with posts (likes show instantly with SWR re-fetch)
- **User Profiles**: Click on any user to view their full profile
- **Real-time**: Posts appear instantly as they're created

### 4. **Integrated Messaging in Feed**
- Three tabs in feed: Feed, Online Users, Members
- Each user card has a "Message" button
- Direct messaging links to `/messages` route
- Secure 1:1 conversations with proper RLS policies

### 5. **Comprehensive User Profiles**
- **Profile Page** (`/profile`): Current user's profile with edit capability
- **User Profile** (`/profile/[id]`): View any user's profile
- **Profile Fields**:
  - Full name, email, phone
  - Professional info (profession, education)
  - Website, languages spoken
  - Member since date
  - Online status indicator
  - Bio section

### 6. **Performance Optimizations**
- **SWR Caching**: Reduces API calls with intelligent deduplication
- **Database Indexes**: 
  - `idx_profiles_last_seen_at` for fast online user queries
  - `idx_posts_created_at` for fast feed queries
  - `idx_posts_author_id` for user post lookups
- **Lazy Loading**: Images use Next.js Image component for optimization
- **API Revalidation**: 
  - Feed: 5 seconds
  - Online users: 15 seconds  
  - Community: 30 seconds

### 7. **Secure Communication**
- **1:1 Messaging**: Private conversations with proper RLS
- **Group/Broadcast**: Support for broadcast conversations
- **Message Types**: Text, images, files, system messages
- **Read Receipts**: Track when messages are read
- **Muting**: Users can mute conversations

### 8. **Responsive Design**
- Mobile-first approach with proper spacing
- All panels use responsive padding (`p-4 sm:p-6 lg:p-8`)
- Three-column layout on desktop (profile, feed, stats)
- Single column on mobile (stackable)
- Touch-friendly buttons and interactions

## API Routes

```
GET  /api/feed/posts              - Get paginated feed posts
POST /api/posts                   - Create new post
POST /api/upload                  - Upload image to Blob
GET  /api/users/online            - Get online users (last 5 min)
GET  /api/users/community         - Get all community members
POST /api/users/status            - Update user's last_seen_at
POST /api/conversations           - Create/get direct conversation
POST /api/conversations/[id]/messages - Post message
```

## Database Schema

### New Fields Added to `profiles` table:
- `last_seen_at` - TIMESTAMPTZ - For online status tracking
- `profession` - TEXT - User's profession
- `education` - TEXT - Educational background
- `languages` - TEXT[] - Array of spoken languages
- `website` - TEXT - Personal website URL

### Messaging Tables (Already Created):
- `conversations` - Stores 1:1, group, and broadcast conversations
- `conversation_participants` - Links users to conversations
- `messages` - Individual messages with media support
- `message_reads` - Read receipts for messages

## Security Features

1. **Row Level Security (RLS)**:
   - Users can only see conversations they participate in
   - Messages are only visible to conversation members
   - Profiles limited access based on role

2. **Authentication**:
   - All routes require authenticated user
   - User ID from auth context used for security

3. **Data Validation**:
   - Image file type and size validation
   - Text content sanitization
   - User role verification for admin actions

## Key Files

- `/components/feed/enhanced-social-feed.tsx` - Main social feed component
- `/app/profile/[id]/page.tsx` - User profile viewer
- `/app/feed/page.tsx` - Feed page entry point
- `/app/api/feed/posts/route.ts` - Feed API
- `/app/api/users/online/route.ts` - Online users API
- `/app/api/users/community/route.ts` - Community members API
- `/lib/auth-context.tsx` - Auth with status tracking

## How to Use

1. **View Feed**: Navigate to `/feed` to see real posts and interact
2. **Search Members**: Use search tab to find community members
3. **Visit Profiles**: Click on any user card to see their full profile
4. **Send Messages**: Click "Message" button to start direct chat
5. **Create Posts**: Write content, optionally add photo, click Post

## Performance Tips

- Feed auto-refreshes every 10 seconds - changes appear automatically
- Online status updates every 30 seconds
- Images are optimized with Next.js Image component
- SWR prevents unnecessary API calls with smart caching
- Responsive design works seamlessly on all devices

---

The app now provides a full social media experience with real user data, fast performance, and secure messaging!
