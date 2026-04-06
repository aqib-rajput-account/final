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
