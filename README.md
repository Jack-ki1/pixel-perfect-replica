# Breakout Radar

> Private, internal A&R intelligence for discovering emerging African artists.

Breakout Radar helps an A&R (Artists & Repertoire) team find artists who are
growing faster than expected, check that their growth is real, judge them
artistically, and move them through a signing pipeline — all in one place.

Every artist, number and portrait in the current build is **synthetic demo
data** and is labelled with a **Demo** badge. Scores across the app are
**0–100 ranking indices, not probabilities of success.**

---

## Table of contents

1. [What the app does](#1-what-the-app-does)
2. [Screens and features](#2-screens-and-features)
3. [How it works (architecture)](#3-how-it-works-architecture)
4. [Data model](#4-data-model)
5. [Scoring, predictions and backtesting](#5-scoring-predictions-and-backtesting)
6. [Themes (light and dark)](#6-themes-light-and-dark)
7. [Access, roles and review mode](#7-access-roles-and-review-mode)
8. [Folder structure](#8-folder-structure)
9. [What each file does](#9-what-each-file-does)
10. [Running locally](#10-running-locally)
11. [Environment variables](#11-environment-variables)
12. [Hosting on Vercel](#12-hosting-on-vercel)
13. [Other hosting options](#13-other-hosting-options)
14. [Database migrations](#14-database-migrations)
15. [Testing](#15-testing)
16. [Design system](#16-design-system)
17. [Conventions and rules](#17-conventions-and-rules)
18. [What is remaining](#18-what-is-remaining)
19. [Troubleshooting](#19-troubleshooting)
20. [Glossary](#20-glossary)

---

## 1. What the app does

A&R scouts face too many artists and too little time. Breakout Radar narrows
the field by answering five questions for every monitored artist:

| Question | Where it is answered |
| --- | --- |
| Who is growing faster than expected right now? | Command Centre, Discover, Predictions |
| Is the growth real, or bought / botted? | Growth Integrity |
| Who are the fans and how is the audience changing? | Audience, Artist Profile |
| Is fan-made content (UGC) driving it? | UGC Intelligence |
| Is the artist actually good, and where are we with them? | Artistic Review, A&R Pipeline, Artist Development |

Guiding principles built into the product:

- **Evidence first.** Each artist profile separates *facts*, *hypotheses*,
  *limitations* and *recommended actions*.
- **Humans decide.** Integrity flags are prompts, never verdicts. Signing is
  a human decision restricted to senior roles.
- **Honest numbers.** Scores are relative indices. Data confidence is shown
  next to every ranking. Missing data shows "Insufficient evidence" rather
  than a made-up number.
- **Demo transparency.** Synthetic records always carry a Demo badge.

---

## 2. Screens and features

All screens live behind the app shell (left sidebar + top bar). The sidebar
lists every module; the top bar has artist search, the data-freshness note,
the **theme toggle** (sun / moon icon) and the **Alerts** bell.

### 2.1 Command Centre (`/radar`)

- Photo banner with headline, quick links to the pipeline and audience pages.
- KPI tiles: artists monitored, breakouts (≥3× expected growth), and more.
- Ranked list of top-priority artists with "why now" explanations.
- Recent activity feed from the audit log (stage changes etc.).

### 2.2 Artists (`/artists`)

- Card grid of every monitored artist with portrait, genre, city, stage,
  integrity chip, audience size, 30-day growth and priority score.
- Free-text filter (name, alias, city, country, genre, language).
- Top-bar search sends you here with the query pre-filled (`?q=`).

### 2.3 Artist Profile (`/artists/$id`)

- Header with identity, location, genre, stage and integrity status.
- Actual vs expected growth chart.
- Score breakdown (momentum, fan depth, UGC impact, audience evolution,
  catalogue, artistic, market expansion, organic, data confidence, priority).
- Timeline of events (releases, UGC trends, live shows, campaigns, shifts).
- Evidence panel: facts, hypotheses, limitations, recommended actions.
- Team notes: add and read notes about the artist.

### 2.4 Discover (`/discover`)

- Filter builder: country, genre, integrity class, minimum momentum,
  minimum 30-day growth.
- Live result list.
- **Saved searches**: name and save the current filters, click to reapply,
  delete when no longer needed. Saved in the database.

### 2.5 Audience (`/audience`)

- Audience snapshots per artist over time (age, city, platform segments).
- Side-by-side comparison of two snapshots to show "audience morphing" —
  for example a shift from 18–24 Nairobi listeners toward 25–34 and Kampala.

### 2.6 UGC Intelligence (`/ugc`)

- Ranking of artists by UGC impact index (how much fan-made content is
  driving growth).
- Feed of detected UGC moments (fan cover trends, remixes) across artists.
- Explicit note that no licensed platform demographic data is connected.

### 2.7 Growth Integrity (`/integrity`)

- Case queue with **Open** and **Resolved** tabs.
- Each case shows the artist, current integrity label, reason and signals
  (e.g. listener jump in 48h, low saves-to-streams ratio, playlist
  concentration).
- Reviewer can write an optional note and choose an outcome: Organic, Paid
  promo (disclosed), Unknown or Confirmed invalid.
- Resolving a case updates the artist's integrity label everywhere.

### 2.8 Artistic Review (`/review`)

- Rubric with six criteria rated 1–5: vocal/performance, songwriting,
  originality, live presence, visual identity, work-ethic signals.
- Verdict: Strong yes, Promising, Not yet, Pass.
- Free-text notes.
- Saving records the review, sets the artist's artistic status to the
  verdict, and writes the artistic score (average × 20, so 0–100).
- Recent reviews list.

### 2.9 A&R Pipeline (`/pipeline`)

- Kanban board with ten stages: Identified, Watchlist, Investigation,
  Artistic Review, Contact, Live Audition, Development, Negotiation,
  Signed, Passed.
- Drag cards between columns or use the stage dropdown on each card.
- Optimistic updates with rollback on error.
- Each change is written to the audit log by a database trigger.
- Moving to **Signed** is restricted to Admin / Head of A&R (and therefore
  blocked while sign-in is paused).

### 2.10 Predictions (`/predictions`)

- Model registry with two demo models (production and shadow candidate),
  their training dates and feature weights.
- Ranking table under the selected model, with data confidence and the
  difference versus the other model.

### 2.11 Backtesting (`/backtesting`)

- Choose how many early months to "train" on (2–5).
- For every artist, forecast the final month from early months only and
  compare to the actual value.
- KPIs: average forecast error, number within ±20%, months forecast ahead.

### 2.12 Alerts (`/alerts`)

- Momentum alerts (growth far above expected) and integrity alerts.
- Unread alerts are highlighted; mark one or all as read.
- Links straight to the artist.

### 2.13 Artist Development (`/development`)

- Add tasks for any artist with an area (Music, Live, Content, Brand,
  Team), a title and an optional due date.
- One card per artist in development stages (or with tasks), with a
  progress bar and tick boxes.

### 2.14 Reports (`/reports`)

- Weekly A&R summary: top five priorities with reasons, pipeline counts,
  integrity breakdown.
- **CSV** download of all artists.
- **Print** button (browser print / save as PDF).

### 2.15 Data Sources (`/sources`)

- Lists every data source, its type, status (Demo fixture / Not connected)
  and last update date.

### 2.16 Settings (`/settings`)

- Explains current access mode, the five roles and what each can do, and
  the scoring policy.

---

## 3. How it works (architecture)

```text
 Browser (React 19)
   │  TanStack Router  ── file-based routes in src/routes
   │  TanStack Query   ── caching + mutations
   │  Supabase JS      ── talks to the database directly (row-level security)
   ▼
 TanStack Start server (SSR, server functions)  ── runs on an edge worker
   ▼
 Lovable Cloud backend (Postgres + Auth + Storage)
```

### 3.1 Frontend

- **React 19** with **TanStack Start v1** (full-stack React framework).
- **Vite 7** build tool.
- **Tailwind CSS v4**, configured entirely in `src/styles.css`.
- **shadcn/ui** components (Radix primitives) in `src/components/ui`.
- **lucide-react** icons, **sonner** toasts.

### 3.2 Routing

- File-based: every file in `src/routes` becomes a URL.
- `src/routeTree.gen.ts` is generated automatically; never edit it.
- `src/routes/_authenticated/route.tsx` is a *pathless layout*: it renders
  the app shell (sidebar + top bar) around every module page. The
  underscore means it adds no segment to the URL.
- `src/routes/index.tsx` sends visitors to the Command Centre.

### 3.3 Data loading

Each page follows the same pattern:

1. A `queryOptions` object describes the query (key + fetch function),
   e.g. `artistsQuery` in `src/lib/artists.ts` or `tableQuery("alerts")`
   in `src/lib/modules.ts`.
2. The route `loader` calls `context.queryClient.ensureQueryData(...)` so
   data is ready before the page renders.
3. The component reads it with `useSuspenseQuery(...)`.
4. Writes use `useMutation`, then `invalidateQueries` to refresh.

### 3.4 Backend

- **Lovable Cloud** provides the Postgres database, authentication and
  file storage.
- Access rules are enforced in the database with **row-level security
  (RLS)** policies, so the browser can safely query tables directly.
- A database trigger (`audit_artist_stage`) records every pipeline stage
  change into `audit_log` and blocks unauthorised moves to Signed.
- Roles are stored in a separate `user_roles` table and checked with the
  `has_role()` security-definer function — never on the profile row.

### 3.5 Server

- `src/server.ts` wraps the server entry to render a friendly error page
  if server-side rendering crashes.
- `src/start.ts` registers middleware: error handling, CSRF protection for
  server functions, and attaching the signed-in user's token to server
  function calls.

---

## 4. Data model

| Table | Purpose | Key columns |
| --- | --- | --- |
| `profiles` | One row per user account | `id`, `display_name` |
| `user_roles` | Roles per user (separate table for security) | `user_id`, `role` |
| `artists` | Every monitored artist | identity, location, genre, `pipeline_stage`, `integrity`, `artistic_status`, `audience_current`, `growth_30d`, `expected_growth_30d`, `scores` (json), `series` (json), `events` (json), `evidence` (json), `is_demo` |
| `audience_snapshots` | Audience breakdown at a date | `artist_id`, `reference_date`, `window_days`, `source`, `total`, `segments` (json) |
| `artist_notes` | Team notes on an artist | `artist_id`, `author_name`, `body` |
| `audit_log` | Who changed what | `entity`, `entity_id`, `action`, `detail` |
| `saved_searches` | Discover saved filters | `name`, `filters` (json) |
| `integrity_cases` | Growth integrity queue | `artist_id`, `status`, `reason`, `signals`, `resolution`, `resolved_at` |
| `artistic_reviews` | Rubric submissions | `artist_id`, `reviewer`, `scores`, `verdict`, `notes` |
| `alerts` | Momentum / integrity alerts | `artist_id`, `kind`, `title`, `body`, `is_read` |
| `dev_tasks` | Artist development plans | `artist_id`, `area`, `title`, `due`, `done` |

Enums:

- `app_role`: `admin`, `head_of_ar`, `scout`, `analyst`, `artist_dev`
- `pipeline_stage`: the ten stages listed in §2.9
- `integrity_class`: `organic`, `paid_promo`, `unknown`, `suspicious`,
  `confirmed_invalid`

JSON shapes used in `artists`:

```ts
scores:   { momentum, fan_depth, ugc_impact, audience_evolution, catalogue,
            artistic, market_expansion, organic, data_confidence, priority }  // 0–100 or null
series:   [{ m: "Apr", a: 6200, e: 6000 }, ...]  // month, actual, expected
events:   [{ d: "2026-05-12", type: "release" | "ugc" | "live" | "campaign" | "shift", label }]
evidence: { facts: [], hypotheses: [], limitations: [], actions: [] }
```

---

## 5. Scoring, predictions and backtesting

### 5.1 Scores

Each artist has ten sub-scores from 0 to 100 (or `null` when there is not
enough evidence). They are **relative rankings within the monitored set**,
not chances of success.

### 5.2 Growth multiplier

`src/lib/analytics.ts` computes how many times faster than expected an
artist grew (actual 30-day growth ÷ expected). "Breakouts" on the Command
Centre are artists at 3× or more.

### 5.3 Prediction models

Defined in `src/lib/modules.ts` as `MODELS`. Each model is a transparent
weighted average of chosen sub-scores:

```text
modelScore = Σ(score_k × weight_k) / Σ(weight_k)   (only over non-null scores)
```

Two demo models exist: **Breakout Index v1** (production) and **v2**
(shadow candidate). Predictions page shows the difference between them.

### 5.4 Backtesting

`backtest(artist, cut)` in `src/lib/modules.ts`:

1. Take the first `cut` months of the artist's series.
2. Compute the compound monthly growth rate from first to last of those.
3. Project forward to the final month.
4. Compare with the real final value: `error% = (forecast − actual) ÷ actual`.

This is a naive baseline so the team can see how well early data predicts
later growth. A large negative error means the artist broke out faster
than the early data suggested.

---

## 6. Themes (light and dark)

- The app ships with a **dark** theme (navy + electric lime) and a
  **light** theme (soft white + deeper lime/cyan for readable contrast).
- The **sun / moon button** in the top bar switches themes.
- The choice is saved in the browser (`localStorage` key `br-theme`), and
  a tiny script in the page head applies it before the page paints, so
  there is no flash of the wrong theme.
- Colours are CSS variables: light values on `:root`, dark values on
  `.dark` in `src/styles.css`. Components only use semantic classes
  (`bg-background`, `text-lime`, `bg-panel` …), so both themes work
  everywhere automatically.
- The Command Centre photo banner stays dark in both themes so its text
  remains readable over the photo.
- Toast notifications follow the current theme.

Relevant files: `src/styles.css`, `src/hooks/use-theme.ts`,
`src/components/theme-toggle.tsx`, `src/routes/__root.tsx`.

---

## 7. Access, roles and review mode

### 7.1 Intended model

- Invite-only. There is no public sign-up; an admin adds users.
- The first account created becomes **Admin**; everyone after starts as
  **Scout**.
- Roles: Admin, Head of A&R, Scout, Analyst, Artist Development.

### 7.2 Review mode (current state)

Sign-in is **temporarily paused** so the owner can review the product:

- The app opens straight onto the Command Centre with no sign-in page.
- Database policies named "review mode …" allow anonymous access to read
  data and to make the edits each module needs.
- Notes are authored as "A&R Team".
- Moving an artist to **Signed** stays blocked (it needs a senior role).

> ⚠️ Anyone with the link can view and change demo data while review mode
> is on. Switch sign-in back on before using real data.

### 7.3 Turning sign-in back on (summary)

1. Restore the sign-in check in `src/routes/_authenticated/route.tsx`.
2. Remove the "review mode" database policies and anonymous grants.
3. Restrict the new module tables to team members (`is_team(auth.uid())`).
4. Re-enable the sign-in page and sign-out button.

---

## 8. Folder structure

```text
.
├── AGENTS.md                    # Rules for AI/code agents working on the repo
├── README.md                    # This document
├── roadmap.md                   # Task list / build phases
├── components.json              # shadcn/ui generator config
├── drizzle.config.ts            # Drizzle Kit config for migrations
├── drizzle/
│   ├── schema.ts                # Placeholder required by Drizzle Kit (do not edit)
│   └── migrations/
│       ├── 0000_migration.sql   # Core schema + demo seed
│       ├── 0001_review_mode_notes.sql
│       ├── 0002_next_phase_modules.sql
│       └── meta/                # Drizzle journal + snapshots (auto-managed)
├── eslint.config.js
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
├── bunfig.toml
├── public/
│   ├── favicon.ico
│   └── robots.txt
├── supabase/
│   └── config.toml              # Backend project config (auto-generated)
└── src/
    ├── assets/                  # Hero photo and portrait sprite sheets
    ├── components/
    │   ├── ui/                  # shadcn/ui primitives (button, input, …)
    │   ├── br-ui.tsx            # Breakout Radar building blocks
    │   ├── audience-compare.tsx # Snapshot comparison widget
    │   └── theme-toggle.tsx     # Sun/moon theme switch
    ├── hooks/
    │   ├── use-mobile.tsx
    │   └── use-theme.ts
    ├── integrations/supabase/   # Backend client + generated types (auto-generated)
    ├── lib/
    │   ├── analytics.ts
    │   ├── artists.ts
    │   ├── modules.ts
    │   ├── utils.ts
    │   └── error-*.ts / lovable-error-reporting.ts
    ├── routes/
    │   ├── __root.tsx
    │   ├── index.tsx
    │   ├── auth.tsx
    │   └── _authenticated/      # Every module page
    ├── test/
    ├── router.tsx
    ├── routeTree.gen.ts         # Generated – never edit
    ├── server.ts
    ├── start.ts
    └── styles.css
```

---

## 9. What each file does

### 9.1 Root files

| File | What it does |
| --- | --- |
| `package.json` | Dependencies and scripts (`dev`, `build`, `preview`, `lint`, `format`, `test`). |
| `vite.config.ts` | Vite config via `@lovable.dev/vite-tanstack-config`, which already includes TanStack Start, React, Tailwind, path aliases and the server build. Points the server entry to `src/server.ts`. |
| `tsconfig.json` | TypeScript settings; `@/` alias maps to `src/`. Strict mode with `exactOptionalPropertyTypes`. |
| `vitest.config.ts` | Unit test runner config (jsdom). |
| `eslint.config.js` | Lint rules. |
| `.prettierrc` / `.prettierignore` | Code formatting. |
| `components.json` | Tells the shadcn CLI where components and styles live. |
| `drizzle.config.ts` | Where migrations live; the connection URL comes from the environment. |
| `bunfig.toml` | Bun package manager settings. |
| `AGENTS.md` | Guidance for automated coding agents. |
| `roadmap.md` | Build phases and their status. |
| `.env` | Public backend URL and publishable key (auto-generated, safe for the browser). |

### 9.2 `src/` top level

| File | What it does |
| --- | --- |
| `router.tsx` | Creates the TanStack router with a shared `QueryClient` in its context. |
| `routeTree.gen.ts` | Auto-generated map of all routes. Never edit by hand. |
| `start.ts` | Registers global middleware: error page, CSRF protection, auth token attachment for server functions. |
| `server.ts` | Server entry wrapper that turns crashes into a friendly HTML error page. |
| `styles.css` | Tailwind import, design tokens for light (`:root`) and dark (`.dark`) themes, custom utilities `panel`, `glow`, `hero-fade`, `num`. |

### 9.3 `src/routes/`

| File | URL | What it does |
| --- | --- | --- |
| `__root.tsx` | – | HTML shell, fonts, meta tags, theme bootstrap script, query provider, toasts, 404 and error pages. |
| `index.tsx` | `/` | Redirects to the Command Centre. |
| `auth.tsx` | `/auth` | Sign-in page (inactive during review mode). |
| `_authenticated/route.tsx` | – | App shell: sidebar navigation, top search, theme toggle, alerts bell. |
| `_authenticated/radar.tsx` | `/radar` | Command Centre. |
| `_authenticated/artists.index.tsx` | `/artists` | Artist grid with filter. |
| `_authenticated/artists.$id.tsx` | `/artists/:id` | Artist profile with charts, evidence and notes. |
| `_authenticated/discover.tsx` | `/discover` | Filter builder and saved searches. |
| `_authenticated/audience.tsx` | `/audience` | Audience snapshots and morphing. |
| `_authenticated/ugc.tsx` | `/ugc` | UGC impact ranking and moments. |
| `_authenticated/integrity.tsx` | `/integrity` | Growth Integrity case queue. |
| `_authenticated/review.tsx` | `/review` | Artistic Review rubric. |
| `_authenticated/pipeline.tsx` | `/pipeline` | Kanban pipeline board. |
| `_authenticated/predictions.tsx` | `/predictions` | Model registry and rankings. |
| `_authenticated/backtesting.tsx` | `/backtesting` | Forecast vs actual workbench. |
| `_authenticated/alerts.tsx` | `/alerts` | Alerts inbox. |
| `_authenticated/development.tsx` | `/development` | Artist development tasks. |
| `_authenticated/reports.tsx` | `/reports` | Weekly report, CSV, print. |
| `_authenticated/sources.tsx` | `/sources` | Data source inventory. |
| `_authenticated/settings.tsx` | `/settings` | Access, roles and scoring policy. |
| `README.md` | – | Notes about the routing convention. |

### 9.4 `src/components/`

| File | What it does |
| --- | --- |
| `br-ui.tsx` | `Logo`, `Portrait` (crops a face from a sprite sheet), `DemoBadge`, `Panel`, `ScoreRing`, `IntegrityChip`, `Kpi`. |
| `audience-compare.tsx` | Compares two audience snapshots segment by segment. |
| `theme-toggle.tsx` | Sun/moon button that flips light/dark. |
| `ui/*` | ~46 shadcn/ui primitives (button, input, textarea, dialog, select, tabs, tooltip, sonner …). |

### 9.5 `src/hooks/`

| File | What it does |
| --- | --- |
| `use-theme.ts` | Reads and sets the theme on `<html>`, saves it to `localStorage`, notifies subscribers. |
| `use-mobile.tsx` | Detects small screens. |

### 9.6 `src/lib/`

| File | What it does |
| --- | --- |
| `artists.ts` | Types for artists/snapshots, pipeline stage list, integrity labels, portrait helper, queries for artists, snapshots, notes, audit log, roles, and a number formatter. |
| `modules.ts` | Shared query helper for the new module tables, score helpers, prediction models, backtest function, data source list. |
| `analytics.ts` | Growth multiplier and related maths (covered by tests). |
| `utils.ts` | `cn()` class-name merge helper. |
| `error-capture.ts`, `error-page.ts`, `lovable-error-reporting.ts` | Capture and report runtime errors; render the fallback error page. |

### 9.7 `src/integrations/supabase/` (auto-generated — do not edit)

| File | What it does |
| --- | --- |
| `client.ts` | Browser database client. |
| `client.server.ts` | Privileged server-only client (bypasses RLS; use sparingly). |
| `auth-middleware.ts` | `requireSupabaseAuth` middleware for protected server functions. |
| `auth-attacher.ts` | Adds the user's token to server function calls. |
| `cron-auth.ts` | Verifies scheduled job callers. |
| `previewAuthStorage.ts` | Session storage used inside the editor preview. |
| `types.ts` | TypeScript types generated from the database schema. |

### 9.8 `src/test/`

| File | What it does |
| --- | --- |
| `setup.ts` | Test environment setup. |
| `analytics.test.ts` | Tests the growth maths. |
| `app-routing.test.tsx` | Checks `/` matches a real page. |

### 9.9 `src/assets/`

| File | What it does |
| --- | --- |
| `hero.jpg` | Command Centre banner photo. |
| `portraits-a.jpg`, `portraits-b.jpg` | 2×2 sprite sheets of demo portraits (8 faces total). |

---

## 10. Running locally

Requirements: **Node 20+** (or **Bun 1.1+**).

```bash
# 1. install
bun install          # or: npm install

# 2. start the dev server (http://localhost:8080)
bun run dev          # or: npm run dev

# 3. production build
bun run build

# 4. preview the build
bun run preview

# 5. tests and lint
bun run test
bun run lint
```

The `.env` file already contains the public backend URL and publishable
key, so the app talks to the same backend as the hosted version.

---

## 11. Environment variables

| Variable | Where used | Secret? |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Browser + server | No |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Browser + server | No (publishable) |
| `VITE_SUPABASE_PROJECT_ID` | Browser | No |
| `SUPABASE_URL` | Server only | No |
| `SUPABASE_PUBLISHABLE_KEY` | Server only | No |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only (privileged client) | **Yes** — not available on Lovable Cloud; only needed if you add privileged server code and self-host the backend |

Rules:

- Anything prefixed `VITE_` is bundled into the browser. Never put
  secrets in a `VITE_` variable.
- Read `process.env.X` only inside server functions or server routes.

---

## 12. Hosting on Vercel

The app is a TanStack Start project. Its build (through Nitro) targets
Cloudflare-style edge workers by default; Vercel needs the Nitro **vercel**
preset.

### 12.1 Get the code

1. In Lovable, connect the project to **GitHub** (Project → GitHub →
   Connect) so the code lives in a repository you own.
2. Clone it locally if you want to test the build first.

### 12.2 Create the Vercel project

1. Sign in at vercel.com → **Add New → Project**.
2. Import the GitHub repository.
3. **Framework preset:** "Other" (or Vite — the settings below override it).
4. **Install command:** `bun install` (or `npm install`).
5. **Build command:** `bun run build` (or `npm run build`).
6. **Output directory:** leave empty — the Vercel preset writes
   `.vercel/output` which Vercel picks up automatically.

### 12.3 Environment variables in Vercel

Under **Settings → Environment Variables** add, for Production and Preview:

```text
NITRO_PRESET=vercel
VITE_SUPABASE_URL=<copy from .env>
VITE_SUPABASE_PUBLISHABLE_KEY=<copy from .env>
VITE_SUPABASE_PROJECT_ID=<copy from .env>
SUPABASE_URL=<same as VITE_SUPABASE_URL>
SUPABASE_PUBLISHABLE_KEY=<same as VITE_SUPABASE_PUBLISHABLE_KEY>
```

`NITRO_PRESET=vercel` switches the server build to Vercel functions. If
your version of the build config ignores it, set the preset explicitly in
`vite.config.ts`, e.g.:

```ts
export default defineConfig({
  tanstackStart: { server: { entry: "server" } },
  // if supported by your config version:
  // nitro: { preset: "vercel" },
});
```

### 12.4 Deploy

Click **Deploy**. Every push to the main branch redeploys; pull requests
get preview URLs.

### 12.5 After deploying

- Open the Vercel URL and check the Command Centre loads with demo artists.
- If sign-in is re-enabled later, add the Vercel domain to the backend's
  allowed redirect URLs so sign-in links return to the right site.
- Custom domain: Vercel → Settings → Domains.

### 12.6 Common Vercel issues

| Symptom | Fix |
| --- | --- |
| Blank page, 404 on every route | `NITRO_PRESET=vercel` missing; redeploy after adding it. |
| "Missing Supabase URL" error | `VITE_` variables not set for that environment; add and redeploy (they are baked in at build time). |
| Works locally, fails on Vercel with Node API errors | Make sure server code only uses web-standard APIs or Node APIs supported by Vercel functions. |
| Old version showing | Vercel → Deployments → Redeploy without cache. |

---

## 13. Other hosting options

- **Lovable (easiest):** click **Publish** in the editor. Frontend changes
  need **Update** in the publish dialog; database changes are live at once.
- **Cloudflare Workers/Pages:** the default build target; deploy the build
  output with Wrangler.
- **Netlify:** set `NITRO_PRESET=netlify`.
- **Node server:** set `NITRO_PRESET=node-server`, then run
  `node .output/server/index.mjs`.

---

## 14. Database migrations

- Migrations are plain SQL files in `drizzle/migrations/`, tracked by
  Drizzle Kit's journal in `drizzle/migrations/meta/`.
- `0000_migration.sql` — roles, profiles, artists, snapshots, notes, audit
  log, the stage trigger, and the demo seed.
- `0001_review_mode_notes.sql` — lets anonymous visitors add notes while
  review mode is on.
- `0002_next_phase_modules.sql` — saved searches, integrity cases,
  artistic reviews, alerts, development tasks, plus demo cases and alerts.
- Rules: every new table gets `GRANT`s, RLS enabled, and policies.
  Prefer additive changes (new nullable columns) over renames or drops.
- Do not edit `drizzle/schema.ts` or the `meta/` files by hand.

---

## 15. Testing

```bash
bun run test
```

- `src/test/analytics.test.ts` — growth multiplier rules.
- `src/test/app-routing.test.tsx` — the home URL resolves to a page.

Add a test next to these whenever a business rule changes (thresholds,
permissions, scoring).

---

## 16. Design system

- **Fonts:** Sora (headings), Manrope (body), loaded from Google Fonts in
  `__root.tsx`.
- **Dark palette:** deep navy background, electric lime primary, cyan,
  violet and amber accents.
- **Light palette:** near-white background, white panels, deeper lime and
  cyan for contrast.
- **Utilities:** `panel` (card surface), `glow` (lime halo on active
  items), `hero-fade` (banner gradient), `num` (tabular numbers).
- **Rule:** components never hard-code colours; they use semantic tokens so
  themes switch cleanly.
- **Badges:** `DemoBadge` on every synthetic record; `IntegrityChip`
  colour-codes integrity status.

---

## 17. Conventions and rules

- Never edit `src/routeTree.gen.ts` or files in `src/integrations/supabase/`.
- New pages: add a file under `src/routes/_authenticated/`, add a
  `head()` with a unique title and description, and add it to `NAV` in
  `_authenticated/route.tsx`.
- Data fetching: `queryOptions` + loader `ensureQueryData` +
  `useSuspenseQuery`. No `useEffect` fetching.
- Mutations: `useMutation` then invalidate related query keys.
- Roles live only in `user_roles`; check them with `has_role()`.
- Scores are never described as probabilities.
- All synthetic data carries `is_demo = true` and a visible Demo badge.

---

## 18. What is remaining

### 18.1 Must do before real use

- [ ] **Switch sign-in back on** and remove review-mode policies (§7.3).
- [ ] Restrict new module tables to team members only.
- [ ] Admin screen to invite users and change roles (Settings).
- [ ] Record the real author on notes, reviews, cases and tasks.

### 18.2 Data

- [ ] Connect real streaming data (artist-provided analytics or licensed
      feeds).
- [ ] Connect short-video / social UGC data with proper licensing.
- [ ] Live and ticketing data.
- [ ] Scheduled jobs to refresh data and recompute scores daily.
- [ ] Entity resolution (matching the same artist across platforms).
- [ ] Remove or archive demo fixtures once real data flows.

### 18.3 Intelligence

- [ ] Real trained models replacing the demo weighted indices.
- [ ] Model versioning stored in the database (currently in code).
- [ ] Backtests over real historical cohorts with proper metrics
      (precision@k, lift over baseline).
- [ ] Automatic alert generation from score changes (currently seeded).
- [ ] Automatic integrity case creation from anomaly detection.

### 18.4 Product

- [ ] Saved-search alerts (notify when new artists match).
- [ ] Email or chat notifications for alerts.
- [ ] PDF export with branding for reports.
- [ ] Attach audio/video links to artistic reviews.
- [ ] Mobile-optimised layouts for the pipeline board.
- [ ] Comments and mentions on artist profiles.

### 18.5 Quality

- [ ] More automated tests (pipeline permissions, backtest maths,
      integrity outcomes).
- [ ] Accessibility audit (keyboard drag alternatives exist via dropdown).
- [ ] Performance: paginate artists when the list grows large.

---

## 19. Troubleshooting

| Problem | What to try |
| --- | --- |
| Page shows "This page didn't load" | Refresh; check the browser console; the error is also reported automatically. |
| Can't move an artist to Signed | Expected during review mode — it needs Admin or Head of A&R. |
| Theme flips back after refresh | Browser blocks `localStorage` (private mode); the app falls back to dark. |
| Changes don't appear on the live site | Publish → Update (frontend changes need an update). |
| New table "permission denied" | Missing `GRANT` in the migration. |
| Build error about a route path | The `createFileRoute("…")` string must match the file name. |

---

## 20. Glossary

| Term | Meaning |
| --- | --- |
| **A&R** | Artists & Repertoire — the team that finds and signs artists. |
| **UGC** | User-generated content: fan covers, dances, remixes, edits. |
| **Momentum** | How fast an artist is growing relative to peers. |
| **Expected growth** | Typical growth for artists of the same genre, market and stage. |
| **Breakout** | Growth at least 3× the expected curve. |
| **Integrity** | Whether growth is organic, paid (disclosed), unknown, suspicious or invalid. |
| **Audience morphing** | Change in who the listeners are (age, city, platform) over time. |
| **Backtest** | Checking a forecast method against what actually happened. |
| **Shadow model** | A candidate model run alongside production for comparison only. |
| **RLS** | Row-level security — database rules deciding who can read or write each row. |
| **Review mode** | Temporary state where sign-in is paused for product review. |

---

_Internal use only. All demo data is synthetic._
