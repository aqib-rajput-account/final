"use client"

import { ClerkProvider } from "@clerk/nextjs"
import { ThemeProvider } from "./theme-provider"
import { AuthProvider } from "@/lib/auth"
import { Toaster } from "@/components/ui/sonner"
import { hasClerkPublishableKey } from "@/lib/config"

function InnerProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <AuthProvider>
        {children}
        <Toaster />
      </AuthProvider>
    </ThemeProvider>
  )
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  if (!hasClerkPublishableKey) {
    return <InnerProviders>{children}</InnerProviders>
  }

  return (
    <ClerkProvider>
      <InnerProviders>{children}</InnerProviders>
    </ClerkProvider>
  )
}
