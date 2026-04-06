import { auth } from '@clerk/nextjs/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateAuthBearer } from './service'

export async function resolveAuthenticatedUserId(request: Request | NextRequest): Promise<string | null> {
  try {
    const clerkSession = await auth()
    if (clerkSession.userId) {
      return clerkSession.userId
    }
  } catch {
    // fallthrough
  }

  const bearer = request.headers.get('authorization')
  if (bearer?.startsWith('Bearer ')) {
    const token = bearer.slice('Bearer '.length)
    const parsed = validateAuthBearer(token)
    if (parsed) {
      return parsed.userId
    }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return user?.id ?? null
}
