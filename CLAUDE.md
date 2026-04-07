# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server on http://localhost:3000
npm run build    # Production build
npm run lint     # ESLint via next lint
```

No test runner is configured yet.

## Environment Setup

Copy `.env.local.example` to `.env.local` and fill in your Supabase project values:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Architecture

This is a **Next.js 14 App Router** application for restaurant cost management (Hebrew UI, Israeli market — default currency ILS, VAT 17%, kosher tracking).

### Supabase Integration

Two Supabase client factories live in `src/lib/supabase/`:
- `client.ts` — browser client (use in Client Components)
- `server.ts` — server client using `next/headers` cookies (use in Server Components and Route Handlers)

Always import from these files rather than calling `@supabase/ssr` directly. Both are typed via `src/types/database.ts`.

### Data Model (`src/types/database.ts` + `supabase/migrations/`)

- **restaurants** — owned by an auth user (`owner_id`). Holds per-restaurant config: `kosher_enabled`, `vat_rate`, `default_margin_target`, `currency`.
- **ingredients** — scoped to a restaurant. Fields: `name_he` (Hebrew name), `unit` (kg/g/l/ml/unit), `cost_per_unit`, `kosher_type` (meat/dairy/pareve), `supplier`.

All tables have Row Level Security enforced at the DB level: users can only access rows belonging to their own restaurant. RLS is the sole auth boundary — do not replicate it in application code.

Database migrations are in `supabase/migrations/`. Apply them via the Supabase CLI (`supabase db push`) or the Supabase dashboard.

### Styling

Tailwind CSS with default config. Global styles in `src/app/globals.css`. Fonts: Geist Sans + Geist Mono loaded via `next/font` in `src/app/layout.tsx`.
