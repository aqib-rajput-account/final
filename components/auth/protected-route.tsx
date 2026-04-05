"use client";

import { useAuth, type UserRole, canAccessRoute, hasPermission } from "@/lib/auth";
import { usePathname, useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldAlert, LogIn, Home } from "lucide-react";
import Link from "next/link";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: UserRole[];
  requiredPermission?: string;
  fallback?: React.ReactNode;
}

/**
 * ProtectedRoute component wraps content that requires specific roles or permissions
 * - If not signed in, shows sign-in prompt
 * - If signed in but no profile, shows loading
 * - If signed in but unauthorized, shows unauthorized message
 * - If authorized, shows children
 */
export function ProtectedRoute({
  children,
  requiredRoles,
  requiredPermission,
  fallback,
}: ProtectedRouteProps) {
  const { isSignedIn, profile, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  // Show loading state while auth is being determined
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center space-y-4">
          <Spinner className="h-8 w-8 mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Not signed in
  if (!isSignedIn) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <LogIn className="h-6 w-6 text-muted-foreground" />
            </div>
            <CardTitle>Sign in required</CardTitle>
            <CardDescription>
              You need to sign in to access this page
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link href={`/sign-in?redirect_url=${encodeURIComponent(pathname)}`}>
              <Button className="w-full">
                Sign in
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" className="w-full">
                <Home className="mr-2 h-4 w-4" />
                Go to homepage
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Signed in but no profile yet (might be loading from webhook)
  if (!profile) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center space-y-4">
          <Spinner className="h-8 w-8 mx-auto" />
          <p className="text-muted-foreground">Setting up your profile...</p>
        </div>
      </div>
    );
  }

  // Check role-based access
  const userRole = profile.role;
  let isAuthorized = true;

  if (requiredRoles && requiredRoles.length > 0) {
    // Super admin always has access
    if (userRole === "super_admin") {
      isAuthorized = true;
    } else {
      isAuthorized = requiredRoles.includes(userRole);
    }
  }

  // Check permission-based access
  if (isAuthorized && requiredPermission) {
    isAuthorized = hasPermission(userRole, requiredPermission);
  }

  // Check route-based access
  if (isAuthorized) {
    isAuthorized = canAccessRoute(userRole, pathname);
  }

  // Not authorized
  if (!isAuthorized) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="flex min-h-[60vh] items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <ShieldAlert className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>Access denied</CardTitle>
            <CardDescription>
              You don&apos;t have permission to access this page
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-sm text-muted-foreground">
              Your current role is <span className="font-medium">{userRole}</span>.
              {requiredRoles && requiredRoles.length > 0 && (
                <> This page requires one of the following roles: {requiredRoles.join(", ")}.</>
              )}
            </p>
            <Button variant="outline" className="w-full" onClick={() => router.back()}>
              Go back
            </Button>
            <Link href="/">
              <Button variant="ghost" className="w-full">
                <Home className="mr-2 h-4 w-4" />
                Go to homepage
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Higher-order component for protecting pages
 */
export function withProtectedRoute<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options?: {
    requiredRoles?: UserRole[];
    requiredPermission?: string;
  }
) {
  return function ProtectedPage(props: P) {
    return (
      <ProtectedRoute
        requiredRoles={options?.requiredRoles}
        requiredPermission={options?.requiredPermission}
      >
        <WrappedComponent {...props} />
      </ProtectedRoute>
    );
  };
}
