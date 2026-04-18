"use client";

import { useState, useEffect } from "react";
import { useSignUp, useSignIn, useUser, useClerk, AuthenticateWithRedirectCallback } from "@clerk/nextjs";
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

type FlowStep = "start" | "verify" | "complete";

export default function SignUpPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const finalDestination = searchParams.has("redirect_url")
    ? sanitizeRedirectPath(searchParams.get("redirect_url"), "/onboarding")
    : "/onboarding";
  const { isLoaded: userLoaded, isSignedIn } = useUser();
  const { isLoaded: signUpLoaded, signUp, setActive } = useSignUp();
  const { isLoaded: signInLoaded, signIn } = useSignIn();
  const clerk = useClerk();

  const [step, setStep] = useState<FlowStep>("start");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

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

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // ──────────────────────────────────────────────
  // Guard: missing config
  // ──────────────────────────────────────────────
  if (!hasClerkPublishableKey) {
    return (
      <AuthUnavailableState
        title="Sign-up unavailable"
        description="The sign-up screen needs Clerk to be configured before it can be used."
      />
    );
  }

  // ──────────────────────────────────────────────
  // Guard: still loading
  // ──────────────────────────────────────────────
  if (!signUpLoaded || !userLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  // ──────────────────────────────────────────────
  // Guard: already signed in → redirect
  // ──────────────────────────────────────────────
  if (isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl">Account ready</CardTitle>
            <CardDescription>
              Redirecting you to complete your profile…
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
              <CardTitle className="text-xl">Completing sign up</CardTitle>
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

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signUp) return;

    setError(null);
    setLoading(true);

    try {
      // 1. Create the sign-up attempt
      await signUp.create({
        emailAddress: email,
        password,
      });

      // 2. Force email_code strategy — this is the key fix!
      //    This bypasses the Clerk Dashboard's email_link setting
      //    and directly sends a 6-digit OTP code instead.
      await signUp.prepareEmailAddressVerification({
        strategy: "email_code",
      });

      setStep("verify");
      setResendCooldown(60);
    } catch (err: unknown) {
      setError(extractClerkError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signUp) return;

    setError(null);
    setLoading(true);

    try {
      const result = await signUp.attemptEmailAddressVerification({ code });

      if (result.status === "complete" && result.createdSessionId) {
        // Sign-up done — activate the session and redirect to onboarding
        await setActive({ session: result.createdSessionId });
        window.location.href = finalDestination;
      } else {
        // Rare: Clerk needs more info (shouldn't happen for email+password)
        setError(
          "Additional verification may be needed. Please try again or use Google sign-up."
        );
      }
    } catch (err: unknown) {
      setError(extractClerkError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    if (!signIn) return;
    setError(null);
    setLoading(true);

    try {
      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/sign-up/sso-callback",
        redirectUrlComplete: finalDestination,
      });
    } catch (err: unknown) {
      setError(extractClerkError(err));
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!signUp || resendCooldown > 0) return;
    setError(null);

    try {
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setResendCooldown(60);
    } catch (err: unknown) {
      setError(extractClerkError(err));
    }
  };

  const signInLink = searchParams.has("redirect_url")
    ? `/sign-in?redirect_url=${encodeURIComponent(finalDestination)}`
    : "/sign-in";

  // ──────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <BrandHeader />
        </div>

        {/* ─── Step 1: Email + Password ─── */}
        {step === "start" && (
          <Card className="shadow-lg">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-xl">Sign up</CardTitle>
              <CardDescription>
                Create your account with Google or email and password.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Google Button */}
              <Button
                variant="outline"
                className="w-full h-11 gap-2"
                onClick={handleGoogleSignUp}
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
                    Or sign up with email
                  </span>
                </div>
              </div>

              {/* Email / Password Form */}
              <form onSubmit={handleEmailSignUp} className="space-y-4">
                <div id="clerk-captcha" />
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email address</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    required
                    placeholder="Create a password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground">
                    We will send a 6-digit verification code to your email.
                  </p>
                </div>

                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}

                <Button
                  type="submit"
                  className="w-full h-11"
                  disabled={loading}
                >
                  {loading ? (
                    <Spinner className="h-4 w-4" />
                  ) : (
                    "Create account"
                  )}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link
                  href={signInLink}
                  className="font-medium text-primary hover:underline"
                >
                  Sign in
                </Link>
              </p>
              <p className="text-center text-xs text-muted-foreground">
                By signing up, you agree to our{" "}
                <Link
                  href="/terms"
                  className="underline hover:text-foreground"
                >
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link
                  href="/privacy"
                  className="underline hover:text-foreground"
                >
                  Privacy Policy
                </Link>
              </p>
            </CardFooter>
          </Card>
        )}

        {/* ─── Step 2: Email Verification Code ─── */}
        {step === "verify" && (
          <Card className="shadow-lg">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-xl">Verify your email</CardTitle>
              <CardDescription>
                We sent a 6-digit code to{" "}
                <strong className="text-foreground">{email}</strong>. Enter it
                below to finish creating your account.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleVerifyCode} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="verify-code">Verification code</Label>
                  <Input
                    id="verify-code"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    required
                    placeholder="Enter 6-digit code"
                    className="text-center text-lg tracking-[0.5em] font-mono"
                    value={code}
                    onChange={(e) =>
                      setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    disabled={loading}
                    autoFocus
                    autoComplete="one-time-code"
                  />
                </div>

                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}

                <Button
                  type="submit"
                  className="w-full h-11"
                  disabled={loading || code.length < 6}
                >
                  {loading ? (
                    <Spinner className="h-4 w-4" />
                  ) : (
                    "Verify email"
                  )}
                </Button>
              </form>

              {resendCooldown > 0 ? (
                <p className="text-center text-sm text-muted-foreground">
                  Resend code in {resendCooldown} seconds
                </p>
              ) : (
                <Button
                  variant="link"
                  className="w-full"
                  onClick={handleResendCode}
                  disabled={loading}
                >
                  Resend verification code
                </Button>
              )}
            </CardContent>
            <CardFooter>
              <p className="text-center text-sm text-muted-foreground w-full">
                Wrong email?{" "}
                <button
                  className="font-medium text-primary hover:underline"
                  onClick={() => {
                    setStep("start");
                    setCode("");
                    setError(null);
                  }}
                >
                  Go back
                </button>
              </p>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Shared sub-components & helpers
// ──────────────────────────────────────────────

function BrandHeader() {
  return (
    <>
      <Link href="/" className="inline-flex items-center gap-2 mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
          <Building2 className="h-6 w-6 text-primary-foreground" />
        </div>
        <span className="text-xl font-bold">MosqueConnect</span>
      </Link>
      <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
      <p className="text-muted-foreground mt-2">
        Join the MosqueConnect community
      </p>
    </>
  );
}

function extractClerkError(err: unknown): string {
  const clerkErr = err as {
    errors?: Array<{ longMessage?: string; message?: string }>;
    message?: string;
  } | null;

  const firstError = clerkErr?.errors?.[0];
  return (
    firstError?.longMessage ||
    firstError?.message ||
    clerkErr?.message ||
    "Something went wrong. Please try again."
  );
}
