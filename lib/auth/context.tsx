"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useAuth as useClerkAuth, useClerk, useUser } from "@clerk/nextjs";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import {
  hasClerkPublishableKey,
  hasFullAuthConfig,
  hasSupabaseBrowserEnv,
} from "@/lib/config";
import { normalizeClerkRole } from "./clerk-rbac";
import { evaluateProfileCompletion } from "./profile-completion";

export type UserRole = "super_admin" | "admin" | "shura" | "imam" | "member";

// Role hierarchy - higher index = higher privilege
export const ROLE_HIERARCHY: UserRole[] = ["member", "imam", "shura", "admin", "super_admin"];

export function getRoleLevel(role: UserRole): number {
  return ROLE_HIERARCHY.indexOf(role);
}

export function hasRoleOrHigher(userRole: UserRole, requiredRole: UserRole): boolean {
  return getRoleLevel(userRole) >= getRoleLevel(requiredRole);
}

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  phone: string | null;
  bio: string | null;
  role: UserRole;
  mosque_id: string | null;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

type ProvisioningResponse = {
  profile: Profile | null;
  suggestedUsername: string | null;
  needsOnboarding: boolean;
  defaultOrgName: string;
  orgRole: string;
};

type RefreshProfileOptions = {
  fullName?: string | null;
  username?: string | null;
};

interface AuthContextType {
  userId: string | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: (options?: RefreshProfileOptions) => Promise<ProvisioningResponse | null>;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isShura: boolean;
  isImam: boolean;
  isMember: boolean;
  hasRole: (roles: UserRole[]) => boolean;
  canAccess: (requiredRole: UserRole) => boolean;
  isSignedIn: boolean;
  resolvedRole: UserRole | null;
  needsOnboarding: boolean;
  suggestedUsername: string | null;
  provisioningError: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

class ClientProvisioningError extends Error {
  status: number;
  suggestedUsername: string | null;

  constructor(message: string, status = 500, suggestedUsername: string | null = null) {
    super(message);
    this.name = "ClientProvisioningError";
    this.status = status;
    this.suggestedUsername = suggestedUsername;
  }
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function getClerkCompletionUser(user: ReturnType<typeof useUser>["user"]) {
  return {
    firstName: user?.firstName ?? null,
    lastName: user?.lastName ?? null,
    fullName: user?.fullName ?? null,
    primaryEmailAddress: user?.primaryEmailAddress?.emailAddress ?? null,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Defensive merge-safe guard: supports both consolidated and split runtime flags.
  const hasConfiguredAuth =
    hasFullAuthConfig || (hasClerkPublishableKey && hasSupabaseBrowserEnv);

  if (!hasConfiguredAuth) {
    return <FallbackAuthProvider>{children}</FallbackAuthProvider>;
  }

  return <ConfiguredAuthProvider>{children}</ConfiguredAuthProvider>;
}

function ConfiguredAuthProvider({ children }: { children: React.ReactNode }) {
  const { orgRole, getToken } = useClerkAuth();
  const { user, isLoaded: isClerkLoaded, isSignedIn } = useUser();
  const { signOut: clerkSignOut } = useClerk();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [suggestedUsername, setSuggestedUsername] = useState<string | null>(null);
  const [provisioningError, setProvisioningError] = useState<string | null>(null);
  const [{ supabase, supabaseError }] = useState(() => {
    try {
      return { supabase: createClient(), supabaseError: null as string | null };
    } catch (error) {
      return {
        supabase: null,
        supabaseError:
          error instanceof Error ? error.message : "Failed to initialize Supabase",
      };
    }
  });

  const refreshProfile = useCallback(
    async (options?: RefreshProfileOptions) => {
      if (!user?.id) {
        setProfile(null);
        setNeedsOnboarding(false);
        setSuggestedUsername(null);
        setProvisioningError(null);
        return null;
      }

      const body: RefreshProfileOptions = {};
      if (options?.fullName !== undefined) {
        body.fullName = options.fullName ?? null;
      }
      if (options?.username !== undefined) {
        body.username = options.username ?? null;
      }

      const token = await getToken();

      const response = await fetch("/api/onboarding/provision", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(body),
        cache: "no-store",
      });

      const payload = (await response.json().catch(() => ({}))) as Partial<ProvisioningResponse> & {
        error?: string;
        suggestedUsername?: string | null;
      };

      if (!response.ok) {
        const message = payload.error || "Failed to set up your profile";
        const nextSuggestion = isNonEmptyString(payload.suggestedUsername)
          ? payload.suggestedUsername
          : null;
        setProvisioningError(message);
        setSuggestedUsername((current) => nextSuggestion ?? current);
        throw new ClientProvisioningError(message, response.status, nextSuggestion);
      }

      const nextProfile = (payload.profile ?? null) as Profile | null;
      const nextSuggestedUsername = isNonEmptyString(payload.suggestedUsername)
        ? payload.suggestedUsername
        : nextProfile?.username ?? null;

      setProfile(nextProfile);
      setNeedsOnboarding(Boolean(payload.needsOnboarding));
      setSuggestedUsername(nextSuggestedUsername);
      setProvisioningError(null);

      return payload as ProvisioningResponse;
    },
    [user?.id]
  );

  useEffect(() => {
    if (!isClerkLoaded) {
      return;
    }

    let cancelled = false;

    const loadProfile = async () => {
      setProfileLoading(true);

      if (!isSignedIn || !user?.id) {
        if (!cancelled) {
          setProfile(null);
          setNeedsOnboarding(false);
          setSuggestedUsername(null);
          setProvisioningError(null);
          setProfileLoading(false);
        }
        return;
      }

      try {
        await refreshProfile();
      } catch (error) {
        if (!cancelled) {
          if (error instanceof Error) {
            setProvisioningError(error.message);
          }
        }
      } finally {
        if (!cancelled) {
          setProfileLoading(false);
        }
      }
    };

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [isClerkLoaded, isSignedIn, refreshProfile, user?.id]);

  useEffect(() => {
    if (!isSignedIn || !user?.id) return;

    const updateStatus = async () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        return;
      }

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        return;
      }

      try {
        const token = await getToken();
        await fetch("/api/users/status", {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          keepalive: true,
          cache: "no-store",
        });
      } catch (error) {
        if (!(error instanceof TypeError)) {
          console.error("Error updating status:", error);
        }
      }
    };

    void updateStatus();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void updateStatus();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    const interval = setInterval(updateStatus, 60000);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isSignedIn, user?.id]);

