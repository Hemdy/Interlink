# Interlink architecture

## Product context

The [Interlink PRD](./Docs/PRD) defines a mentorship-first product for mentees, mentors, and administrators. Its central domain is the mentorship relationship and its lifecycle: discover, connect, establish objectives, learn, apply, track progress, and grow. Goals, milestones, sessions, conversations, resources, and reviews are expected to be contextual to a mentorship.

The MVP requirements also include profiles and onboarding, mentor discovery, requests, relationship workspaces, basic messaging and scheduling, goals, notifications, administration, verification, reporting, and blocking. Matching recommendations, detailed public reviews, native mobile product features, payments, corporate programmes, and AI capabilities are deferred or future scope in the PRD. This repository provides no implementations of those workflows.

## Workspace boundaries

```text
apps/
  web/
    src/app/              Next.js routes and layouts; future REST handlers live under src/app/api/v1/
  mobile/                 Expo entry point and native app configuration
packages/
  database/
    drizzle/              Generated, committed SQL migrations
    src/schema/            Drizzle schema, grouped by domain as those domains are implemented
    src/client.ts          Server-only Neon HTTP client
  types/                   Shared TypeScript domain types
  validation/              Shared Zod schemas
  utils/                   Platform-neutral utilities
  typescript-config/       Strict shared compiler configurations
```

Web and mobile remain separate deployable applications. Shared packages contain portable types, validation, and utilities; the database package is server-only and must never be imported by the mobile app or browser code. Business rules belong in server-side feature modules, not UI components. Next.js Route Handlers will be the REST boundary when API work begins.

Introduce feature directories with their first implementation instead of checking in empty placeholders. Keep web route files thin and organize feature code as `apps/web/src/features/<feature>/{domain,application,infrastructure,ui}`; use `apps/mobile/src/features/<feature>/{domain,application,ui}` for native presentation and shared use cases. Keep persistence adapters in the database package and do not duplicate business rules between apps.

## Product feature areas

Organize future application code by feature rather than by technical layer alone. Candidate feature areas from the PRD are:

- Accounts, roles, profiles, and onboarding
- Mentor discovery, search, and saved mentors
- Mentorship requests and relationship workspaces
- Goals, milestones, progress, and resources
- Messaging, sessions, and notifications
- Trust and safety: verification, reports, blocking, and audit records
- Administration and analytics

Keep UI, application/use-case logic, domain rules, and persistence concerns distinct within a feature. Begin with a modular monolith; do not introduce service boundaries until operational evidence supports them.

## Data and migrations

Neon PostgreSQL is the source of durable application data. Drizzle schema files are grouped by domain and exported from `packages/database/src/schema/index.ts`. Schema edits are followed by `pnpm db:generate`; generated SQL migrations are reviewed and committed. Apply migrations with `pnpm db:migrate` using the direct Neon URL. The runtime client uses Neon’s serverless HTTP driver and the pooled URL.

The initial schema only establishes users, a role catalogue, and user-role assignments. It does not choose a password/authentication provider or implement account flows. Product tables should be introduced alongside their feature work and include the PRD’s integrity requirements (foreign keys, unique constraints, lifecycle status, timestamps, and appropriate retention).

## Access control and security boundaries

The PRD requires backend-enforced role and resource-level authorization, least-privilege administrative roles, audit logging, rate limiting, secure file access, and privacy controls. The shared role vocabulary and relational role assignments are groundwork only; authorization policies, identity/session management, and APIs are intentionally not implemented here. Future authorization must be enforced server-side for every protected operation and must not rely on UI visibility.

Keep credentials in environment variables. Never expose database URLs or server secrets through `NEXT_PUBLIC_*` or `EXPO_PUBLIC_*`. The database package has a `server-only` boundary. Use the pooled Neon URL for application requests and the direct URL for migrations.

## Configuration and app responsibilities

- `@interlink/types` is dependency-light and portable across web, native, and server code.
- `@interlink/validation` owns shared Zod primitives and inferred input types.
- `@interlink/utils` contains small platform-neutral helpers; keep business logic in feature modules.
- `@interlink/database` owns schema, runtime connection creation, migration configuration, and seed data.
- `@interlink/typescript-config` centralizes strict compiler defaults while allowing framework-specific settings.

## Scope and source-of-truth decisions

The initialization brief selects Next.js App Router, Expo, Neon, Drizzle, Tailwind, NativeWind, Zod, REST Route Handlers, and secure RBAC as the implementation stack, superseding the older Angular/NestJS/Prisma stack listed in the PRD’s technical section.

The separate monetization proposal conflicts with PRD v2.0: it calls paid bookings and payouts MVP requirements, while the PRD explicitly defers payments and says to validate free mentorship first. Because the PRD is designated the product source of truth, this foundation excludes payment entities, providers, and workflows. Reconcile this decision in product scope before payment development.

The PRD describes responsive web/PWA as the initial product and native apps as a later opportunity. The requested Expo app is therefore a technical shell only; native product functionality remains out of scope.

## Local development

Use the commands in [README.md](./README.md). Workspaces use Node.js 20.19+ and pnpm 10. Root `.env` is loaded by app scripts; database commands read the same file. Keep `.env` untracked and update `.env.example` whenever required configuration changes.
