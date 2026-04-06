# Requirements Document

## Introduction

The Social Feed feature enables members of the Muslim community platform (MosqueConnect / Haya Al Falah) to share posts with images, interact through likes and comments, follow other members, and discover nearby or connected users. The feature builds on existing API infrastructure (`/api/feed/posts`, `/api/posts`, `/api/users`, `/api/users/[userId]/follow`) and the scaffolded `app/feed/page.tsx` and `app/community/page.tsx` pages.

## Glossary

- **Feed**: The personalized, chronologically ordered stream of posts shown to an authenticated user, composed of posts from users they follow plus their own posts.
- **Post**: A piece of user-generated content consisting of text and an optional image, stored in the `posts` table with a `body` field and optional `image_url`.
- **Author**: The authenticated user who created a Post.
- **Reaction**: A "like" interaction recorded in the `reactions` table linking a user to a post.
- **Comment**: A text reply to a Post, stored in the `comments` table, optionally nested under a parent comment.
- **Follow**: A directional relationship stored in `user_follows` where a Follower subscribes to a Following user's posts.
- **Follower**: A user who follows another user.
- **Following**: A user who is being followed by another user.
- **Members_Window**: The UI panel that lists all community members and supports search and discovery.
- **Online_Users_Panel**: The UI panel that shows members currently active within the last 5 minutes.
- **Discovery**: The mechanism for surfacing nearby users or friends-of-friends to the current user.
- **Share**: The action of re-distributing a post to the current user's followers or copying a shareable link.
- **Visibility**: The access scope of a Post — one of `public`, `followers`, or `private`.
- **Feed_API**: The Next.js route handler at `/api/feed/posts` responsible for reading and writing feed posts.
- **Posts_API**: The Next.js route handler at `/api/posts` and `/api/posts/[id]` for post CRUD operations.
- **Follows_API**: The Next.js route handler at `/api/users/[userId]/follow` for follow/unfollow operations.
- **Community_API**: The Next.js route handler at `/api/users/community` for listing all members.
- **Online_API**: The Next.js route handler at `/api/users/online` for listing currently online members.
- **Safety_Service**: The backend module that enforces mute/block rules and rate limits.
- **Realtime_Service**: The backend module that publishes events to connected clients via SSE/WebSocket.
- **Profile**: A user's public identity record in the `profiles` table, containing `id`, `full_name`, `avatar_url`, `bio`, `profession`, and `role`.

---

## Requirements

### Requirement 1: Create a Post

**User Story:** As a community member, I want to create a post with optional image, so that I can share thoughts and updates with the community.

#### Acceptance Criteria

1. THE Feed_API SHALL accept a POST request containing a non-empty `content` field and an optional `image_url` field.
2. WHEN a post creation request is received, THE Feed_API SHALL persist the post to the `posts` table with `author_id` set to the authenticated user's ID, `body` set to the trimmed content, and `is_published` set to `true`.
3. WHEN a post is created with `visibility` set to `public` or `followers`, THE Feed_API SHALL publish a `post.created` realtime event to the `home` feed stream.
4. WHEN a post is created, THE Feed_API SHALL enqueue a `feed.post.created` fanout task so the post appears in followers' feeds.
5. IF the `content` field is absent or empty, THEN THE Feed_API SHALL return HTTP 400 with a descriptive error message.
6. IF the authenticated user exceeds 15 post-create requests within 60 seconds, THEN THE Feed_API SHALL return HTTP 429 with a `retryAfterSeconds` value.
7. WHEN a post is created with an `image_url`, THE Feed_API SHALL store the provided URL in the `image_url` column without modification.
8. THE Feed_API SHALL default `visibility` to `public` when the submitted value is not `followers` or `private`.

---

### Requirement 2: View the Personalized Feed

**User Story:** As a community member, I want to see posts from people I follow, so that I can stay up to date with content relevant to me.

#### Acceptance Criteria

