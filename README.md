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

4. **Run the app**
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

## Troubleshooting

- If you see browser CORS errors redirecting to `*.accounts.dev`, verify:
  - Your app is using the correct Clerk environment keys for that deployment.
  - Your deployment URL is added in Clerk allowed origins/redirects.
- If social sign-in is needed, enable that provider in Clerk Dashboard before adding social buttons in UI.
- If sign-up says your password was found in a data breach, either use a new unique password or leave password empty to continue with email-code verification.
