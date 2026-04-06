# Design Document: Social Feed

## Overview

The Social Feed feature provides community members of the MosqueConnect / Haya Al Falah platform with a personalized, real-time stream of posts. Members can create posts (with optional images), react with likes, comment in threads, follow other members, share posts, and discover nearby or connected users.

The feature is built on an existing Next.js 14 App Router codebase backed by Supabase (PostgreSQL), Clerk for authentication, and a custom realtime event bus (SSE/WebSocket). Significant infrastructure already exists: the `Feed_API` at `/api/feed/posts`, the `Posts_API` at `/api/posts`, the `Follows_API` at `/api/users/[userId]/follow`, and the `EnhancedSocialFeed` React component. This design formalizes the contracts between those layers and specifies the remaining gaps — primarily the community discovery endpoint and the search filter on the Community_API.

---

## Architecture

The feature follows a layered architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser / Client                        │
│  EnhancedSocialFeed (React + SWR + useSWRInfinite)          │
│  PostCard · CommentItem · UserCard · MembersSidebar         │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP / SSE
┌────────────────────▼────────────────────────────────────────┐
│                  Next.js Route Handlers                     │
│  /api/feed/posts          Feed_API (read + write)           │
│  /api/posts/[id]          Posts_API (CRUD)                  │
│  /api/posts/[id]/like     Like_API                          │
│  /api/posts/[id]/comments Comments_API                      │
│  /api/users/[id]/follow   Follows_API                       │
│  /api/users/community     Community_API                     │
│  /api/users/online        Online_API                        │
│  /api/realtime/events     Realtime SSE gateway              │
└──────┬──────────────────────────────────────────────────────┘
       │
┌──────▼──────────────────────────────────────────────────────┐
│                    Backend Services                         │
│  FeedService (fanout-on-write / fanout-on-read)             │
│  SafetyService (mute/block, rate limits, audit)             │
│  RealtimeService (publish events, idempotency)              │
│  QueueService (fanout, notifications, counters)             │
└──────┬──────────────────────────────────────────────────────┘
       │
