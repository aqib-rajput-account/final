import { z } from 'zod'

/**
 * Feed entities persist event times as UTC ISO timestamps.
 * Locale/time zone conversion belongs in presentation APIs/UI only.
 */
export const utcTimestampSchema = z.string().datetime({ offset: true })

export const feedPostSchema = z.object({
  id: z.string().min(1),
  authorId: z.string().min(1),
  body: z.string().min(1),
  createdAt: utcTimestampSchema,
  updatedAt: utcTimestampSchema,
  likeCount: z.number().int().nonnegative(),
  commentCount: z.number().int().nonnegative(),
})

export const postMediaSchema = z.object({
  id: z.string().min(1),
  postId: z.string().min(1),
  mediaType: z.enum(['image', 'video', 'audio', 'file']),
  mediaUrl: z.string().url(),
  sortOrder: z.number().int().nonnegative(),
  createdAt: utcTimestampSchema,
})

export const commentSchema = z.object({
  id: z.string().min(1),
  postId: z.string().min(1),
  authorId: z.string().min(1),
  body: z.string().min(1),
  parentCommentId: z.string().min(1).nullable(),
  createdAt: utcTimestampSchema,
  updatedAt: utcTimestampSchema,
})

export const reactionSchema = z.object({
  id: z.string().min(1),
  postId: z.string().min(1),
  userId: z.string().min(1),
  reactionType: z.enum(['like', 'love', 'celebrate', 'support']),
  createdAt: utcTimestampSchema,
})

export const followSchema = z.object({
  id: z.string().min(1),
  followerId: z.string().min(1),
  followeeId: z.string().min(1),
  createdAt: utcTimestampSchema,
})

export const blockSchema = z.object({
  id: z.string().min(1),
  blockerId: z.string().min(1),
  blockedId: z.string().min(1),
  createdAt: utcTimestampSchema,
})

export const reportSchema = z.object({
  id: z.string().min(1),
  reporterId: z.string().min(1),
  postId: z.string().min(1).nullable(),
  commentId: z.string().min(1).nullable(),
  reason: z.string().min(1),
  createdAt: utcTimestampSchema,
})

export type FeedPost = z.infer<typeof feedPostSchema>
export type PostMedia = z.infer<typeof postMediaSchema>
export type Comment = z.infer<typeof commentSchema>
export type Reaction = z.infer<typeof reactionSchema>
export type Follow = z.infer<typeof followSchema>
export type Block = z.infer<typeof blockSchema>
export type Report = z.infer<typeof reportSchema>
