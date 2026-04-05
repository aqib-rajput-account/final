"use client"

import { FeedView } from './feed-view'
import { UserSwitcher } from './user-switcher'

export function ComprehensiveFeed() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Community Feed</h2>
          <p className="text-muted-foreground">Stay connected with your community</p>
        </div>
        <div className="flex items-center gap-2">
          <UserSwitcher variant="compact" />
        </div>
      </div>

      {/* Feed */}
      <FeedView />
    </div>
  )
}