┌──────▼──────────────────────────────────────────────────────┐
│                      Supabase (Postgres)                    │
│  posts · reactions · comments · user_follows                │
│  profiles · post_bookmarks · feed_items                     │
└─────────────────────────────────────────────────────────────┘
```

### Feed Fanout Strategy

The `FeedService` uses a hybrid fanout model:

- **Fan-out on write** (default): when a post is created, `FeedService.publishPostToFeed` materializes `feed_items` rows for every eligible follower. The `Feed_API` reads from the pre-materialized `feed_items` table.
- **Fan-out on read** (high-follower accounts, threshold ≥ 5 000 followers): the timeline is computed at request time by querying posts from followed authors directly, avoiding write amplification.

The `Feed_API` route handler at `/api/feed/posts` currently bypasses `FeedService` and queries `posts` directly. The design keeps this as-is for the initial delivery (it is functionally correct) and notes the `FeedService` as the intended long-term path.

---

## Components and Interfaces

### API Route Handlers

#### Feed_API — `/api/feed/posts`

| Method | Purpose |
|--------|---------|
| `GET`  | Paginated feed read (cursor or offset). Returns `{ data, userLikes, userBookmarks, nextCursor, totalCount }`. |
| `POST` | Create a post. Body: `{ content, image_url?, post_type?, category?, metadata?, visibility? }`. |

Query parameters for `GET`:
- `limit` — page size, capped at 50
- `offset` — offset-based pagination (used when no cursor)
- `cursor` — ISO timestamp; returns posts with `created_at < cursor`

Cache: 20-second server-side cache keyed on `(userId, limit, offset, cursor)`. Invalidated on post creation by the same user.

#### Posts_API — `/api/posts/[id]`

| Method   | Purpose |
|----------|---------|
| `GET`    | Fetch a single post with author profile. |
| `DELETE` | Delete a post (owner only). |

#### Like_API — `/api/posts/[id]/like`

| Method   | Purpose |
|----------|---------|
| `POST`   | Insert a `like` reaction. Returns `{ success, liked: true }`. |
| `DELETE` | Remove a `like` reaction. Returns `{ success, liked: false }`. |

#### Comments_API — `/api/posts/[id]/comments`

| Method | Purpose |
|--------|---------|
| `GET`  | List comments for a post, filtered by mute/block. |
| `POST` | Create a comment. Body: `{ content, parent_comment_id? }`. |

#### Follows_API — `/api/users/[userId]/follow`

| Method   | Purpose |
|----------|---------|
| `GET`    | Returns `{ followersCount, followingCount, isFollowing }`. |
| `POST`   | Follow a user. |
| `DELETE` | Unfollow a user. |

#### Community_API — `/api/users/community`

| Method | Purpose |
|--------|---------|
| `GET`  | List community members. Query params: `search?` (case-insensitive `full_name` filter), `mode=discovery` (friends-of-friends / nearby / fallback). |

The `search` filter and `mode=discovery` path are **new additions** required by Requirements 8 and 9.

#### Online_API — `/api/users/online`

| Method | Purpose |
|--------|---------|
| `GET`  | Returns profiles with `last_seen_at` within the last 5 minutes, ordered by recency, limited to 50. |

### Frontend Components

| Component | Responsibility |
|-----------|---------------|
| `EnhancedSocialFeed` | Root feed page component. Owns SWR state, realtime subscription, optimistic updates, post compose, share dialog. |
| `PostCard` | Renders a single post with like, comment, bookmark, share, delete actions. |
| `CommentItem` | Renders a single comment, supports threaded replies. |
| `UserCard` | Compact member card used in online/members sidebars. |
| `MembersSidebar` | Right sidebar with Online and Members tabs, search input. |

### Backend Services

| Service | Key Functions |
|---------|--------------|
| `FeedService` | `publishPostToFeed`, `removePostFromFeed`, `getHomeFeedPage` |
| `SafetyService` | `getMutedAndBlockedUserIds`, `canUsersInteract`, `enforceMultiScopeThrottle` |
| `RealtimeService` | `publishRealtimeEvent`, `listRealtimeEventsSince` |
| `QueueService` | `enqueueWork` — queues `fanout`, `notifications`, `counter-aggregation` tasks |

---

## Data Models

### `posts` table (existing)

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `author_id` | `text` | FK → `profiles.id` (Clerk user ID) |
| `body` | `text` | Post content (mapped to `content` in API responses) |
| `image_url` | `text?` | Optional image |
| `post_type` | `text` | `text`, `image`, `share` |
| `category` | `text` | Default `general` |
| `metadata` | `jsonb` | Arbitrary metadata; shares store `{ shared_post_id }` |
| `visibility` | `text` | `public`, `followers`, `private` |
| `is_published` | `bool` | Default `true` |
| `like_count` | `int` | Denormalized counter |
| `comment_count` | `int` | Denormalized counter |
| `mosque_id` | `uuid?` | Optional mosque association |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |

### `reactions` table (existing)

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `post_id` | `uuid` | FK → `posts.id` |
| `user_id` | `text` | FK → `profiles.id` |
| `reaction_type` | `text` | Currently only `like` |

Unique constraint on `(post_id, user_id, reaction_type)`.

### `comments` table (existing)

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `post_id` | `uuid` | FK → `posts.id` |
| `author_id` | `text` | FK → `profiles.id` |
| `body` | `text` | Comment content (mapped to `content` in API responses) |
| `parent_comment_id` | `uuid?` | Self-referential FK for threaded replies |
| `created_at` | `timestamptz` | |

### `user_follows` table (existing)

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` | PK |
| `follower_id` | `text` | FK → `profiles.id` |
| `following_id` | `text` | FK → `profiles.id` |
| `created_at` | `timestamptz` | |

Unique constraint on `(follower_id, following_id)`.

### `profiles` table (existing, relevant columns)

| Column | Type | Notes |
|--------|------|-------|
| `id` | `text` | PK (Clerk user ID) |
| `full_name` | `text` | |
| `avatar_url` | `text?` | |
| `bio` | `text?` | |
| `profession` | `text?` | |
| `role` | `text` | `member`, `imam`, `admin`, etc. |
| `last_seen_at` | `timestamptz?` | Updated by Realtime_Service on session activity |
| `location_lat` | `float8?` | Optional latitude for proximity discovery |
| `location_lng` | `float8?` | Optional longitude for proximity discovery |

### `post_bookmarks` table (existing)

| Column | Type | Notes |
|--------|------|-------|
| `post_id` | `uuid` | FK → `posts.id` |
| `user_id` | `text` | FK → `profiles.id` |

### `feed_items` table (existing, materialized timeline)

