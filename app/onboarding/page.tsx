"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser, useAuth as useClerkAuth } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { sanitizeRedirectPath } from "@/lib/auth/onboarding";
import {
  evaluateProfileCompletion,
  getExplicitClerkFullName,
  getGeneratedProfilePlaceholderName,
  isNonEmptyText,
  normalizeFullName,
} from "@/lib/auth/profile-completion";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { UserRole } from "@/lib/database.types";

function getInitials(name: string | null | undefined) {
  if (!isNonEmptyText(name)) {
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
  const { getToken } = useClerkAuth();
  const {
    isSignedIn,
    loading: authLoading,
    needsOnboarding,
    profile,
    suggestedUsername,
    provisioningError,
    refreshProfile,
  } = useAuth();
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [mosqueId, setMosqueId] = useState<string>("");
  const [role, setRole] = useState<UserRole>("member");
  const [mosques, setMosques] = useState<Array<{ id: string; name: string; city: string; state: string }>>([]);
  const [loadingMosques, setLoadingMosques] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  const clerkIdentity = useMemo(
    () => ({
      firstName: user?.firstName ?? null,
      lastName: user?.lastName ?? null,
      fullName: user?.fullName ?? null,
      primaryEmailAddress: user?.primaryEmailAddress?.emailAddress ?? null,
    }),
    [user?.firstName, user?.fullName, user?.lastName, user?.primaryEmailAddress?.emailAddress]
  );

  const explicitClerkName = useMemo(
    () => getExplicitClerkFullName(clerkIdentity),
    [clerkIdentity]
  );
  const generatedPlaceholderName = useMemo(
    () => getGeneratedProfilePlaceholderName(clerkIdentity),
    [clerkIdentity]
  );
  const previewName =
    profile?.full_name ?? explicitClerkName ?? generatedPlaceholderName ?? "Community Member";
  const displayedPreviewName = fullName || previewName;
  const previewEmail = user?.primaryEmailAddress?.emailAddress ?? null;
  const previewAvatar = user?.imageUrl ?? null;
  const currentNameState = useMemo(
    () =>
      evaluateProfileCompletion(
        {
          fullName,
          username,
        },
        clerkIdentity
      ),
    [clerkIdentity, fullName, username]
  );

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
    if (!fullName) {
      const initialName =
        profile?.full_name ?? explicitClerkName ?? generatedPlaceholderName ?? "";
      if (initialName) {
        setFullName(initialName);
      }
    }
  }, [explicitClerkName, fullName, generatedPlaceholderName, profile?.full_name]);

  useEffect(() => {
    if (!username) {
      const initialUsername = profile?.username ?? suggestedUsername ?? "";
      if (initialUsername) {
        setUsername(initialUsername);
      }
    }
  }, [profile?.username, suggestedUsername, username]);

  // Fetch mosques for selection
  useEffect(() => {
    const fetchMosques = async () => {
      try {
        const response = await fetch("/api/mosques?limit=100");
        if (response.ok) {
          const data = await response.json();
          setMosques(data.mosques || []);
        } else {
          // Fallback to mock data if API fails
          const { mockMosques } = await import("@/lib/data/mock-data");
          setMosques(mockMosques.map(m => ({
            id: m.id,
            name: m.name,
            city: m.city,
            state: m.state
          })));
        }
      } catch (error) {
        console.error("Failed to fetch mosques:", error);
        // Fallback to mock data
        try {
          const { mockMosques } = await import("@/lib/data/mock-data");
          setMosques(mockMosques.map(m => ({
            id: m.id,
            name: m.name,
            city: m.city,
            state: m.state
          })));
        } catch (fallbackError) {
          console.error("Failed to load mock data:", fallbackError);
        }
      } finally {
        setLoadingMosques(false);
      }
    };

    if (isSignedIn) {
      fetchMosques();
    }
  }, [isSignedIn, getToken]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedFullName = normalizeFullName(fullName);
    const trimmedUsername = username.trim();
    const selectedMosqueId = mosqueId === "none" ? null : mosqueId || null;

    if (!normalizedFullName) {
      setPageError("Enter your full name to finish your account setup.");
      return;
    }

    if (currentNameState.isGeneratedPlaceholderName) {
      setPageError("Enter your real full name instead of the generated placeholder.");
      return;
    }

    if (!trimmedUsername) {
      setPageError("Choose a username to finish your account setup.");
      return;
    }

    setSubmitting(true);
    setPageError(null);

    try {
      const token = await getToken();
      const response = await fetch("/api/onboarding/provision", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { "x-onboarding-token": token } : {})
        },
        body: JSON.stringify({
          fullName: normalizedFullName,
          username: trimmedUsername,
          mosqueId: selectedMosqueId,
          role: "member", // Always start as member, higher roles assigned by admins
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        suggestedUsername?: string | null;
      };

      if (!response.ok) {
        if (isNonEmptyText(payload.suggestedUsername)) {
          setUsername(payload.suggestedUsername);
        }
        throw new Error(payload.error || "We couldn't save your profile yet.");
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
                <AvatarImage src={previewAvatar ?? undefined} alt={displayedPreviewName} />
                <AvatarFallback className="bg-primary/5 text-xl font-semibold text-primary">
                  {getInitials(displayedPreviewName)}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
          <div className="space-y-2">
            <CardTitle className="text-3xl font-bold tracking-tight">Welcome to MosqueConnect</CardTitle>
            <CardDescription className="text-base">
              Finish your public profile once so the app can recognize you correctly.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="relative overflow-hidden rounded-2xl border border-primary/10 bg-primary/5 px-6 py-4">
            <div className="absolute right-0 top-0 -mr-4 -mt-4 h-16 w-16 rotate-12 bg-primary/10 blur-2xl"></div>
            <div className="relative flex items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <span className="font-bold text-primary">MC</span>
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold text-foreground">{displayedPreviewName}</p>
                {previewEmail ? (
                  <p className="truncate text-sm text-muted-foreground">{previewEmail}</p>
                ) : null}
              </div>
            </div>
            <div className="mt-4 flex w-fit items-center gap-2 rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse"></span>
              {mosqueId && mosqueId !== "none" 
                ? `Joining ${mosques.find(m => m.id === mosqueId)?.name || 'selected mosque'} as a community member`
                : `Auto-joining MasjidConnect as a community member`
              }
            </div>
          </div>

          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-primary/80">
            <strong>Tip:</strong> Don't stress! You can safely leave these as defaults and update your information anytime via your Profile Settings after you enter the app.
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="fullName" className="text-sm font-semibold">Full name</Label>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Displayed publicly</span>
              </div>
              <Input
                id="fullName"
                className="h-12 rounded-xl border-primary/20 text-base focus-visible:ring-primary/30"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Your full name"
                autoComplete="name"
                autoFocus
              />
              <p className="text-[11px] font-medium leading-relaxed text-muted-foreground">
                {currentNameState.isGeneratedPlaceholderName
                  ? "Please replace the generated placeholder with your real name."
                  : "Use the name you want other community members to see."}
              </p>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="username" className="text-sm font-semibold">Username</Label>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Unique ID</span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-medium text-muted-foreground">@</span>
                <Input
                  id="username"
                  className="h-12 rounded-xl border-primary/20 pl-8 text-base focus-visible:ring-primary/30"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="username"
                  autoComplete="username"
                />
              </div>
              <p className="text-[11px] font-medium leading-relaxed text-muted-foreground">
                Choose a unique handle for your profile. Letters, numbers, and underscores work best.
              </p>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="mosque" className="text-sm font-semibold">Primary Mosque</Label>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Optional</span>
              </div>
              <Select value={mosqueId} onValueChange={setMosqueId} disabled={loadingMosques}>
                <SelectTrigger className="h-12 rounded-xl border-primary/20 focus-visible:ring-primary/30">
                  <SelectValue placeholder={loadingMosques ? "Loading mosques..." : "Select your primary mosque"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No specific mosque affiliation</SelectItem>
                  {mosques.map((mosque) => (
                    <SelectItem key={mosque.id} value={mosque.id}>
                      {mosque.name} - {mosque.city}, {mosque.state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] font-medium leading-relaxed text-muted-foreground">
                Select the mosque you primarily attend or are affiliated with. You can change this later.
              </p>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="role" className="text-sm font-semibold">Your Role</Label>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Community Role</span>
              </div>
              <Select value={role} onValueChange={(value) => setRole(value as UserRole)}>
                <SelectTrigger className="h-12 rounded-xl border-primary/20 focus-visible:ring-primary/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Community Member</SelectItem>
                  <SelectItem value="imam" disabled>Imam (requires verification)</SelectItem>
                  <SelectItem value="shura" disabled>Shura Council Member (requires verification)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] font-medium leading-relaxed text-muted-foreground">
                Start as a community member. Higher roles require verification by mosque administrators.
              </p>
            </div>

            {(pageError || provisioningError) && (
              <div className="animate-in fade-in slide-in-from-top-1 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3.5 text-sm font-medium text-destructive duration-300">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />
                  {pageError || provisioningError}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <Button
                type="submit"
                className="h-12 flex-1 rounded-xl text-base font-semibold shadow-lg shadow-primary/20 transition-all hover:shadow-primary/30 active:scale-[0.98]"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Completing registration...
                  </>
                ) : (
                  "Finish and enter"
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
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <OnboardingContent />
    </Suspense>
  );
}
