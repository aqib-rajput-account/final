"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { sanitizeRedirectPath } from "@/lib/auth/onboarding";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function humanizeIdentifier(value: string | null | undefined) {
  if (!isNonEmptyString(value)) {
    return "Community Member";
  }

  return value
    .replace(/[@].*$/, "")
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getInitials(name: string | null | undefined) {
  if (!isNonEmptyString(name)) {
    return "MC";
  }

  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = sanitizeRedirectPath(searchParams.get("redirect_url"), "/feed");
  const { user } = useUser();
  const {
    isSignedIn,
    loading: authLoading,
    needsOnboarding,
    suggestedUsername,
    provisioningError,
    refreshProfile,
  } = useAuth();
  const [username, setUsername] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  const previewName = useMemo(() => {
    const primaryEmail = user?.primaryEmailAddress?.emailAddress ?? null;
    const emailLocalPart = primaryEmail?.split("@")[0] ?? null;

    return (
      user?.fullName ||
      [user?.firstName, user?.lastName].filter(isNonEmptyString).join(" ").trim() ||
      humanizeIdentifier(emailLocalPart)
    );
  }, [user?.firstName, user?.fullName, user?.lastName, user?.primaryEmailAddress?.emailAddress]);

  const previewEmail = user?.primaryEmailAddress?.emailAddress ?? null;
  const previewAvatar = user?.imageUrl ?? null;

  useEffect(() => {
    if (!authLoading && !isSignedIn) {
      router.replace("/sign-in?redirect_url=/onboarding");
    }
  }, [authLoading, isSignedIn, router]);

  useEffect(() => {
    if (!authLoading && isSignedIn && !needsOnboarding) {
      router.replace(redirectTarget);
      router.refresh();
    }
  }, [authLoading, isSignedIn, needsOnboarding, redirectTarget, router]);

  useEffect(() => {
    if (!username && suggestedUsername) {
      setUsername(suggestedUsername);
    }
  }, [suggestedUsername, username]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      setPageError("Choose a username to finish your account setup.");
      return;
    }

    setSubmitting(true);
    setPageError(null);

    try {
      const response = await fetch("/api/onboarding/provision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: trimmedUsername }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        suggestedUsername?: string | null;
        needsOnboarding?: boolean;
      };

      if (!response.ok) {
        if (isNonEmptyString(payload.suggestedUsername)) {
          setUsername(payload.suggestedUsername);
        }
        throw new Error(payload.error || "We couldn't save your username yet.");
      }

      await refreshProfile();
      router.replace(redirectTarget);
      router.refresh();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "We couldn't finish setup yet.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = async () => {
    setPageError(null);
    try {
      await refreshProfile();
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Retry failed.");
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isSignedIn) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background px-4 py-12">
      <Card className="w-full max-w-lg border-primary/10 shadow-2xl shadow-primary/5">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto">
            <div className="relative">
              <div className="absolute -inset-0.5 animate-pulse rounded-full bg-gradient-to-tr from-primary to-primary-foreground opacity-30 blur"></div>
              <Avatar className="relative h-24 w-24 ring-4 ring-background">
                <AvatarImage src={previewAvatar ?? undefined} alt={previewName} />
                <AvatarFallback className="bg-primary/5 text-xl font-semibold text-primary">
                  {getInitials(previewName)}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
          <div className="space-y-2">
            <CardTitle className="text-3xl font-bold tracking-tight">Welcome to MosqueConnect</CardTitle>
            <CardDescription className="text-base">
              Your community is waiting. Just one more step to finish your profile.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="relative overflow-hidden rounded-2xl border border-primary/10 bg-primary/5 px-6 py-4">
            <div className="absolute right-0 top-0 -mr-4 -mt-4 h-16 w-16 rotate-12 bg-primary/10 blur-2xl"></div>
            <div className="relative flex items-center gap-4">
              <div className="h-10 w-10 shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-bold">MC</span>
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-foreground truncate">{previewName}</p>
                {previewEmail ? (
                  <p className="text-sm text-muted-foreground truncate">{previewEmail}</p>
                ) : null}
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs font-medium text-primary bg-primary/10 w-fit px-2 py-1 rounded-md">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse"></span>
              Auto-joining MasjidConnect as a member
            </div>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="username" className="text-sm font-semibold">Username</Label>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Unique ID</span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">@</span>
                <Input
                  id="username"
                  className="pl-8 h-12 text-base rounded-xl border-primary/20 focus-visible:ring-primary/30"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="username"
                  autoComplete="username"
                  autoFocus
                />
              </div>
              <p className="text-[11px] text-muted-foreground font-medium leading-relaxed">
                Choose a unique handle for your profile. Letters, numbers, and underscores work best.
              </p>
            </div>

            {(pageError || provisioningError) && (
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3.5 text-sm text-destructive font-medium animate-in fade-in slide-in-from-top-1 duration-300">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />
                  {pageError || provisioningError}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row pt-2">
              <Button type="submit" className="h-12 flex-1 rounded-xl text-base font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-[0.98]" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Completing registration...
                  </>
                ) : (
                  "Finish and Enter →"
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="h-12 rounded-xl text-base hover:bg-primary/5 active:scale-[0.98]"
                onClick={() => void handleRetry()}
                disabled={submitting}
              >
                Retry
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <OnboardingContent />
    </Suspense>
  );
}
