# Feed MVP Product Spec

## Scope
Define the minimum viable social feed experience for authenticated users, with optional read-only guest access.

## 1) Feed Types
- **Global feed:** Chronological/relevance-ordered posts from all visible users/communities.
- **Following feed:** Posts only from accounts the current user follows.
- **Profile feed:** Posts created/reposted by a specific profile.

## 2) Core Interactions
- **Create post:** Authenticated users can publish text/media posts.
- **Like:** Authenticated users can like/unlike posts and comments.
- **Comment:** Authenticated users can add comments to posts.
- **Reply:** Authenticated users can reply to comments in threaded form.
- **Follow / unfollow:** Authenticated users can follow or unfollow other profiles.
- **Share / repost:** Authenticated users can reshare existing posts to their followers/global feed context.

## 3) Real-time Expectations
- New posts, comments, and likes should appear to connected clients in **under 1–2 seconds** under normal operating conditions.
- Real-time updates should apply across all relevant views (global, following, profile, and open post threads).

## 4) Login / Account Constraints
- Only **authenticated users** may create posts or interact (like, comment, reply, follow, repost, report).
- **Guests** may read public feed content if guest-read mode is enabled by product configuration.

## 5) Data Truth Rules
- Every rendered feed item (post, like count, comments, author info, repost) must be sourced from **primary database records**.
- No mock, static, hardcoded placeholder, or client-only synthetic feed records are allowed in production feed responses.

## 6) Performance Goals
- **API latency target:** Feed read/write endpoints must achieve **p95 <= 300 ms** server latency (excluding client network).
- **Real-time delivery target:** Pub/sub (or equivalent) events for post/comment/like updates must achieve **p95 <= 1.5 s** end-to-end delivery to subscribed clients.

## 7) Moderation Baseline
- **Report:** Users can report posts/comments/profiles for abuse.
- **Block:** Users can block/unblock other users; blocked users' content should be hidden from blocker's feeds/interactions.
- **Basic abuse filtering:** Minimum automated checks for spam/profanity/rate abuse at post/comment creation time, with configurable thresholds and moderation logs.
