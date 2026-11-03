# Interlink

Interlink is a structured mentorship and career-development platform connecting people seeking guidance with experienced professionals. The product is centred on credible mentor discovery and purposeful, measurable mentorship relationships.

The [Product Requirements Document](./Docs/PRD) is the source of truth for product scope. This repository currently contains project foundations only; product workflows are not implemented.

## Technology

- **Web:** Next.js App Router, React, TypeScript, Tailwind CSS
- **Mobile:** React Native, Expo, TypeScript, NativeWind
- **Data:** Neon Serverless PostgreSQL, Drizzle ORM and Drizzle Kit
- **Shared:** TypeScript types, Zod validation, and utilities
- **Workspace:** pnpm workspaces and Turborepo
- **API direction:** REST endpoints implemented as Next.js Route Handlers when product development begins

## Requirements

- Node.js 20.19+ (Node.js 24 LTS recommended)
- pnpm 10
- A Neon PostgreSQL project for database operations

Enable the pinned pnpm release with Corepack if pnpm is not already installed:

```powershell
corepack enable
corepack prepare pnpm@10.15.0 --activate
```

## Setup

```powershell
pnpm install
Copy-Item .env.example .env
```

Set `DATABASE_URL` to Neon’s pooled connection string and `DATABASE_URL_UNPOOLED` to its direct connection string in `.env`. The web and mobile dev scripts load this root environment file.

## Commands

| Command             | Purpose                                            |
| ------------------- | -------------------------------------------------- |
| `pnpm dev`          | Start the web and Expo development servers         |
| `pnpm dev:web`      | Start the Next.js app                              |
| `pnpm dev:mobile`   | Start the Expo app                                 |
| `pnpm build`        | Build workspace packages that define a build task  |
| `pnpm lint`         | Lint workspace source                              |
| `pnpm typecheck`    | Type-check workspace packages                      |
| `pnpm format:check` | Check formatting                                   |
| `pnpm db:generate`  | Generate a Drizzle migration from schema changes   |
| `pnpm db:migrate`   | Apply pending migrations using the direct Neon URL |
| `pnpm db:studio`    | Open Drizzle Studio                                |
| `pnpm db:seed`      | Insert the initial role catalogue                  |

Database commands require `.env`. `db:generate` creates migration files but does not connect to Neon; `db:migrate`, `db:studio`, and `db:seed` require a reachable database.

## Repository map

```text
apps/
  web/                 Next.js App Router foundation
  mobile/              Expo + NativeWind foundation
packages/
  database/            Neon client, Drizzle schema, migrations and seed
  types/               Shared TypeScript types
  utils/               Shared small utilities
  validation/          Shared Zod schemas
  typescript-config/   Shared TypeScript configurations
Docs/
  PRD                  Product requirements (source of truth)
  monetization         Supplementary monetization proposal
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for boundaries, planned feature areas, and decisions.

## Scope notes

- The app shells intentionally contain no product screens, auth flows, APIs, or business workflows.
- The PRD’s MVP prioritises free mentorship and explicitly defers payments and native mobile product features. The monetization supplement proposes paid transactions for MVP; this foundation follows the PRD until product scope is explicitly revised.
- The PRD’s original Angular/NestJS/Prisma recommendations are superseded by the technology choices in this repository initialization brief.

## Product documentation

- [Product Requirements Document](./Docs/PRD)
- [Monetization proposal](./Docs/monetization)
- [Architecture](./ARCHITECTURE.md)
