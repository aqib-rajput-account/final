"use client"

import { ClerkProvider } from "@clerk/nextjs"
import { ThemeProvider } from "./theme-provider"
import { AuthProvider } from "@/lib/auth"
import { OnboardingGate } from "@/components/auth/onboarding-gate"
import { Toaster } from "@/components/ui/sonner"
import { hasClerkPublishableKey } from "@/lib/config"

const signInUrl = process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL ?? "/sign-in"
const signUpUrl = process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL ?? "/sign-up"
const signInFallbackRedirectUrl =
  process.env.NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL ?? "/feed"
const signUpFallbackRedirectUrl =
  process.env.NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL ?? "/onboarding"

function InnerProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <AuthProvider>
        <OnboardingGate>{children}</OnboardingGate>
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
    <ClerkProvider
      signInUrl={signInUrl}
      signUpUrl={signUpUrl}
      signInFallbackRedirectUrl={signInFallbackRedirectUrl}
      signUpFallbackRedirectUrl={signUpFallbackRedirectUrl}
    >
      <InnerProviders>{children}</InnerProviders>
    </ClerkProvider>
  )
}
