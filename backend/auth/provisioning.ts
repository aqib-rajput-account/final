import { clerkClient } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import {
  evaluateProfileCompletion,
  getExplicitClerkFullName,
  getGeneratedProfilePlaceholderName,
  isGeneratedProfileName,
  normalizeFullName,
} from "@/lib/auth/profile-completion";

export const DEFAULT_ORG_NAME = "MasjidConnect";
export const DEFAULT_ORG_SLUG = "masjidconnect";
export const DEFAULT_ORG_ROLE = "org:member";

export type ProvisionedProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  phone: string | null;
  bio: string | null;
  role: string;
  mosque_id: string | null;
  is_verified: boolean;
  is_active: boolean;
  verification_attempts: number;
  created_at: string;
  updated_at: string;
};

export type ProvisioningResult = {
  profile: ProvisionedProfile;
  suggestedUsername: string | null;
  needsOnboarding: boolean;
  defaultOrgName: string;
  orgRole: string;
};

type ExistingProfileRow = Partial<ProvisionedProfile> & {
  id: string;
};

type ClerkEmailAddress = {
  id?: string | null;
  emailAddress?: string | null;
  verification?: {
    status?: string | null;
  } | null;
};

type ClerkPhoneNumber = {
  id?: string | null;
  phoneNumber?: string | null;
  verification?: {
    status?: string | null;
  } | null;
};

type ClerkUserLike = {
  id: string;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  imageUrl?: string | null;
  primaryEmailAddressId?: string | null;
  primaryPhoneNumberId?: string | null;
  emailAddresses?: ClerkEmailAddress[] | null;
  phoneNumbers?: ClerkPhoneNumber[] | null;
};

type OrganizationMembershipLike = {
  role?: string | null;
  organization?: {
    id?: string | null;
  } | null;
};

export class ProvisioningError extends Error {
  status: number;
  suggestedUsername: string | null;

