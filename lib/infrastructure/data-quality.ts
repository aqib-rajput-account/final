import { logWithTrace, observeCounter } from './observability'

interface TimelineLikeItem {
  id?: string
  created_at?: string
  likes_count?: number
  comments_count?: number
}

export function validateTimelineConsistency(input: {
  traceId: string
  items: TimelineLikeItem[]
}) {
  const issues: string[] = []

  for (let i = 0; i < input.items.length; i += 1) {
    const current = input.items[i]
    if ((current.likes_count ?? 0) < 0) {
      issues.push(`negative likes_count at index ${i}`)
    }

    if ((current.comments_count ?? 0) < 0) {
      issues.push(`negative comments_count at index ${i}`)
    }

    if (i > 0) {
      const prevCreatedAt = input.items[i - 1]?.created_at
      const currentCreatedAt = current.created_at
      if (prevCreatedAt && currentCreatedAt && Date.parse(currentCreatedAt) > Date.parse(prevCreatedAt)) {
        issues.push(`timeline out of order at index ${i}`)
      }
    }
  }

  if (issues.length === 0) {
    observeCounter('data_quality.timeline_checks.pass')
    return
  }

  observeCounter('data_quality.timeline_checks.fail', issues.length)

  logWithTrace({
    level: 'warn',
    message: 'Timeline consistency check failed',
    traceId: input.traceId,
    tags: {
      issues: issues.join('; '),
      issueCount: issues.length,
    },
  })
}

export function validateCounterParity(input: {
  traceId: string
  likesCount: number
  commentCount: number
  likesEntries: number
}) {
  const issueCount = Number(input.likesEntries < 0) + Number(input.likesCount < 0) + Number(input.commentCount < 0)

  if (issueCount === 0) {
    observeCounter('data_quality.counter_parity.pass')
    return
  }

  observeCounter('data_quality.counter_parity.fail', issueCount)
  logWithTrace({
    level: 'warn',
    message: 'Counter parity check failed',
    traceId: input.traceId,
    tags: {
      likesCount: input.likesCount,
      commentCount: input.commentCount,
      likesEntries: input.likesEntries,
    },
  })
}
