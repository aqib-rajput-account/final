import { z } from 'zod'

export const visibilitySettingsSchema = z.object({
  showAvatar: z.boolean().default(true),
  showBio: z.boolean().default(true),
  showLocale: z.boolean().default(true),
  discoverableInSearch: z.boolean().default(true),
  showOnlineStatus: z.boolean().default(true),
})

export const profileSchema = z.object({
  id: z.string().min(1),
  username: z.string().min(1).max(64),
  avatarUrl: z.string().url().nullable(),
  bio: z.string().max(280).nullable(),
  locale: z.string().min(2).max(16).default('en-US'),
  visibility: visibilitySettingsSchema,
})

export const userSchema = z.object({
  id: z.string().min(1),
  username: z.string().min(1).max(64),
  profile: profileSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const publicProfileCardSchema = z.object({
  id: z.string().min(1),
  username: z.string().min(1).max(64),
  avatarUrl: z.string().url().nullable(),
  bio: z.string().max(280).nullable(),
  locale: z.string().min(2).max(16),
  visibility: visibilitySettingsSchema,
})

export type VisibilitySettings = z.infer<typeof visibilitySettingsSchema>
export type Profile = z.infer<typeof profileSchema>
export type User = z.infer<typeof userSchema>
export type PublicProfileCard = z.infer<typeof publicProfileCardSchema>

export function buildVisibilitySettings(row: Record<string, unknown>): VisibilitySettings {
  const defaults: VisibilitySettings = {
    showAvatar: true,
    showBio: true,
    showLocale: true,
    discoverableInSearch: true,
    showOnlineStatus: true,
  }

  const metadata = (row.metadata ?? row.profile_metadata) as Record<string, unknown> | null
  const settings = (metadata?.visibility ?? row.visibility) as Record<string, unknown> | null

  return visibilitySettingsSchema.parse({
    showAvatar: settings?.showAvatar ?? defaults.showAvatar,
    showBio: settings?.showBio ?? defaults.showBio,
    showLocale: settings?.showLocale ?? defaults.showLocale,
    discoverableInSearch: settings?.discoverableInSearch ?? defaults.discoverableInSearch,
    showOnlineStatus: settings?.showOnlineStatus ?? defaults.showOnlineStatus,
  })
}

export function buildPublicProfileCard(row: Record<string, unknown>): PublicProfileCard {
  const visibility = buildVisibilitySettings(row)

  const card = {
    id: String(row.id ?? ''),
    username: String(row.username ?? row.id ?? ''),
    avatarUrl: typeof row.avatar_url === 'string' ? row.avatar_url : null,
    bio: typeof row.bio === 'string' ? row.bio : null,
    locale: typeof row.locale === 'string' ? row.locale : 'en-US',
    visibility,
  }

  const parsed = publicProfileCardSchema.parse(card)

  return {
    ...parsed,
    avatarUrl: parsed.visibility.showAvatar ? parsed.avatarUrl : null,
    bio: parsed.visibility.showBio ? parsed.bio : null,
    locale: parsed.visibility.showLocale ? parsed.locale : 'und',
  }
}