1. WHEN an authenticated user requests the feed, THE Feed_API SHALL return posts ordered by `created_at` descending, limited to a configurable page size not exceeding 50.
2. THE Feed_API SHALL include only posts where `is_published` is `true` and `visibility` is `public` or `followers`.
3. THE Feed_API SHALL exclude posts authored by users the requesting user has muted or blocked, as determined by the Safety_Service.
4. WHEN a cursor is provided in the request, THE Feed_API SHALL return posts with `created_at` earlier than the cursor value to support infinite scroll pagination.
5. THE Feed_API SHALL return `userLikes` and `userBookmarks` arrays indicating which returned post IDs the requesting user has already liked or bookmarked.
6. WHEN the feed response is cached, THE Feed_API SHALL serve the cached response within 20 seconds of the original write and include an `X-Cache: HIT` header.
7. WHEN a new post is created by the authenticated user, THE Feed_API SHALL invalidate the cached feed for that user.

---

### Requirement 3: Like and Unlike a Post

**User Story:** As a community member, I want to like or unlike posts, so that I can express appreciation for content.

#### Acceptance Criteria

1. WHEN an authenticated user sends a POST to `/api/posts/[id]/like`, THE Posts_API SHALL insert a `like` reaction into the `reactions` table for that user and post.
2. IF the user has already liked the post, THEN THE Posts_API SHALL return HTTP 400 with an "Already liked" error.
3. WHEN an authenticated user sends a DELETE to `/api/posts/[id]/like`, THE Posts_API SHALL remove the matching `like` reaction from the `reactions` table.
4. WHEN a like or unlike action is performed, THE Posts_API SHALL publish a `post.liked` or `post.unliked` realtime event to the `home` feed stream.
5. IF the post author has blocked the requesting user, THEN THE Posts_API SHALL return HTTP 403 and not record the reaction.
6. IF the authenticated user exceeds 40 like requests within 60 seconds, THEN THE Posts_API SHALL return HTTP 429 with a `retryAfterSeconds` value.

---

### Requirement 4: Comment on a Post

**User Story:** As a community member, I want to comment on posts, so that I can engage in discussion with other members.

#### Acceptance Criteria

1. WHEN an authenticated user submits a comment with non-empty `content`, THE Posts_API SHALL insert a record into the `comments` table with `post_id`, `author_id`, and `body` set accordingly.
2. WHERE a `parent_comment_id` is provided, THE Posts_API SHALL store it on the comment record to support threaded replies.
3. WHEN a comment is created, THE Posts_API SHALL publish a `comment.created` realtime event and enqueue a `notifications.comment.created` task.
4. WHEN a comment is created, THE Posts_API SHALL enqueue a `counters.comment.created` task to update the post's `comment_count`.
5. IF the `content` field is absent or empty, THEN THE Posts_API SHALL return HTTP 400.
6. IF the post author has blocked the requesting user, THEN THE Posts_API SHALL return HTTP 403 and not record the comment.
7. WHEN comments are fetched for a post, THE Posts_API SHALL exclude comments authored by users the requesting user has muted or blocked.
8. IF the authenticated user exceeds 20 comment-create requests within 60 seconds, THEN THE Posts_API SHALL return HTTP 429 with a `retryAfterSeconds` value.

---

### Requirement 5: Share a Post

**User Story:** As a community member, I want to share a post, so that I can distribute interesting content to my followers or copy a link.

#### Acceptance Criteria

1. WHEN an authenticated user shares a post, THE Feed_API SHALL create a new post record with `post_type` set to `share`, referencing the original post's ID in the `metadata` field.
2. THE Feed_API SHALL apply the same visibility, rate-limiting, and fanout rules to shared posts as to original posts.
3. WHEN a share is created, THE Feed_API SHALL publish a `post.created` realtime event with the share's post ID.
4. THE Social_Feed_UI SHALL provide a copy-link action that writes the post's canonical URL to the user's clipboard without requiring a server round-trip.

---

### Requirement 6: Follow and Unfollow a User

**User Story:** As a community member, I want to follow or unfollow other members, so that I can curate my personalized feed.

#### Acceptance Criteria

