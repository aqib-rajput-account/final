# MosqueConnect

MosqueConnect is a Next.js 16 application for mosque discovery, community updates, messaging, events, and role-based management workflows.

## Stack

- Next.js App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Clerk authentication
- Supabase data and realtime
- Zustand stores

## Project Structure

The app now follows a clearer separation of concerns:

```text
app/                  Route segments, layouts, and API handlers
components/
  auth/               Auth-only UI wrappers like protected routes
  layout/             Header, footer, and shared site chrome
  providers/          App-level providers
  ui/                 Reusable design-system primitives
  <feature>/          Feature-specific presentational components
hooks/                Reusable client hooks
lib/
  auth/               Auth context, roles, and permission utilities
  config/             Environment and runtime checks
  data/               Mock/demo datasets and data helpers
  stores/             Zustand stores and derived store helpers
  supabase/           Supabase client/server setup
  types.ts            Shared domain types
scripts/              SQL and operational scripts
supabase/             Supabase local config/assets
docs/                 Architecture and project conventions
```

## Conventions

- Keep `app/` focused on routing and page composition.
- Put shared chrome in `components/layout`.
- Put app-wide context/providers in `components/providers`.
- Put business rules and access control in `lib/auth`.
- Put mock/demo datasets in `lib/data`.
- Put state containers in `lib/stores`.
- Prefer canonical imports from the new folders. Root-level shim files exist only for backward compatibility during migration.
- Use the canonical API routes:
  - `/api/feed/posts`
  - `/api/users/community`
  - `/api/users/online`
  - `/api/users/status`

## Development

```bash
pnpm install
pnpm dev
pnpm exec tsc --noEmit
pnpm build
```

## Docs

- [Project Structure](./docs/PROJECT_STRUCTURE.md)
