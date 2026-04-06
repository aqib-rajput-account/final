# Implementation Plan: Social Feed

## Overview

Incremental implementation of the Social Feed feature on top of the existing Next.js / Supabase / Clerk stack. Each task builds on the previous one, wiring components together progressively. The design document, requirements, and all existing route handlers are assumed to be available as context during implementation.

## Tasks

- [x] 1. Audit and align existing API route handlers with design contracts
  - [x] 1.1 Review `/api/feed/posts` GET handler — verify it returns `{ data, userLikes, userBookmarks, nextCursor, totalCount }` with correct field mapping (`body` → `content`, `like_count` → `likes_count`)
    - Fix any field-name mismatches between DB columns and the `FeedPost` TypeScript interface
    - Ensure `visibility` sanitization coerces unknown values to `public`
    - _Requirements: 2.1, 2.2, 1.8_
  - [x] 1.2 Review `/api/feed/posts` POST handler — verify it trims `content`, sets `author_id`, `is_published = true`, and defaults `visibility` to `public`
    - Confirm HTTP 400 is returned for absent or empty `content`
    - _Requirements: 1.1, 1.2, 1.5, 1.8_
  - [ ]* 1.3 Write unit tests for visibility sanitization and field-mapping logic
    - Test `normalisePost` mapping from raw DB row to `FeedPost` shape
    - Test visibility coercion truth table
    - _Requirements: 1.8, 2.2_

- [x] 2. Implement post creation with realtime and fanout
  - [x] 2.1 In the Feed_API POST handler, call `RealtimeService.publishRealtimeEvent` with a `post.created` event after a successful insert (for `public` and `followers` visibility)
    - Call `QueueService.enqueueWork` with a `feed.post.created` fanout task
    - _Requirements: 1.3, 1.4_
  - [x] 2.2 Implement cache invalidation: after a successful post creation, invalidate the server-side feed cache for the authenticated user
    - _Requirements: 2.7_
  - [ ]* 2.3 Write property test for post creation content persistence (Property 1)
    - **Property 1: Post creation persists content faithfully**
    - **Validates: Requirements 1.1, 1.2**
  - [ ]* 2.4 Write property test for empty/whitespace content rejection (Property 2)
    - **Property 2: Empty or whitespace-only content is rejected**
    - **Validates: Requirements 1.5**

- [x] 3. Implement feed read with safety filtering and cursor pagination
  - [x] 3.1 In the Feed_API GET handler, call `SafetyService.getMutedAndBlockedUserIds` and filter out posts whose `author_id` is in the returned set
    - _Requirements: 2.3, 10.1_
  - [x] 3.2 Implement cursor-based pagination: when `cursor` query param is present, add `created_at < cursor` predicate to the Supabase query; set `nextCursor` to the `created_at` of the last returned post
    - _Requirements: 2.4_
  - [x] 3.3 Add 20-second server-side cache keyed on `(userId, limit, offset, cursor)`; include `X-Cache: HIT` header on cache hits
    - _Requirements: 2.6_
  - [ ]* 3.4 Write property test for feed safety filtering (Property 3)
    - **Property 3: Feed excludes muted and blocked authors**
    - **Validates: Requirements 2.3, 10.1**
  - [ ]* 3.5 Write property test for cursor pagination correctness (Property 4)
    - **Property 4: Feed pagination cursor correctness**
    - **Validates: Requirements 2.4**

- [x] 4. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement like / unlike with safety and rate limiting
  - [x] 5.1 In the Like_API POST handler, check `SafetyService.canUsersInteract` — return HTTP 403 if the post author has blocked the requesting user
    - Return HTTP 400 with "Already liked" if a reaction row already exists for `(post_id, user_id)`
    - Insert the reaction row and publish a `post.liked` realtime event
    - _Requirements: 3.1, 3.2, 3.5_
  - [x] 5.2 In the Like_API DELETE handler, remove the matching reaction row and publish a `post.unliked` realtime event
    - _Requirements: 3.3, 3.4_
  - [x] 5.3 Apply `SafetyService.enforceMultiScopeThrottle` for `post-like` (40 req / 60 s per account) in both POST and DELETE handlers; return HTTP 429 with `retryAfterSeconds` on breach
    - _Requirements: 3.6, 10.4_
  - [ ]* 5.4 Write property test for like idempotency and toggle correctness (Property 5)
    - **Property 5: Like idempotency and toggle correctness**
    - **Validates: Requirements 3.1, 3.2, 3.3**
  - [ ]* 5.5 Write property test for block preventing like interaction (Property 12)
    - **Property 12: Block prevents interaction**
    - **Validates: Requirements 3.5, 10.3**

- [x] 6. Implement comments with threading, safety filtering, and rate limiting
  - [x] 6.1 In the Comments_API POST handler, validate `content` is non-empty (HTTP 400 otherwise), check `SafetyService.canUsersInteract` (HTTP 403 if blocked), then insert into `comments` with `post_id`, `author_id`, `body`, and optional `parent_comment_id`
    - Publish `comment.created` realtime event and enqueue `notifications.comment.created` and `counters.comment.created` tasks
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_
  - [x] 6.2 Apply `SafetyService.enforceMultiScopeThrottle` for `comment-create` (20 req / 60 s per account); return HTTP 429 on breach
    - _Requirements: 4.8, 10.4_
  - [x] 6.3 In the Comments_API GET handler, call `SafetyService.getMutedAndBlockedUserIds` and filter out comments whose `author_id` is in the returned set
    - _Requirements: 4.7, 10.2_
  - [ ]* 6.4 Write property test for comment safety filtering (Property 6)
    - **Property 6: Comment filtering respects safety rules**
    - **Validates: Requirements 4.7, 10.2**
  - [ ]* 6.5 Write property test for block preventing comment interaction (Property 12 — comment path)
    - **Property 12: Block prevents interaction**
    - **Validates: Requirements 4.6, 10.3**