  constructor(message: string, status = 500, suggestedUsername: string | null = null) {
    super(message);
    this.name = "ProvisioningError";
    this.status = status;
    this.suggestedUsername = suggestedUsername;
  }
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function pickPrimaryItem<T extends { id?: string | null }>(
  items: T[] | null | undefined,
  primaryId: string | null | undefined
) {
  if (!items || items.length === 0) {
    return null;
  }

  if (primaryId) {
    const primary = items.find((item) => item.id === primaryId);
    if (primary) {
      return primary;
    }
  }

  return items[0] ?? null;
}

function normalizeUsername(input: string | null | undefined) {
  const normalized = (input ?? "")
    .trim()
    .replace(/^@+/, "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "")
    .replace(/[^a-z0-9._-]+/g, "_")
    .replace(/[._-]{2,}/g, "_")
    .replace(/^[._-]+|[._-]+$/g, "")
    .slice(0, 32);

  return normalized;
}

function deriveClerkDefaults(clerkUser: ClerkUserLike) {
  const primaryEmail = pickPrimaryItem(clerkUser.emailAddresses, clerkUser.primaryEmailAddressId);
  const primaryPhone = pickPrimaryItem(clerkUser.phoneNumbers, clerkUser.primaryPhoneNumberId);
  const email = primaryEmail?.emailAddress?.trim() || null;
  const identity = {
    firstName: clerkUser.firstName ?? null,
    lastName: clerkUser.lastName ?? null,
    fullName: clerkUser.fullName ?? null,
    primaryEmailAddress: email,
  };
  const explicitFullName = getExplicitClerkFullName(identity);
  const generatedFullName = getGeneratedProfilePlaceholderName(identity);
  const emailLocalPart = email?.split("@")[0] ?? null;
  const fullName = explicitFullName ?? generatedFullName ?? null;
  const usernameSeed =
    normalizeUsername(clerkUser.username) ||
    normalizeUsername(fullName?.replace(/\s+/g, "_")) ||
    normalizeUsername(emailLocalPart) ||
    "member";
  const isVerified =
    primaryEmail?.verification?.status === "verified" ||
    primaryPhone?.verification?.status === "verified";

  return {
    email,
    fullName,
    explicitFullName,
    generatedFullName,
    avatarUrl: clerkUser.imageUrl?.trim() || null,
    phone: primaryPhone?.phoneNumber?.trim() || null,
    isVerified,
    usernameSeed,
  };
}

function isKnownRole(role: unknown): role is ProvisionedProfile["role"] {
  return role === "super_admin" || role === "admin" || role === "shura" || role === "imam" || role === "member";
}

async function isUsernameAvailable(supabase: ReturnType<typeof createSupabaseAdmin>, username: string, userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .ilike("username", username)
    .neq("id", userId)
    .limit(1);

  if (error) {
    throw new ProvisioningError(`Failed to validate username availability: ${error.message}`);
  }

  return (data?.length ?? 0) === 0;
}

async function getUniqueUsernameSuggestion(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  seed: string,
  userId: string
) {
  const base = normalizeUsername(seed) || "member";

  if (await isUsernameAvailable(supabase, base, userId)) {
    return base;
  }

  for (let suffix = 2; suffix < 10_000; suffix += 1) {
    const candidate = normalizeUsername(`${base}_${suffix}`);
    if (!candidate) {
      continue;
    }

    if (await isUsernameAvailable(supabase, candidate, userId)) {
      return candidate;
    }
  }

  throw new ProvisioningError("Unable to find an available username suggestion");
}

async function resolveRequestedUsername(args: {
  supabase: ReturnType<typeof createSupabaseAdmin>;
  userId: string;
  requestedUsername?: string | null;
  suggestedUsername: string;
}) {
  if (!isNonEmptyString(args.requestedUsername)) {
    return null;
  }

  const normalized = normalizeUsername(args.requestedUsername);
  if (normalized.length < 3) {
    throw new ProvisioningError(
      "Username must be at least 3 characters and use letters, numbers, dots, underscores, or dashes.",
      400,
      args.suggestedUsername
    );
  }

  if (!(await isUsernameAvailable(args.supabase, normalized, args.userId))) {
    const nextSuggestion = await getUniqueUsernameSuggestion(args.supabase, normalized, args.userId);
    throw new ProvisioningError("That username is already taken.", 409, nextSuggestion);
  }

  return normalized;
}

function isClerkNotFoundError(error: unknown) {
  const candidate = error as { status?: number; errors?: Array<{ code?: string }> } | null;
  return candidate?.status === 404 || candidate?.errors?.some((issue) => issue.code === "resource_not_found");
}

function isClerkConflictError(error: unknown) {
  const candidate = error as { status?: number; errors?: Array<{ code?: string }> } | null;
  return candidate?.status === 409 || candidate?.errors?.some((issue) => issue.code === "slug_taken");
}

async function ensureDefaultOrganization(clerk: Awaited<ReturnType<typeof clerkClient>>, userId: string) {
  let createdOrganization = false;
  let organization: { id: string; name?: string | null } | null = null;

  try {
    organization = await clerk.organizations.getOrganization({ slug: DEFAULT_ORG_SLUG });
  } catch (error) {
    if (!isClerkNotFoundError(error)) {
      throw error;
    }
  }

  if (!organization) {
    try {
      organization = await clerk.organizations.createOrganization({
        name: DEFAULT_ORG_NAME,
        slug: DEFAULT_ORG_SLUG,
        createdBy: userId,
      });
      createdOrganization = true;
    } catch (error) {
      if (!isClerkConflictError(error)) {
        throw error;
      }
      organization = await clerk.organizations.getOrganization({ slug: DEFAULT_ORG_SLUG });
    }
  }

  if (!organization) {
    throw new ProvisioningError("Failed to resolve the default Clerk organization.");
  }

  const memberships = await clerk.users.getOrganizationMembershipList({ userId, limit: 100 });
  const membershipList = Array.isArray(memberships.data)
    ? (memberships.data as OrganizationMembershipLike[])
    : [];
  let membership = membershipList.find(
    (candidate) => candidate.organization?.id === organization.id
  ) as OrganizationMembershipLike | undefined;

  if (!membership) {
    membership = await clerk.organizations.createOrganizationMembership({
      organizationId: organization.id,
      userId,
      role: DEFAULT_ORG_ROLE,
    });
  } else if (createdOrganization && membership.role !== DEFAULT_ORG_ROLE) {
    membership = await clerk.organizations.updateOrganizationMembership({
      organizationId: organization.id,
      userId,
      role: DEFAULT_ORG_ROLE,
    });
  }

  if (!membership) {
    throw new ProvisioningError("Failed to ensure Clerk organization membership.");
  }

  return {
    organizationName: organization.name || DEFAULT_ORG_NAME,
    orgRole: membership.role || DEFAULT_ORG_ROLE,
  };
}

export async function provisionMemberAccount(args: {
  userId: string;
  username?: string | null;
  fullName?: string | null;
  mosqueId?: string | null;
  role?: string | null;
}) {
  const supabase = createSupabaseAdmin();
  const clerk = await clerkClient();

  // 1. Fetch Clerk User with Resilience
  let clerkUser: ClerkUserLike;
  try {
    clerkUser = (await clerk.users.getUser(args.userId)) as ClerkUserLike;
  } catch (error) {
    console.error("Clerk user fetch failed in provisioning:", error);
    // If we can't fetch the user from Clerk, we can't reliably provision.
    // However, if we're hitting a 403 or network issue, an Internal Server Error is better than a crash.
    throw new ProvisioningError(
      "Our identity service is temporarily unavailable. Please try again in a few moments.",
      503
    );
  }

  const defaults = deriveClerkDefaults(clerkUser);

  // 1.5. Seamless OAuth Linking Fix:
  // If the email is not verified in Clerk, mark it as verified via the Admin API.
  // This prevents Clerk from sending verification/linking emails that hit the 100-email development limit.
  const primaryEmail = clerkUser.emailAddresses?.find(e => e.id === clerkUser.primaryEmailAddressId);
  if (primaryEmail && primaryEmail.verification?.status !== "verified") {
    try {
      await clerk.emailAddresses.updateEmailAddress(primaryEmail.id!, {
        verified: true,
      });
      console.log(`Manually verified Clerk email for user ${args.userId} to avoid quota issues.`);
    } catch (err) {
      console.warn("Failed to manually verify Clerk email (non-blocking):", err);
    }
  }

  // 2. Fetch Existing Profile
  const { data: existingProfile, error: existingProfileError } = await supabase
    .from("profiles")
    .select(
      "id, email, full_name, username, avatar_url, phone, bio, role, mosque_id, is_verified, is_active, verification_attempts, locale, metadata, created_at, updated_at"
    )
    .eq("id", args.userId)
    .maybeSingle();

  if (existingProfileError) {
    throw new ProvisioningError(`Failed to load profile: ${existingProfileError.message}`);
  }

  const profile = existingProfile as ExistingProfileRow | null;
  const suggestedUsername = await getUniqueUsernameSuggestion(
    supabase,
    profile?.username || defaults.usernameSeed,
    args.userId
  );
  const requestedUsername = await resolveRequestedUsername({
    supabase,
    userId: args.userId,
    requestedUsername: args.username ?? null,
    suggestedUsername,
  });
  const requestedFullName = normalizeFullName(args.fullName ?? null);
  const existingFullName = normalizeFullName(profile?.full_name ?? null);
  const clerkIdentity = {
    firstName: clerkUser.firstName ?? null,
    lastName: clerkUser.lastName ?? null,
    fullName: clerkUser.fullName ?? null,
    primaryEmailAddress: defaults.email,
  };
  const existingNameIsGenerated = isGeneratedProfileName(existingFullName, clerkIdentity);
  const resolvedFullName =
    requestedFullName ??
    (existingFullName && !existingNameIsGenerated
      ? existingFullName
      : defaults.explicitFullName ?? existingFullName ?? defaults.generatedFullName ?? null);

  // 3. Prepare Payload
  const requestedRole = args.role && isKnownRole(args.role) ? args.role : null;
  const resolvedRole = requestedRole ?? (isKnownRole(profile?.role) ? profile.role : "member");
  
  const nextProfilePayload = {
    id: args.userId,
    email: defaults.email ?? profile?.email ?? null,
    full_name: resolvedFullName,
    username:
      requestedUsername ??
      (isNonEmptyString(profile?.username) ? profile.username.trim() : null) ??
      null,
    avatar_url:
      (isNonEmptyString(profile?.avatar_url) ? profile.avatar_url.trim() : null) ??
      defaults.avatarUrl ??
      null,
    phone:
      (isNonEmptyString(profile?.phone) ? profile.phone.trim() : null) ??
      defaults.phone ??
      null,
    mosque_id: args.mosqueId ?? profile?.mosque_id ?? null,
    role: resolvedRole,
    // For Sign-up v2: Decouple app verification from Clerk verification for Email/Password users.
    // OAuth (Google) users stay verified. Email/Password users must verify via the profile page.
    is_verified: profile?.is_verified ?? (clerkUser.emailAddresses?.some(e => e.verification?.status === "verified" && !e.emailAddress?.includes("google.com")) ? false : defaults.isVerified),
    is_active: typeof profile?.is_active === "boolean" ? profile.is_active : true,
    verification_attempts: profile?.verification_attempts ?? 0,
    updated_at: new Date().toISOString(),
  };

  // 3.5. Duplicate Management (Non-Blocking)
  // If we have an email, deactivate any other accounts that share it to prevent UI duplicates.
  // This is critical for local testing environments where webhooks may not be running.
  if (nextProfilePayload.email) {
    supabase
      .from("profiles")
      .update({ is_active: false })
      .eq("email", nextProfilePayload.email)
      .neq("id", args.userId)
      .then(({ error }) => {
        if (error) {
          console.warn("Failed to deactivate duplicate profiles:", error);
        }
      });
  }

  // 4. Perform Upsert
  const { data: provisionedProfile, error: upsertError } = await supabase
    .from("profiles")
    .upsert(nextProfilePayload, { onConflict: "id" })
    .select(
      "id, email, full_name, username, avatar_url, phone, bio, role, mosque_id, is_verified, is_active, verification_attempts, locale, metadata, created_at, updated_at"
    )
    .single();

  if (upsertError || !provisionedProfile) {
    if (upsertError?.code === "23505") {
      throw new ProvisioningError("That username is already taken.", 409, suggestedUsername);
    }

    throw new ProvisioningError(upsertError?.message || "Failed to provision profile");
  }

  // 5. Assign Organization (Non-Blocking)
  let organizationInfo = {
    organizationName: DEFAULT_ORG_NAME,
    orgRole: DEFAULT_ORG_ROLE,
  };

  try {
    organizationInfo = await ensureDefaultOrganization(clerk, args.userId);
  } catch (error) {
    console.warn("Failed to assign default organization (non-blocking):", error);
  }

  const normalizedProfile = provisionedProfile as ProvisionedProfile;
  const completion = evaluateProfileCompletion(
    {
      fullName: normalizedProfile.full_name,
      username: normalizedProfile.username,
    },
    clerkIdentity
  );

  return {
    profile: normalizedProfile,
    suggestedUsername: isNonEmptyString(normalizedProfile.username)
      ? normalizedProfile.username
      : suggestedUsername,
    needsOnboarding: completion.needsOnboarding,
    defaultOrgName: organizationInfo.organizationName,
    orgRole: organizationInfo.orgRole,
  } satisfies ProvisioningResult;
}

export async function ensureUserProfileExists(userId: string) {
  const supabase = createSupabaseAdmin();

  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new ProvisioningError(`Failed to verify profile: ${error.message}`);
  }

  if (data?.id) {
    return;
  }

  // Self-heal: Provision if missing
  await provisionMemberAccount({ userId });
  return userId;
}

export function normalizeOnboardingUsername(input: string | null | undefined) {
  return normalizeUsername(input);
}
