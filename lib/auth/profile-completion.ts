export type ProfileCompletionClerkUser = {
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  primaryEmailAddress?: string | null;
};

export type ProfileCompletionInput = {
  fullName?: string | null;
  username?: string | null;
};

export type ProfileCompletionEvaluation = {
  fullName: string | null;
  username: string | null;
  explicitClerkName: string | null;
  generatedPlaceholderName: string | null;
  isMissingFullName: boolean;
  isMissingUsername: boolean;
  isGeneratedPlaceholderName: boolean;
  needsOnboarding: boolean;
};

function collapseWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeForComparison(value: string | null) {
  return value?.toLocaleLowerCase() ?? null;
}

export function isNonEmptyText(value: unknown): value is string {
  return typeof value === "string" && collapseWhitespace(value).length > 0;
}

export function normalizeFullName(value: string | null | undefined) {
  if (!isNonEmptyText(value)) {
    return null;
  }

  return collapseWhitespace(value);
}

export function normalizeUsernameValue(value: string | null | undefined) {
  if (!isNonEmptyText(value)) {
    return null;
  }

  return collapseWhitespace(value);
}

export function humanizeIdentifier(value: string | null | undefined) {
  if (!isNonEmptyText(value)) {
    return null;
  }

  const collapsed = collapseWhitespace(value)
    .replace(/@.*$/, "")
    .replace(/[._-]+/g, " ");

  if (!collapsed) {
    return null;
  }

  return collapsed
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getExplicitClerkFullName(user: ProfileCompletionClerkUser | null | undefined) {
  if (!user) {
    return null;
  }

  const firstAndLast = [user.firstName, user.lastName]
    .filter(isNonEmptyText)
    .join(" ");

  return normalizeFullName(firstAndLast) ?? normalizeFullName(user.fullName);
}

export function getGeneratedProfilePlaceholderName(
  user: ProfileCompletionClerkUser | null | undefined
) {
  const emailLocalPart = user?.primaryEmailAddress?.split("@")[0] ?? null;
  return humanizeIdentifier(emailLocalPart);
}

export function isGeneratedProfileName(
  fullName: string | null | undefined,
  user: ProfileCompletionClerkUser | null | undefined
) {
  const normalizedFullName = normalizeFullName(fullName);
  if (!normalizedFullName) {
    return false;
  }

  if (getExplicitClerkFullName(user)) {
    return false;
  }

  const generatedPlaceholderName = getGeneratedProfilePlaceholderName(user);
  if (!generatedPlaceholderName) {
    return false;
  }

  return (
    normalizeForComparison(normalizedFullName) ===
    normalizeForComparison(generatedPlaceholderName)
  );
}

export function evaluateProfileCompletion(
  input: ProfileCompletionInput,
  clerkUser?: ProfileCompletionClerkUser | null
): ProfileCompletionEvaluation {
  const fullName = normalizeFullName(input.fullName);
  const username = normalizeUsernameValue(input.username);
  const explicitClerkName = getExplicitClerkFullName(clerkUser);
  const generatedPlaceholderName = getGeneratedProfilePlaceholderName(clerkUser);
  const isMissingFullName = !fullName;
  const isMissingUsername = !username;
  const isGeneratedPlaceholderName = isGeneratedProfileName(fullName, clerkUser);

  return {
    fullName,
    username,
    explicitClerkName,
    generatedPlaceholderName,
    isMissingFullName,
    isMissingUsername,
    isGeneratedPlaceholderName,
    needsOnboarding:
      isMissingFullName || isMissingUsername || isGeneratedPlaceholderName,
  };
}
