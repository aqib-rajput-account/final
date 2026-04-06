import { createClient } from '@/lib/supabase/server'
import { enforceRateLimit } from '@/lib/infrastructure/rate-limit'

type SupabaseLike = Awaited<ReturnType<typeof createClient>>

type PrivacyLevel = 'public' | 'followers' | 'private'

export type ProfilePrivacySettings = {
  phone?: PrivacyLevel
  email?: PrivacyLevel
  bio?: PrivacyLevel
  avatar_url?: PrivacyLevel
  full_name?: PrivacyLevel
}

const DEFAULT_PRIVACY: Required<ProfilePrivacySettings> = {
  phone: 'private',
  email: 'private',
  bio: 'public',
  avatar_url: 'public',
  full_name: 'public',
}

export async function getMutedAndBlockedUserIds(supabase: SupabaseLike, userId: string): Promise<Set<string>> {
  const result = new Set<string>()

  const [blocksA, blocksB, mutes] = await Promise.all([
    supabase.from('user_blocks').select('blocked_id').eq('blocker_id', userId),
    supabase.from('user_blocks').select('blocker_id').eq('blocked_id', userId),
    supabase.from('user_mutes').select('muted_id').eq('muter_id', userId),
  ])

  if (!blocksA.error) {
    for (const row of blocksA.data ?? []) {
      if (row.blocked_id) result.add(row.blocked_id)
    }
  }

  if (!blocksB.error) {
    for (const row of blocksB.data ?? []) {
      if (row.blocker_id) result.add(row.blocker_id)
    }
  }

  if (!mutes.error) {
    for (const row of mutes.data ?? []) {
      if (row.muted_id) result.add(row.muted_id)
    }
  }

  return result
}

export async function canUsersInteract(supabase: SupabaseLike, actorUserId: string, targetUserId: string): Promise<boolean> {
  if (actorUserId === targetUserId) return true

  const { data, error } = await supabase
    .from('user_blocks')
    .select('id')
    .or(`and(blocker_id.eq.${actorUserId},blocked_id.eq.${targetUserId}),and(blocker_id.eq.${targetUserId},blocked_id.eq.${actorUserId})`)
    .limit(1)

  if (error) {
    return true
  }

  return (data?.length ?? 0) === 0
}

export function parseClientContext(request: Request) {
  const forwardedFor = request.headers.get('x-forwarded-for') ?? ''
  const ip = forwardedFor.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown-ip'
  const deviceId = request.headers.get('x-device-id') || request.headers.get('x-client-device-id') || 'unknown-device'

  return {
    ip,
    deviceId,
  }
}

export async function enforceMultiScopeThrottle(input: {
  request: Request
  userId: string
  action: string
  windowSeconds: number
  accountLimit: number
  ipLimit: number
  deviceLimit: number
}) {
  const context = parseClientContext(input.request)

  const [byUser, byIp, byDevice] = await Promise.all([
    enforceRateLimit({
      namespace: `${input.action}:account`,
      identifier: input.userId,
      windowSeconds: input.windowSeconds,
      maxRequests: input.accountLimit,
    }),
    enforceRateLimit({
      namespace: `${input.action}:ip`,
      identifier: context.ip,
      windowSeconds: input.windowSeconds,
      maxRequests: input.ipLimit,
    }),
    enforceRateLimit({
      namespace: `${input.action}:device`,
      identifier: context.deviceId,
      windowSeconds: input.windowSeconds,
      maxRequests: input.deviceLimit,
    }),
  ])

  const allowed = byUser.allowed && byIp.allowed && byDevice.allowed
  const retryAfterSeconds = Math.max(byUser.retryAfterSeconds, byIp.retryAfterSeconds, byDevice.retryAfterSeconds)

  return {
    allowed,
    retryAfterSeconds,
    scopes: {
      account: byUser,
      ip: byIp,
      device: byDevice,
    },
  }
}

export async function writeAuditLog(input: {
  supabase: SupabaseLike
  actorUserId: string
  action: string
  targetType: string
  targetId: string
  metadata?: Record<string, unknown>
}) {
  await input.supabase.from('audit_logs').insert({
    actor_user_id: input.actorUserId,
    action: input.action,
    target_type: input.targetType,
    target_id: input.targetId,
    metadata: input.metadata ?? {},
  })
}

function visibilityAllows(setting: PrivacyLevel, isSelf: boolean, isFollower: boolean) {
  if (setting === 'public') return true
  if (setting === 'followers') return isSelf || isFollower
  return isSelf
}

export async function applyProfilePrivacy(input: {
  supabase: SupabaseLike
  viewerUserId: string | null
  profile: Record<string, unknown>
}) {
  const profileUserId = String(input.profile.id ?? '')
  const viewerUserId = input.viewerUserId
  const isSelf = Boolean(viewerUserId && viewerUserId === profileUserId)

  let isFollower = false
  if (viewerUserId && !isSelf) {
    const { data } = await input.supabase
      .from('user_follows')
      .select('id')
      .eq('follower_id', viewerUserId)
      .eq('following_id', profileUserId)
      .maybeSingle()

    isFollower = Boolean(data)
  }

  const settings = {
    ...DEFAULT_PRIVACY,
    ...((input.profile.privacy_settings as Record<string, PrivacyLevel> | null) ?? {}),
  }

  const sanitized = { ...input.profile }

  if (!visibilityAllows(settings.phone, isSelf, isFollower)) sanitized.phone = null
  if (!visibilityAllows(settings.email, isSelf, isFollower)) sanitized.email = null
  if (!visibilityAllows(settings.bio, isSelf, isFollower)) sanitized.bio = null
  if (!visibilityAllows(settings.avatar_url, isSelf, isFollower)) sanitized.avatar_url = null
  if (!visibilityAllows(settings.full_name, isSelf, isFollower)) sanitized.full_name = null

  return sanitized
}
