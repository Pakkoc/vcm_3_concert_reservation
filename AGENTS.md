# Repository Guidelines

## Project Structure & Module Organization
Source lives under `src/`. Routes and UI sit in `src/app` (all components must start with the `"use client"` directive), domain logic in `src/features/*`, and cross-cutting utilities in `src/lib`, `src/hooks`, and `src/constants`. Backend Hono handlers reside in `src/backend`, with the entry wired through `src/app/api/[[...hono]]/route.ts` and every route prefixed with `/api`. Shared UI primitives are in `src/components/ui`. Persisted assets live in `public/`. Documents and design artifacts are tracked under `docs/`. Supabase migrations stay in `supabase/migrations`, using numeric prefixes (e.g., `0001_*.sql`).

## Build, Test, and Development Commands
- `npm run dev`: Launches the Next.js dev server with Turbopack.
- `npm run build`: Produces the production bundle.
- `npm run start`: Runs the compiled server output.
- `npm run lint`: Executes ESLint against the full project.
No dedicated test runner is configured yet; add one per feature need and document the script when introduced.

## Coding Style & Naming Conventions
Stick to TypeScript throughout. Follow ESLint (`next/core-web-vitals`) and Tailwind CSS utility styling; rely on class composition helpers (`clsx`, `class-variance-authority`) instead of bespoke CSS. Promise-based route params are required in every `page.tsx`. Use descriptive PascalCase for components, camelCase for functions/variables, and SCREAMING_SNAKE_CASE for constants. HTTP hooks should call the shared client in `@/lib/remote/api-client`. Placeholder imagery must come from valid `picsum.photos` URLs. Prefer early returns and keep functions pure and composable.

## Testing Guidelines
Until a runner is added, treat linting and type-checking as the baseline gate. When introducing automated tests, colocate them next to the feature (`src/features/<name>/__tests__`) and favor React Testing Library with Vitest or Jest. Cover critical service paths, Supabase integrations, and edge-case date logic. Record the command (e.g., `npm run test`) in `package.json` once available.

## Commit & Pull Request Guidelines
Follow the existing conventional shorthand (`type:subject`) seen in history, such as `docs:plan` or `chore(supabase): ...`. Use present tense, keep subjects under 50 characters, and group related changes per commit. PRs should summarize scope, list key routes or components touched, reference Supabase migrations, and include local verification notes (dev server, lint, prospective tests). Attach screenshots or clips for UI updates and link relevant issues or specs.
