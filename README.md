# TimeBookt

TimeBookt is a modular appointment OS for AI-assisted service businesses. It ships with a Next.js 14 App Router frontend, Supabase-backed domain modules, AI agent hooks, and a ready-to-clone multi-tenant architecture for launching per city or country.

## Architecture

- **App Router + Server Actions** connect feature folders under `src/features` directly to Supabase-backed domain modules for zero-latency actions.
- **Domain modules** (`src/domain/*`) provide strongly typed actions + DTOs around businesses, customers, appointments, services, and templates.
- **Agent hooks** (`src/agents/hooks/*`) expose deterministic I/O contracts so multi-agent systems can trigger domain actions without UI coupling.
- **API routes** (`src/app/api/*`) mirror the domain boundaries for REST or webhook integrations.
- **Supabase schema & types** live under `/supabase` and can be cloned per region along with environment overrides.

```
src/
├─ agents/hooks               # AI orchestration layer
├─ app                        # Next.js routes (home, onboarding, dashboard, booking, APIs)
├─ domain                     # DDD-style modules w/ actions + types
├─ features                   # UI + server action bundles per feature
├─ lib                        # cross-cutting env, constants, supabase clients
└─ types (via supabase/types) # generated DB contracts
```

## Regional replication

1. Duplicate the Supabase project and run `supabase/schema.sql` to seed tables + policies.
2. Copy `.env.example` to `.env.local` and set:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_TIMEBOOKT_REGION` (e.g. `nyc`, `ldn`).
3. Run `npm install && npm run dev`.
4. Seed business/services rows for the new region; hooks + routes automatically scope queries via the slug/region values.

Each deployment keeps the same codebase—only Supabase credentials + region env values change.

## AI agent connectivity

- Multi-agent systems call `src/agents/hooks/*` to perform deterministic tasks (e.g., `createCustomerAgentHook`).
- `/api/ai/concierge` provides a simple HTTP surface that forwards actions to those hooks.
- `src/lib/ai/aiService.ts` centralizes routing so you can plug in your orchestration framework (CrewAI, LangGraph, etc.).
- Agents can coordinate with templates, customers, and appointments without touching UI code because each domain exposes typed payloads + responses.

## Development

```bash
npm install
npm run dev
```

Key routes:

- `/` marketing home with hero + agent showcase.
- `/onboarding` business intake flow.
- `/dashboard?business=your-slug` admin metrics + upcoming appointments.
- `/[businessSlug]/book` customer booking portal.
- `/api/*` domain-aligned REST endpoints (businesses, appointments, templates, AI concierge).

## Testing the scaffold

1. Set env vars + run dev server.
2. Use the onboarding form to create a business (writes to Supabase).
3. Hit `/api/businesses` or `/api/ai/concierge` to observe domain + agent layers working together.
