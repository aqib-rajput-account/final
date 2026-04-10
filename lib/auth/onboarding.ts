export const ONBOARDING_ROUTE = "/onboarding";

const PUBLIC_EXACT_PATHS = new Set([
  "/",
  "/about",
  "/contact",
  "/mosques",
  "/events",
  "/prayer-times",
]);

const PUBLIC_PREFIXES = ["/sign-in", "/sign-up", "/mosques/", "/events/"];

export function isPublicAppPath(pathname: string) {
  if (PUBLIC_EXACT_PATHS.has(pathname)) {
    return true;
  }

  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function shouldBypassOnboarding(pathname: string) {
  return pathname === ONBOARDING_ROUTE || isPublicAppPath(pathname);
}

export function sanitizeRedirectPath(redirectPath: string | null | undefined, fallback = "/feed") {
  if (!redirectPath) {
    return fallback;
  }

  if (!redirectPath.startsWith("/") || redirectPath.startsWith("//")) {
    return fallback;
  }

  return redirectPath;
}

export function buildOnboardingRedirect(redirectPath: string | null | undefined) {
  const safeRedirect = sanitizeRedirectPath(redirectPath, "/feed");
  return `${ONBOARDING_ROUTE}?redirect_url=${encodeURIComponent(safeRedirect)}`;
}
