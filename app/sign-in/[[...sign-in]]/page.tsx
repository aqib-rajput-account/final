"use client";

import { useState, useEffect } from "react";
import { useSignIn, useUser, useClerk, AuthenticateWithRedirectCallback } from "@clerk/nextjs";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { AuthUnavailableState } from "@/components/auth/auth-unavailable-state";
import { GoogleIcon } from "@/components/auth/google-icon";
import { hasClerkPublishableKey } from "@/lib/config";
import { sanitizeRedirectPath } from "@/lib/auth/onboarding";
import Link from "next/link";
import { Building2 } from "lucide-react";

function BrandHeader() {
  return (
    <>
      <Link href="/" className="inline-flex items-center gap-2 mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
          <Building2 className="h-6 w-6 text-primary-foreground" />
        </div>
        <span className="text-xl font-bold">MosqueConnect</span>
      </Link>
      <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
    </>
  );
}

// Ensure unknown errors are handled cleanly.
function extractClerkError(err: unknown): string {
  if (!err) return "An unexpected error occurred.";
  if (typeof err === "string") return err;
  
  const anyErr = err as Record<string, unknown>;
  const errorsArray = anyErr.errors;
  
  if (Array.isArray(errorsArray) && errorsArray.length > 0) {
    if (errorsArray[0].longMessage) return errorsArray[0].longMessage;
    if (errorsArray[0].message) return errorsArray[0].message;
  }
  
  if (anyErr.message && typeof anyErr.message === "string") {
    return anyErr.message;
  }
  
  return "An unexpected error occurred.";
}

export default function SignInPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const finalDestination = searchParams.has("redirect_url")
    ? sanitizeRedirectPath(searchParams.get("redirect_url"), "/feed")
    : "/feed";
    
  const { isLoaded: userLoaded, isSignedIn } = useUser();
  const { isLoaded: signInLoaded, signIn, setActive } = useSignIn();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Detect SSO callback path (Google OAuth return)
  const isSSOCallback =
    pathname?.includes("sso-callback") ||
    searchParams.has("__clerk_status");

  // Redirect if already signed in
  useEffect(() => {
    if (userLoaded && isSignedIn && !isSSOCallback) {
      window.location.href = finalDestination;
    }
  }, [userLoaded, isSignedIn, finalDestination, isSSOCallback]);

  // ──────────────────────────────────────────────
  // Guard: missing config
  // ──────────────────────────────────────────────
  if (!hasClerkPublishableKey) {
    return (
      <AuthUnavailableState
        title="Sign-in unavailable"
        description="The sign-in screen needs Clerk to be configured before it can be used."
      />
    );
  }

  // ──────────────────────────────────────────────
  // Guard: still loading
  // ──────────────────────────────────────────────
  if (!signInLoaded || !userLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  // ──────────────────────────────────────────────
  // Guard: already signed in → redirect
  // ──────────────────────────────────────────────
  if (isSignedIn && !isSSOCallback) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl">Welcome back!</CardTitle>
            <CardDescription>
              Redirecting you to the app…
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center py-6">
            <Spinner className="h-6 w-6" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // ──────────────────────────────────────────────
  // Guard: SSO callback in progress
  // ──────────────────────────────────────────────
  if (isSSOCallback) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
        <AuthenticateWithRedirectCallback 
          signInForceRedirectUrl={finalDestination}
          signUpForceRedirectUrl={finalDestination}
        />
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <BrandHeader />
          </div>
          <Card className="shadow-lg">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-xl">Completing sign in</CardTitle>
              <CardDescription>
                Hold on while we finish connecting your Google account…
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-center py-4">
                <Spinner className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────
  // Handlers
  // ──────────────────────────────────────────────

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signIn) return;

    setError(null);
    setLoading(true);

    try {
      // 1. Attempt manual sign-in with email & password
      const result = await signIn.create({
        identifier: email,
        password,
      });

      if (result.status === "complete" && result.createdSessionId) {
        // Sign-in fully completed — activate the session
        await setActive({ session: result.createdSessionId });
        window.location.href = finalDestination;
      } else {
        // Needs other forms of MFA or steps not implemented here. 
        // Force fallback if the user has exotic MFA rules.
        setError(
          "Additional verification is needed. This basic sign-in doesn't support complex MFA."
        );
      }
    } catch (err: unknown) {
      setError(extractClerkError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!signIn) return;
    setError(null);
    setLoading(true);

    try {
      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/sign-in/sso-callback",
        redirectUrlComplete: finalDestination,
      });
    } catch (err: unknown) {
      setError(extractClerkError(err));
      setLoading(false);
    }
  };

  const signUpLink = searchParams.has("redirect_url")
    ? `/sign-up?redirect_url=${encodeURIComponent(finalDestination)}`
    : "/sign-up";

  // ──────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <BrandHeader />
        </div>

        <Card className="shadow-lg">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl">Sign in</CardTitle>
            <CardDescription>
              Sign in to your account with Google or email.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Google Button */}
            <Button
              variant="outline"
              className="w-full h-11 gap-2"
              onClick={handleGoogleSignIn}
              disabled={loading}
              type="button"
            >
              <GoogleIcon />
              Continue with Google
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  Or sign in with email
                </span>
              </div>
            </div>

            {/* Email / Password Form */}
            <form onSubmit={handleEmailSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  autoComplete="username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  autoComplete="current-password"
                />
              </div>

              {error && (
                <p className="text-sm text-destructive font-medium border border-destructive/20 bg-destructive/10 p-2 rounded-md">
                  {error}
                </p>
              )}

              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading ? <Spinner className="h-4 w-4" /> : "Sign in"}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <p className="text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link
                href={signUpLink}
                className="font-medium text-primary hover:underline"
              >
                Sign up
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
