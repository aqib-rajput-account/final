# Project Structure

## Goals

- Keep route files small and focused on composition.
- Keep reusable UI separate from feature-specific UI.
- Give shared logic one canonical home so we do not create duplicate helpers.
- Preserve backward compatibility while the codebase migrates to the cleaner structure.

## Canonical Folders

### `app/`

- App Router pages, layouts, and route handlers only.
- Avoid placing large reusable components or business logic here.

### `components/auth`

- Auth-gated UI wrappers and auth-specific UX states.
- Example: protected routes, auth unavailable states.

### `components/layout`

- Global site chrome and layout-level building blocks.
- Example: header, footer.

### `components/providers`

- Application-wide React providers.
- Example: theme provider, auth provider composition.

### `components/ui`

- Shared design-system primitives.
- Keep these generic and reusable across features.

### `components/<feature>`

- Feature-specific view components that are reused by pages.
- Current examples: `community`, `events`, `feed`, `messages`, `mosques`, `prayer-times`.

### `hooks/`

- Shared client-side hooks that can be consumed across features.
- Avoid duplicating hooks inside `components/ui`.

### `lib/auth`

- Role definitions, auth context, permission helpers, and access logic.

### `lib/config`

- Runtime config and environment guards.

### `lib/data`

- Mock data, seeded data helpers, and non-production datasets.

### `lib/stores`

- Zustand stores and store-adjacent helpers.

### `lib/supabase`

- Server/client Supabase setup and utilities.

## Import Rules

- Prefer folder-level canonical imports:
  - `@/components/layout`
  - `@/components/providers`
  - `@/lib/auth`
  - `@/lib/config`
  - `@/lib/data`
  - `@/lib/stores`
- Root shim files like `components/header.tsx` and `lib/auth-context.tsx` are transitional. Do not use them for new code.

## API Route Guidance

- Use the shortest canonical route that matches the resource.
- Keep compatibility aliases thin by re-exporting the canonical handler instead of copy-pasting the implementation.
- Current canonical endpoints:
  - `/api/feed/posts`
  - `/api/users/community`
  - `/api/users/online`
  - `/api/users/status`

## Migration Notes

- The repo still contains a few compatibility shims to avoid breaking imports while the structure is cleaned up.
- When editing a file, prefer updating it to the canonical import path rather than adding new references to a shim.
