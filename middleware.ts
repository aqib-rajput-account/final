import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { canAccessAdminPanel, canAccessShuraPanel, normalizeClerkRole } from "@/lib/auth/clerk-rbac";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
  "/about",
  "/contact",
  "/mosques",
  "/mosques/(.*)",
  "/events",
  "/events/(.*)",
  "/prayer-times",
]);

const isAdminRoute = createRouteMatcher(["/admin(.*)"]);
const isShuraRoute = createRouteMatcher(["/shura(.*)"]);

const clerkProxy = clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }

  const { orgRole } = await auth();
  const role = normalizeClerkRole(orgRole);
  const hasOrgRole = Boolean(orgRole);

  // If organization roles are not configured on this session,
  // skip strict route RBAC here and let app-level profile guards handle access.
  if (!hasOrgRole) {
    return NextResponse.next();
  }

  if (isAdminRoute(request) && !canAccessAdminPanel(role)) {
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }

  if (isShuraRoute(request) && !canAccessShuraPanel(role)) {
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }
});

const hasClerkConfig = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY
);

export default hasClerkConfig
  ? clerkProxy
  : function proxy() {
      return NextResponse.next();
    };

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
