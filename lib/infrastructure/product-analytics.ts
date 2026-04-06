'use client'

import { observeClientMetric, logClientTrace } from './web-observability'

export type FunnelEvent = 'view' | 'interact' | 'return'

interface ProductEvent {
  funnel: 'feed_engagement'
  step: FunnelEvent
  traceId: string
  metadata?: Record<string, unknown>
}

const STORAGE_KEY = 'product_analytics.last_feed_view_at'

export function trackFeedFunnelEvent(event: ProductEvent) {
  logClientTrace({
    level: 'info',
    message: 'Product analytics funnel event',
    traceId: event.traceId,
    tags: {
      funnel: event.funnel,
      step: event.step,
      ...event.metadata,
    },
  })

  observeClientMetric('product.funnel.feed_engagement', 1, {
    step: event.step,
  })

  if (event.step === 'view') {
    window.localStorage.setItem(STORAGE_KEY, new Date().toISOString())
  }
}

export function resolveFeedReturnContext() {
  const lastView = window.localStorage.getItem(STORAGE_KEY)
  if (!lastView) return { isReturn: false, minutesSinceLastView: null }

  const minutesSinceLastView = Math.round((Date.now() - Date.parse(lastView)) / 60_000)
  return {
    isReturn: minutesSinceLastView >= 10,
    minutesSinceLastView,
  }
}
