"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useAuth as useClerkAuth, useClerk, useUser } from "@clerk/nextjs";
import { createClient } from "@/lib/supabase/client";
import { hasClerkPublishableKey, hasFullAuthConfig, hasSupabaseBrowserEnv } from "@/lib/config";
import { normalizeClerkRole } from "./clerk-rbac";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

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

interface AuthContextType {
  userId: string | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isShura: boolean;
  isImam: boolean;
  isMember: boolean;
  hasRole: (roles: UserRole[]) => boolean;
  canAccess: (requiredRole: UserRole) => boolean;
  isSignedIn: boolean;
  resolvedRole: UserRole | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Defensive merge-safe guard: supports both consolidated and split runtime flags.
  const hasConfiguredAuth = hasFullAuthConfig || (hasClerkPublishableKey && hasSupabaseBrowserEnv);

  if (!hasConfiguredAuth) {
    return <FallbackAuthProvider>{children}</FallbackAuthProvider>;
  }

  return <ConfiguredAuthProvider>{children}</ConfiguredAuthProvider>;
}

function ConfiguredAuthProvider({ children }: { children: React.ReactNode }) {
  const { orgRole } = useClerkAuth();
  const { user, isLoaded: isClerkLoaded, isSignedIn } = useUser();
  const { signOut: clerkSignOut } = useClerk();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
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

  const fetchProfile = useCallback(
    async (userId: string) => {
      if (!supabase) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        // Profile might not exist yet if webhook hasn't fired
        if (error.code === "PGRST116") {
          console.log("Profile not found, it may be created shortly via webhook");
          return null;
        }
        console.error("Error fetching profile:", error);
        return null;
      }

      return data as Profile;
    },
    [supabase]
  );

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      const profileData = await fetchProfile(user.id);
      setProfile(profileData);
    }
  }, [user?.id, fetchProfile]);

  useEffect(() => {
    if (!isClerkLoaded) return;

    const loadProfile = async () => {
      setProfileLoading(true);
      if (isSignedIn && user?.id) {
        const profileData = await fetchProfile(user.id);
        setProfile(profileData);
      } else {
        setProfile(null);
      }
      setProfileLoading(false);
    };

    void loadProfile();
  }, [isClerkLoaded, isSignedIn, user?.id, fetchProfile]);

  useEffect(() => {
    if (!isSignedIn || !user?.id) return;

    const updateStatus = async () => {
      try {
        await fetch("/api/users/status", { method: "POST" });
      } catch (error) {
        console.error("Error updating status:", error);
      }
    };

    void updateStatus();
    const interval = setInterval(updateStatus, 30000);

    return () => clearInterval(interval);
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
          setProfile(payload.new as Profile);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isSignedIn, supabase, user?.id]);

  const signOut = async () => {
    await clerkSignOut();
    setProfile(null);
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
    isShura: resolvedRole === "shura" || resolvedRole === "admin" || resolvedRole === "super_admin",
    isImam: resolvedRole === "imam" || hasRoleOrHigher(resolvedRole ?? "member", "imam"),
    isMember: Boolean(profile),
    hasRole,
    canAccess,
    isSignedIn: isSignedIn ?? false,
    resolvedRole,
  };

  if (supabaseError) {
    return (
      <AuthContext.Provider value={value}>
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center max-w-md">
            <h2 className="text-lg font-semibold text-destructive mb-2">Configuration Error</h2>
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
    refreshProfile: async () => {},
    isSuperAdmin: false,
    isAdmin: false,
    isShura: false,
    isImam: false,
    isMember: false,
    hasRole: () => false,
    canAccess: () => false,
    isSignedIn: false,
    resolvedRole: null,
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