- [x] 7. Implement share post
  - [x] 7.1 In the Feed_API POST handler, handle `post_type = "share"`: validate `metadata.shared_post_id` is present, create the post record, and apply the same visibility sanitization, rate limiting, and fanout logic as for original posts
    - Publish `post.created` realtime event with the share's post ID
    - _Requirements: 5.1, 5.2, 5.3_
  - [x] 7.2 In `EnhancedSocialFeed` / `PostCard`, implement the copy-link action that writes the post's canonical URL to `navigator.clipboard` without a server round-trip
    - _Requirements: 5.4_

- [x] 8. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement follow / unfollow with rate limiting and realtime
  - [x] 9.1 In the Follows_API POST handler, return HTTP 400 if `userId` equals the authenticated user's ID; treat an already-existing follow as a no-op (HTTP 200); otherwise insert into `user_follows` and publish `follow.created` event + enqueue `feed.follow.created` and `notifications.follow.created` tasks
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  - [x] 9.2 In the Follows_API DELETE handler, remove the matching `user_follows` row and publish a `follow.deleted` realtime event
    - _Requirements: 6.5_
  - [x] 9.3 Apply `SafetyService.enforceMultiScopeThrottle` for `follow-write` (20 req / 60 s per account) in both POST and DELETE handlers
    - _Requirements: 6.7, 10.4_
  - [ ]* 9.4 Write property test for self-follow rejection (Property 7)
    - **Property 7: Follow self-reference is rejected**
    - **Validates: Requirements 6.2**
  - [ ]* 9.5 Write property test for follow/unfollow round-trip (Property 8)
    - **Property 8: Follow/unfollow round-trip restores state**
    - **Validates: Requirements 6.5**

- [x] 10. Implement Online_API and Community_API — search and discovery
  - [x] 10.1 Verify the Online_API GET handler queries `profiles` where `last_seen_at >= now() - interval '5 minutes'`, ordered by `last_seen_at` descending, limited to 50
    - _Requirements: 7.1, 7.2_
  - [x] 10.2 Add `search` query parameter support to the Community_API GET handler: when present, add a case-insensitive `ilike` filter on `full_name`
    - _Requirements: 8.1, 8.2_
  - [x] 10.3 Add `mode=discovery` path to the Community_API GET handler:
    - Query friends-of-friends (users followed by people the requesting user follows), excluding already-followed users and self, limited to 20
    - If location data is available, include members within 50 km radius
    - If no results, fall back to recently joined members ordered by `created_at` descending
    - _Requirements: 9.1, 9.2, 9.3, 9.4_
  - [ ]* 10.4 Write property test for online members recency window (Property 9)
    - **Property 9: Online members list reflects recency window**
    - **Validates: Requirements 7.1**
  - [ ]* 10.5 Write property test for community search name filter (Property 10)
    - **Property 10: Community search filters by name**
    - **Validates: Requirements 8.2**
  - [ ]* 10.6 Write property test for discovery exclusions (Property 11)
    - **Property 11: Discovery excludes already-followed and self**
    - **Validates: Requirements 9.1**

- [x] 11. Implement `EnhancedSocialFeed` UI component
  - [x] 11.1 Wire `useSWRInfinite` to the Feed_API GET endpoint with cursor-based pagination; implement infinite scroll trigger on the bottom sentinel element
    - _Requirements: 2.1, 2.4_
  - [x] 11.2 Implement optimistic updates for like, unlike, and post creation: update the SWR cache immediately, roll back via `mutateFeed()` and show `toast.error` on API failure
    - _Requirements: 3.1, 3.3_
  - [x] 11.3 Subscribe to the Realtime SSE gateway (`/api/realtime/events`) and handle `post.created`, `post.liked`, `post.unliked`, and `comment.created` events to update the feed without a full refetch
    - _Requirements: 1.3, 3.4, 4.3_
  - [x] 11.4 Implement the post compose form: text area + optional image URL input, submit calls Feed_API POST, clears form on success
    - _Requirements: 1.1, 1.7_
  - [x] 11.5 Wrap the feed in a `FeedErrorBoundary` component that renders a fallback UI on unhandled React errors
    - _Requirements: 2.1_

- [x] 12. Implement `PostCard`, `CommentItem`, and `MembersSidebar` UI components
  - [x] 12.1 Implement `PostCard` with like toggle, comment count, bookmark toggle, share button (copy-link + share-as-post), and delete button (owner only); reflect `userLikes` and `userBookmarks` from feed response for initial state
    - _Requirements: 3.1, 3.3, 5.4_
  - [x] 12.2 Implement `CommentItem` with threaded reply support (render children indented, reply button sets `parent_comment_id`)
    - _Requirements: 4.2_
  - [x] 12.3 Implement `MembersSidebar` with Online and Members tabs; Members tab includes a search input that calls Community_API with `search` param; both tabs show follow/unfollow toggle per member
    - _Requirements: 7.3, 8.3, 8.4, 9.5_
  - [x] 12.4 Add a Discovery section inside `MembersSidebar` that calls `Community_API?mode=discovery` and renders suggestions separately from the full members list
    - _Requirements: 9.5_
  - [ ]* 12.5 Write snapshot tests for `PostCard` (text, image, and share variants), `UserCard` (online indicator), and `MembersSidebar` (Online and Members tab content)
    - _Requirements: 2.1, 7.3, 8.3_

- [x] 13. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use `fast-check` with a minimum of 100 iterations, tagged `Feature: social-feed, Property {N}: {title}`
- Checkpoints ensure incremental validation before moving to the next layer
