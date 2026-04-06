# MosqueConnect

This is a Connect Mosque Project of our Community.

## Clerk Authentication Setup (Sign up + Sign in)

1. **Install dependencies**
   ```bash
   pnpm install
   ```

2. **Configure environment variables**
   - Copy `.env.example` to `.env.local`
   - Add your Clerk keys from the Clerk dashboard:
     - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
     - `CLERK_SECRET_KEY`
   - Optional but recommended for webhook sync + profile data:
     - `CLERK_WEBHOOK_SECRET`
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY`
   - Optional Stream-powered message feed:
     - `NEXT_PUBLIC_STREAM_API_KEY`
     - `STREAM_API_SECRET`
     - `STREAM_FEED_GROUP` (default: `timeline`)
     - `STREAM_FEED_ID` (default: `global`)

3. **Set Clerk URLs in Dashboard**
   - Sign-in URL: `/sign-in`
   - Sign-up URL: `/sign-up`
   - Allowed origins / redirect URLs: add your deployed domain (for example `https://your-app.vercel.app`)
   - Use production Clerk keys for production deployments (avoid `pk_test_*` on live domains)

4. **Configure sign-in / sign-up methods in Clerk**
   - Go to **Clerk Dashboard → User & Authentication → Email, Phone, Username**:
     - Enable **Email address**
     - Enable **Email verification code** for sign-up and sign-in
     - (Optional) Keep password enabled if you want email+password login too
   - Go to **Clerk Dashboard → SSO Connections / Social Connections**:
     - Enable **Google**
     - Add your Google OAuth Client ID/Secret in Clerk
   - Go to **Clerk Dashboard → Emails**:
     - Configure your sender/domain so verification codes are delivered reliably.
     - Verify DNS records for your sending domain if you use a custom domain.

5. **Run the app**
   ```bash
   pnpm dev
   ```

## Routes already wired

- `app/sign-in/[[...sign-in]]/page.tsx`
- `app/sign-up/[[...sign-up]]/page.tsx`
- `middleware.ts` protects private routes with Clerk
- `components/providers/app-providers.tsx` wraps app in `ClerkProvider`

## Webhook (optional but recommended)

Use Clerk webhooks to sync new users into your `profiles` table:

- Endpoint: `/api/webhooks/clerk`
- Events: `user.created`, `user.updated`, `user.deleted`

The webhook handler is implemented in `app/api/webhooks/clerk/route.ts`.

Additionally, the app now performs a signed-in profile sync on demand through:
- `POST /api/auth/sync-profile`

This ensures Clerk users are upserted into Supabase `profiles` even if webhook delivery is delayed.

## Troubleshooting

- If you see browser CORS errors redirecting to `*.accounts.dev`, verify:
  - Your app is using the correct Clerk environment keys for that deployment.
  - Your deployment URL is added in Clerk allowed origins/redirects.
- If Google sign-in button is not shown, confirm Google is enabled in Clerk for the same instance (development vs production).
- If sign-up says your password was found in a data breach, either use a new unique password or leave password empty to continue with email-code verification.

## Release scope for merge to `main`

This branch is ready to merge to `main` with the currently implemented features, including:

- Clerk sign-up/sign-in flow (email/password and email-code flow)
- Clerk webhook + on-demand profile sync to Supabase
- Imam role and permission updates
- Middleware and route fixes needed for Vercel production builds

Note: Google social sign-in UI is not included yet in this scope. To add Google auth, enable Google in the Clerk Dashboard and then wire the social button flow in the sign-in/sign-up pages.


## Database setup for real mosque + feed data

Run the SQL scripts in Supabase SQL Editor (or via psql) in this order:

```sql
-- 1) Create/update all core tables
\i scripts/production_schema.sql

-- 2) Seed real data (4 mosques + profiles + posts)
\i scripts/seed_real_data.sql
```

After seeding, the following are available and fully CRUD-enabled through API routes:

- Mosque registration + listing
  - `GET /api/mosques`
  - `POST /api/mosques` (authenticated users can submit; admin/shura can auto-verify)
  - `PATCH /api/mosques/:id`
  - `DELETE /api/mosques/:id`
- Feed posts
  - `GET /api/feed/posts`
  - `POST /api/feed/posts`
  - `PATCH /api/feed/posts/:id`
  - `DELETE /api/feed/posts/:id`

## Real-time social sync (feed, members, role consistency)

This project now includes real-time subscriptions/presence so feed and profile data stay in sync across screens:

- Feed updates live for:
  - new/edited/deleted posts (`posts`)
  - likes (`post_likes`)
  - comments count changes (`post_comments`)
- Members and online list update live from:
  - profile changes (`profiles`)
  - Supabase presence (`community-presence`)
- Role/profile consistency:
  - signed-in user profile updates are subscribed in auth context, so role changes (for example `shura`) propagate quickly across feed/profile/settings UI.
- Follow system:
  - API: `GET|POST|DELETE /api/users/:userId/follow`
  - DB table: `user_follows`
- WebRTC signaling helper:
  - `lib/hooks/use-webrtc-signaling.ts` uses Supabase broadcast channels for offer/answer/ICE signaling transport.

> Note: for Realtime to work, make sure these tables are in your `supabase_realtime` publication.

## Infrastructure scaling defaults

This project includes first-pass infrastructure hardening for growth:

- CDN-aware static/media delivery (`NEXT_PUBLIC_CDN_URL`, `NEXT_PUBLIC_CDN_HOST`, `NEXT_PUBLIC_MEDIA_CDN_HOST`)
- Edge-cached public profile cards
- Redis+memory hot caching for timelines and profile snippets
- Worker queue hooks for fan-out, notifications, and counter aggregation
- Write-endpoint backpressure via rate limits
- Service SLO and autoscaling trigger definitions for API/realtime/workers

See `docs/infrastructure-scaling.md` for details.