  useEffect(() => {
    if (!supabase || !isSignedIn || !user?.id) return;

    const channel = supabase
      .channel(`profile-sync-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${user.id}`,
        },
        (payload: RealtimePostgresChangesPayload<Profile>) => {
          if (!payload.new) return;
          const nextProfile = payload.new as Profile;
          setProfile(nextProfile);
          setNeedsOnboarding(
            evaluateProfileCompletion(
              {
                fullName: nextProfile.full_name,
                username: nextProfile.username,
              },
              getClerkCompletionUser(user)
            ).needsOnboarding
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [
    isSignedIn,
    supabase,
    user?.fullName,
    user?.firstName,
    user?.id,
    user?.lastName,
    user?.primaryEmailAddress?.emailAddress,
  ]);

  const signOut = async () => {
    await clerkSignOut();
    setProfile(null);
    setNeedsOnboarding(false);
    setSuggestedUsername(null);
    setProvisioningError(null);
  };

  const clerkRole = normalizeClerkRole(orgRole);
  const resolvedRole: UserRole | null = profile
    ? profile.role === "super_admin"
      ? "super_admin"
      : clerkRole !== "member"
        ? clerkRole
        : profile.role
    : null;

  const hasRole = (roles: UserRole[]) => {
    if (!resolvedRole) return false;
    if (resolvedRole === "super_admin") return true;
    return roles.includes(resolvedRole);
  };

  const canAccess = (requiredRole: UserRole) => {
    if (!resolvedRole) return false;
    return hasRoleOrHigher(resolvedRole, requiredRole);
  };

  const loading = !isClerkLoaded || profileLoading;

  const value: AuthContextType = {
    userId: user?.id ?? null,
    profile,
    loading,
    signOut,
    refreshProfile,
    isSuperAdmin: resolvedRole === "super_admin",
    isAdmin: resolvedRole === "admin" || resolvedRole === "super_admin",
    isShura:
      resolvedRole === "shura" ||
      resolvedRole === "admin" ||
      resolvedRole === "super_admin",
    isImam: resolvedRole === "imam" || hasRoleOrHigher(resolvedRole ?? "member", "imam"),
    isMember: Boolean(profile),
    hasRole,
    canAccess,
    isSignedIn: isSignedIn ?? false,
    resolvedRole,
    needsOnboarding,
    suggestedUsername,
    provisioningError,
  };

  if (supabaseError) {
    return (
      <AuthContext.Provider value={value}>
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="max-w-md rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
            <h2 className="mb-2 text-lg font-semibold text-destructive">
              Configuration Error
            </h2>
            <p className="text-sm text-muted-foreground">{supabaseError}</p>
          </div>
        </div>
      </AuthContext.Provider>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function FallbackAuthProvider({ children }: { children: React.ReactNode }) {
  const value: AuthContextType = {
    userId: null,
    profile: null,
    loading: false,
    signOut: async () => {},
    refreshProfile: async () => null,
    isSuperAdmin: false,
    isAdmin: false,
    isShura: false,
    isImam: false,
    isMember: false,
    hasRole: () => false,
    canAccess: () => false,
    isSignedIn: false,
    resolvedRole: null,
    needsOnboarding: false,
    suggestedUsername: null,
    provisioningError: null,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
