# TimeBookt v2

TimeBookt v2 is a region-ready booking OS built with Next.js 14 App Router, Supabase, and domain-driven modules. Every feature (home, onboarding, dashboard, booking) is isolated under `src/features`, while `src/domain` encapsulates typed actions. Agent integrations call the system through deterministic hooks and the new `agentRouter` so multi-agent orchestration stays stable across regions.

## Tech Stack
- Next.js 14 App Router + TypeScript + Server Actions
- Supabase (auth ready) with region-aware schema (`region_code` on every tenant table)
- Tailwind via `globals.css`
- Domain-driven modules (`src/domain/*`) with typed DTOs and Supabase adapters
- Agent hooks + router (`src/agents/**/*`) exposing typed IO contracts

## Environment & Region Setup
1. Copy `.env.example` to `.env.local`.
2. Populate:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   NEXT_PUBLIC_TIMEBOOKT_REGION=nyc   # required region identifier
   NEXT_PUBLIC_TIMEBOOKT_MODE=landing # landing | app
   ```
3. Run `npm install` (already done for dependencies in `package-lock.json`).
4. Start dev server with `npm run dev`.

`REGION` (exported from `src/lib/env.ts`) is referenced by every domain query, so each deployment automatically scopes Supabase reads/writes with `.eq("region_code", REGION)`.

> **Important:** After pulling this version, run `supabase/schema.sql` (or execute the new migrations inside Supabase) so each table includes the `region_code` column and supporting indexes/policies. If you see errors mentioning `column ... region_code` during development, your database has not been upgraded yet.

### Product Gate Modes

Set `NEXT_PUBLIC_TIMEBOOKT_MODE=landing` in production to keep `/onboarding` and `/dashboard/*` behind the waitlist. The middleware (`src/middleware.ts`) redirects protected routes to `/`, and the home page serves the public landing component. Switching to `app` instantly reveals the full experience without another deploy.

## Database Schema
- Run `supabase/schema.sql` to create tables + RLS policies (all tenant tables include `region_code text not null`).
- Generate typed client bindings from `supabase/types.ts` if you refresh the schema.
- `create index if not exists businesses_slug_region_idx on public.businesses (slug, region_code);` ensures fast `/dashboard/[slug]` lookups.

## Creating a Business (Onboarding → Dashboard Redirect)
1. Go to `/onboarding`.
2. Submit the business form (name, region code, timezone, contact info). The slug is enforced as `${toSlug(name)}-${toSlug(regionCode)}`.
3. After creation, the server action executes `redirect(`/dashboard/${business.slug}`);`, landing the operator inside the dashboard instantly.
4. Region mismatches short-circuit inside `createBusiness`, guaranteeing isolation per deployment.

## Dashboard `/dashboard/[slug]`
- Route loader fetches the business by slug + region. Missing slugs call `notFound()`.
- Metrics combine appointments, customers, and audit logs with cached server actions.
- Panels (`src/features/dashboard/components/*`) display totals, upcoming appointments, customer snippets, and automation history.

## Booking Flow `/[businessSlug]/book`
- Loader fetches business, active services, and availability, and calls `notFound()` if anything is missing.
- `BookingFlow` handles service selection, slot selection, and confirmation. Empty states display friendly guidance when no services or availability exist.
- Bookings trigger `createCustomer` + `createAppointment`, both scoped to `REGION`, then revalidate the booking path for SSR freshness.

## AI Agent Workflow
- Typed union lives in `src/agents/agentTypes.ts`:
  ```ts
  export type AgentAction =
    | { type: "createBusiness"; payload: CreateBusinessInput }
    | { type: "createCustomer"; payload: CreateCustomerInput }
    | { type: "createAppointment"; payload: CreateAppointmentInput }
    | { type: "updateTemplate"; payload: UpdateTemplateInput };
  ```
- `src/agents/agentRouter.ts` routes every union branch to its hook.
- `/api/ai/concierge/route.ts` simply `await agentRouter(action)` so external orchestrators can POST JSON without caring about UI code.
- Hooks call domain actions, which call Supabase with fully typed payloads.

## Region Replication in Under 5 Minutes
1. Duplicate the Supabase project (or run `supabase/schema.sql` against a new instance).
2. Copy environment variables and update `NEXT_PUBLIC_TIMEBOOKT_REGION` to the new city/country code.
3. Deploy the Next.js app (Vercel or similar) with the new env values.
4. Seed templates/services if needed and invite agents—the domain constraints ensure all data stays in the new region namespace.

## Booking + Dashboard Lifecycle Recap
1. **Create business:** `/onboarding` → domain createBusiness (region-scoped) → redirect to `/dashboard/<slug>`.
2. **Dashboard view:** `/dashboard/<slug>` → `getDashboardData` loads metrics + appointments/customers under the same region.
3. **Customer booking:** `/<slug>/book` → `getBookingContext` + `BookingFlow` → server action `createBookingAction` (customer + appointment).
4. **AI agent:** POST to `/api/ai/concierge` with `{ "type": "createAppointment", payload: { ... } }` (or import `agentRouter` server-side) to automate operations.

## Scripts
- `npm run dev` – Start Next.js in dev mode.
- `npm run build` – Build for production.
- `npm run start` – Start production build.
- `npm run lint` – ESLint (Next config).

With this scaffold you can roll out a new regional instance by cloning the Supabase project, adjusting four env vars, and redeploying—TimeBookt v2 keeps multi-tenant, agent-ready guarantees baked in from the start.