1. WHEN an authenticated user sends a POST to `/api/users/[userId]/follow`, THE Follows_API SHALL insert a record into `user_follows` with `follower_id` and `following_id` set.
2. IF the user attempts to follow themselves, THEN THE Follows_API SHALL return HTTP 400 with a "Cannot follow yourself" error.
3. IF the follow relationship already exists, THE Follows_API SHALL treat the request as a no-op and return HTTP 200.
4. WHEN a follow is created, THE Follows_API SHALL publish a `follow.created` realtime event and enqueue `feed.follow.created` and `notifications.follow.created` tasks.
5. WHEN an authenticated user sends a DELETE to `/api/users/[userId]/follow`, THE Follows_API SHALL remove the matching record from `user_follows` and publish a `follow.deleted` realtime event.
6. WHEN a user requests follow stats for a profile, THE Follows_API SHALL return `followersCount`, `followingCount`, and `isFollowing` for the requesting user.
7. IF the authenticated user exceeds 20 follow/unfollow requests within 60 seconds, THEN THE Follows_API SHALL return HTTP 429 with a `retryAfterSeconds` value.

---

### Requirement 7: View Online Members

**User Story:** As a community member, I want to see which members are currently online, so that I can know who is active in the community right now.

#### Acceptance Criteria

1. WHEN an authenticated user requests the online members list, THE Online_API SHALL return profiles where `last_seen_at` is within the last 5 minutes, ordered by `last_seen_at` descending, limited to 50 results.
2. THE Online_API SHALL include the requesting user in the results if their `last_seen_at` qualifies.
3. THE Online_Users_Panel SHALL display each online member's `full_name` and `avatar_url`.
4. WHEN a member's session becomes active, THE Realtime_Service SHALL update the member's `last_seen_at` timestamp so the Online_API reflects their status within 60 seconds.

---

### Requirement 8: Discover and Search Community Members

**User Story:** As a community member, I want to search for and discover other members, so that I can find people to follow and connect with.

#### Acceptance Criteria

1. WHEN an authenticated user requests the community members list, THE Community_API SHALL return up to 100 profiles ordered by `created_at` descending, including `id`, `full_name`, `avatar_url`, `bio`, `profession`, and `role`.
2. WHEN a search query is provided, THE Community_API SHALL filter results to profiles where `full_name` contains the query string (case-insensitive).
3. THE Members_Window SHALL display each member's `full_name`, `avatar_url`, and a follow/unfollow toggle reflecting the current user's follow status.
4. WHEN the Members_Window is open, THE Social_Feed_UI SHALL show the follow status for each listed member without requiring a separate user action.

---

### Requirement 9: Discover Nearby or Connected Users

**User Story:** As a community member, I want to discover users near me or friends-of-friends, so that I can expand my network within the community.

#### Acceptance Criteria

1. WHEN an authenticated user requests discovery suggestions, THE Community_API SHALL return members who are followed by at least one user the requesting user already follows (friends-of-friends), excluding users the requesting user already follows and the requesting user themselves.
2. THE Community_API SHALL limit discovery suggestions to 20 results per request.
3. WHERE location data is available in the user's Profile, THE Community_API SHALL include members within a configurable radius (default 50 km) in the discovery results.
4. IF no friends-of-friends or nearby users are found, THEN THE Community_API SHALL return a fallback list of recently joined members ordered by `created_at` descending.
5. THE Members_Window SHALL display discovery suggestions in a dedicated section separate from the full members list.

---

### Requirement 10: Content Moderation and Safety

**User Story:** As a community member, I want posts and comments from blocked or muted users to be hidden, so that I have a safe and respectful experience.

#### Acceptance Criteria

1. WHEN the Feed_API returns posts, THE Safety_Service SHALL provide the set of muted and blocked user IDs for the requesting user, and THE Feed_API SHALL exclude all posts authored by those users.
2. WHEN the Posts_API returns comments, THE Safety_Service SHALL provide the set of muted and blocked user IDs, and THE Posts_API SHALL exclude all comments authored by those users.
3. WHEN a user attempts to like or comment on a post authored by a user who has blocked them, THE Posts_API SHALL return HTTP 403.
4. THE Feed_API SHALL apply rate limits across account, IP, and device scopes for all write operations as enforced by the Safety_Service.
