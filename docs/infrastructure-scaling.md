# Infrastructure, Caching, and Worker Scaling Plan

## 1) CDN and edge caching

- Static assets are served via configurable CDN origin using `NEXT_PUBLIC_CDN_URL` / `NEXT_PUBLIC_CDN_HOST`.
- Media delivery can be routed through a dedicated media host via `NEXT_PUBLIC_MEDIA_CDN_HOST`.
- Public profile cards (`GET /api/users/:userId/profile-card`) are configured with edge-friendly headers:
  - `Cache-Control: public, s-maxage=300, stale-while-revalidate=3600`
  - `CDN-Cache-Control: public, s-maxage=300, stale-while-revalidate=3600`

## 2) Redis + memory hot cache

- Timeline reads (`GET /api/feed/posts`) are cached with a short TTL for hot requests.
- Profile snippets (`GET /api/users/:userId/profile-card`) are cached with a longer TTL.
- Cache layer strategy:
  - L1: process-local in-memory map
  - L2: Redis REST (when `REDIS_REST_URL` and `REDIS_REST_TOKEN` are configured)

## 3) Worker queue for heavy tasks

- High-volume post-write side effects are enqueued rather than synchronously computed in request path:
  - `fanout` queue: feed distribution and timeline refreshes
  - `notifications` queue: notification fan-out
  - `counter-aggregation` queue: denormalized counter updates
- Current queue adapter supports in-memory mode and Redis list-backed enqueue.

## 4) Backpressure and write-rate limiting

Write-heavy endpoints now enforce per-user fixed-window limits:

- `POST /api/feed/posts` (feed post writes)
- `POST|DELETE /api/posts/:id/like`
- `POST /api/posts/:id/comments`
- `POST|DELETE /api/users/:userId/follow`

When limits are exceeded, APIs return HTTP `429` and `Retry-After`.

## 5) SLOs and autoscaling triggers

Service objectives and autoscaling thresholds are defined in `lib/infrastructure/slo.ts`:

- **API**: 99.95% availability, p95 <= 250ms
- **Realtime gateway**: 99.9% availability, p95 <= 120ms
- **Workers**: 99.9% availability, p95 <= 2000ms

Each service includes scale-out and scale-in trigger guidance for CPU, queue depth, event lag, and connection cardinality.
