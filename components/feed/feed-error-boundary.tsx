'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

interface State {
  hasError: boolean
}

export class FeedErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card>
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">Something went wrong</h3>
            <p className="text-muted-foreground mb-4">The feed ran into an unexpected error.</p>
            <Button onClick={() => this.setState({ hasError: false })}>Try again</Button>
          </CardContent>
        </Card>
      )
    }
    return this.props.children
  }
}