| Column | Type | Notes |
|--------|------|-------|
| `user_id` | `text` | FK → `profiles.id` |
| `post_id` | `uuid` | FK → `posts.id` |
| `actor_id` | `text` | Author of the post |
| `score` | `text` | ISO timestamp used for cursor-based ordering |
| `created_at` | `timestamptz` | |

### API Response Types (TypeScript)

```typescript
// Feed post as returned by Feed_API
interface FeedPost {
  id: string
  content: string          // mapped from DB `body`
  image_url: string | null
  created_at: string
  author_id: string
  likes_count: number      // mapped from DB `like_count`
  comments_count: number   // mapped from DB `comment_count`
  metadata: Record<string, unknown>
  profiles: {
    id: string
    full_name: string | null
    avatar_url: string | null
    profession: string | null
    role: string | null
  } | null
}

// Paginated feed response
interface FeedPage {
  data: FeedPost[]
  userLikes: string[]       // post IDs liked by the requesting user
  userBookmarks: string[]   // post IDs bookmarked by the requesting user
  nextCursor: string | null
  totalCount: number | null
}

// Community member profile
interface CommunityMember {
  id: string
  full_name: string | null
  avatar_url: string | null
  bio: string | null
  profession: string | null
  role: string
}
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Post creation persists content faithfully

*For any* non-empty post content string, after a successful POST to `/api/feed/posts`, the returned post record SHALL have a `body` equal to the trimmed input content, and the post SHALL be retrievable from the `posts` table with `is_published = true`.

**Validates: Requirements 1.1, 1.2**

---

### Property 2: Empty or whitespace-only content is rejected

*For any* string composed entirely of whitespace characters (including the empty string), a POST to `/api/feed/posts` with that string as `content` SHALL return HTTP 400 and SHALL NOT insert any row into the `posts` table.

**Validates: Requirements 1.5**

---

### Property 3: Feed excludes muted and blocked authors

*For any* authenticated user U and any set of muted/blocked user IDs M returned by `SafetyService.getMutedAndBlockedUserIds(U)`, every post in the feed response for U SHALL have an `author_id` that is NOT in M.

**Validates: Requirements 2.3, 10.1**

---

### Property 4: Feed pagination cursor correctness

*For any* feed page P returned with a non-null `nextCursor`, a subsequent request using that cursor SHALL return only posts whose `created_at` is strictly earlier than the oldest post in P, and SHALL NOT repeat any post ID already present in P.

**Validates: Requirements 2.4**

---

### Property 5: Like idempotency and toggle correctness

*For any* post and authenticated user, the sequence POST-like → DELETE-like SHALL leave the `reactions` table with no `like` row for that `(post_id, user_id)` pair, and a second POST-like after DELETE-like SHALL re-insert exactly one row. A second POST-like without an intervening DELETE SHALL return HTTP 400.

**Validates: Requirements 3.1, 3.2, 3.3**

---

### Property 6: Comment filtering respects safety rules

*For any* authenticated user U and any set of muted/blocked user IDs M, every comment returned by `GET /api/posts/[id]/comments` for user U SHALL have an `author_id` NOT in M.

**Validates: Requirements 4.7, 10.2**

---

### Property 7: Follow self-reference is rejected

*For any* authenticated user U, a POST to `/api/users/U/follow` (where the target equals the actor) SHALL return HTTP 400 and SHALL NOT insert any row into `user_follows`.

**Validates: Requirements 6.2**

---

### Property 8: Follow/unfollow round-trip restores state

*For any* pair of distinct users A and B where A does not follow B, the sequence follow(A→B) → unfollow(A→B) SHALL result in `isFollowing = false` and the `user_follows` table SHALL contain no row with `follower_id = A` and `following_id = B`.

**Validates: Requirements 6.5**

---

### Property 9: Online members list reflects recency window

*For any* request to `/api/users/online`, every returned profile SHALL have a `last_seen_at` value within the last 5 minutes relative to the server clock at the time of the request.

**Validates: Requirements 7.1**

---

### Property 10: Community search filters by name

*For any* non-empty search query Q, every profile returned by `GET /api/users/community?search=Q` SHALL have a `full_name` that contains Q as a case-insensitive substring.

**Validates: Requirements 8.2**

---

### Property 11: Discovery excludes already-followed and self

*For any* authenticated user U, every profile returned by `GET /api/users/community?mode=discovery` SHALL NOT be U themselves, and SHALL NOT be a user that U already follows.

**Validates: Requirements 9.1**

---

### Property 12: Block prevents interaction

*For any* post authored by user A who has blocked user B, a POST to `/api/posts/[id]/like` or `/api/posts/[id]/comments` by user B SHALL return HTTP 403 and SHALL NOT insert any row into `reactions` or `comments`.

**Validates: Requirements 3.5, 4.6, 10.3**

---

## Error Handling

### HTTP Status Codes

| Scenario | Status |
|----------|--------|
| Missing or empty `content` | 400 |
| Self-follow attempt | 400 |
| Already liked | 400 |
| Unauthenticated request | 401 |
| Block prevents interaction | 403 |
| Resource not found | 404 |
| Rate limit exceeded | 429 (with `Retry-After` header and `retryAfterSeconds` body) |
| Supabase query error | 500 |
| Unexpected exception | 500 |

### Rate Limits (enforced by `SafetyService.enforceMultiScopeThrottle`)

| Action | Window | Account | IP | Device |
|--------|--------|---------|-----|--------|
| `post-create` | 60 s | 15 | 60 | 45 |
| `post-like` | 60 s | 40 | 120 | 80 |
| `comment-create` | 60 s | 20 | 80 | 50 |
| `follow-write` | 60 s | 20 | — | — |

### Client-Side Error Handling

- All mutations use optimistic updates. On failure, the SWR cache is rolled back via `mutateFeed()` and a `toast.error` is shown.
- The `FeedErrorBoundary` component wraps the entire feed and renders a fallback UI on unhandled React errors.
- Network errors during infinite scroll silently stop loading more; the user can scroll back up and retry.

### Visibility Sanitization

The `Feed_API` and `Posts_API` both sanitize the `visibility` field: any value other than `followers` or `private` is coerced to `public`. This prevents invalid visibility states from reaching the database.

---

## Testing Strategy

### Unit Tests

Focus on pure business logic and data transformation:

- `FeedService`: `encodeFeedCursor` / `decodeFeedCursor` round-trip, `clampPageSize` boundary values, `isVisibleForAuthor` truth table.
- `normalisePost` (client-side): field mapping from raw API response to `FeedPost` shape.
- Visibility sanitization logic in route handlers.
- Community search filter logic (case-insensitive substring match).
- Discovery query logic (friends-of-friends exclusion, self-exclusion, fallback to recent members).

### Property-Based Tests

Use a property-based testing library (e.g., `fast-check` for TypeScript) with a minimum of 100 iterations per property. Each test is tagged with the property it validates.

**Tag format:** `Feature: social-feed, Property {N}: {property_title}`

Properties to implement as automated tests:

| Property | Test approach |
|----------|--------------|
| P1: Post creation persists content | Generate random non-empty strings; POST to mocked handler; assert DB insert args |
| P2: Empty/whitespace content rejected | Generate whitespace-only strings; assert HTTP 400, no DB insert |
| P3: Feed excludes muted/blocked authors | Generate random post lists with random mute sets; assert filter removes correct posts |
| P4: Cursor pagination correctness | Generate random post sequences; assert cursor slicing produces non-overlapping pages |
| P5: Like toggle correctness | Generate random (postId, userId) pairs; assert reaction table state after like/unlike sequences |
| P6: Comment filtering | Generate random comment lists with random mute sets; assert filter removes correct comments |
| P7: Self-follow rejected | Generate random user IDs; assert self-follow returns 400 |
| P8: Follow/unfollow round-trip | Generate random user pairs; assert state after follow→unfollow |
| P9: Online members recency | Generate random `last_seen_at` timestamps; assert only recent ones pass the filter |
| P10: Community search filter | Generate random member lists and search queries; assert all results contain query substring |
| P11: Discovery excludes self and followed | Generate random follow graphs; assert discovery results exclude self and already-followed users |
| P12: Block prevents interaction | Generate random block relationships; assert 403 is returned for blocked interactions |

### Integration Tests

- End-to-end POST → GET feed round-trip against a test Supabase instance.
- Follow → feed fanout: verify a post appears in a follower's feed after fanout.
- Realtime event delivery: verify `post.created` event is received by a connected SSE client.
- Rate limit enforcement: verify 429 is returned after exceeding the configured threshold.

### Snapshot / UI Tests

- `PostCard` renders correctly for text posts, image posts, and share posts.
- `UserCard` renders online indicator when `isOnline = true`.
- `MembersSidebar` renders the correct tab content for Online and Members tabs.
