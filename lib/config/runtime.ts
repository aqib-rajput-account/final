export const hasClerkPublishableKey = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
)

export const hasSupabaseBrowserEnv = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export const hasFullAuthConfig = hasClerkPublishableKey && hasSupabaseBrowserEnv

export const hasStreamFeedConfig = Boolean(
  process.env.NEXT_PUBLIC_STREAM_API_KEY && process.env.STREAM_API_SECRET
)
