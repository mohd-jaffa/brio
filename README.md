# Brio — Home Business Management Platform

*Made by you. Managed simply.*

A mobile-first app for businesses run from home: home bakers first, and also
hamper makers, florists and gift makers. Orders, customers, products, stock,
expenses and bills, on a phone, a tablet or a computer, as a web app you can
install, and as an Android app.

The product and architecture specification is
[`home-bakery-management-platform-plan.md`](./home-bakery-management-platform-plan.md),
and it is the source of truth. How to work in this repository is in
[`AGENTS.md`](./AGENTS.md); the design system is in [`DESIGN.md`](./DESIGN.md);
every change is recorded in [`changelog.md`](./changelog.md).

Next.js 16 · TypeScript · Supabase (PostgreSQL, Auth, Storage, row-level
security) · Capacitor 8 for Android.

---

## Running it locally

### What you need

- **Node 22.** `.nvmrc` and `package.json` both say so: CI tests on it and
  Vercel runs it. `nvm use` picks it.
- **Docker**, running. The local Supabase stack runs in it.
- **The Supabase CLI** (`brew install supabase/tap/supabase`).

### First run

```bash
nvm use                 # Node 22
npm install
cp .env.example .env.local
npm run db:start        # starts Postgres, Auth, Storage and Mailpit in Docker
npm run db:reset        # applies the migrations and loads the demo data
npm run dev
```

Then open <http://localhost:3000>.

### Signing in

`supabase/seed.sql` creates two accounts:

| | Mobile number | Password |
|---|---|---|
| **A demo business** | `9876543210` | `Password123!` |
| **The developer console** (`/admin`) | `9123456789` | `Password123!` |

The country code is added for you, so `9876543210`, `09876543210` and
`+91 98765 43210` all sign in to the same account.

The demo business is **Sweet Delights Home Bakery** (Priya Baker). It comes with
customers, products, orders across every status, a stock ledger, expenses and
payments, so every screen has something real to show, including an overdue
order and a product low on stock.

### Where things run

| | |
|---|---|
| The landing page, open to anyone | <http://localhost:3000> |
| The app (Home) | <http://localhost:3000/home> |
| The privacy policy | <http://localhost:3000/privacy> |
| The developer console (developer account only) | <http://localhost:3000/admin> |
| Supabase Studio | <http://127.0.0.1:54323> |
| Mail (Mailpit) | <http://127.0.0.1:54324> |

`supabase status` prints every URL and key the running stack is using. The app
needs no database connection string: it talks to Supabase over its API, and
schema changes go through the CLI.

Registration and password-reset emails are real emails, delivered to Mailpit.
Open it to follow a confirmation link or read a temporary password. Nothing
leaves your machine.

### Background work

**No worker runs for now** (plan §139.11.15; `WORKER_ENABLED` is `false`):

- emails are sent by the request that asks for them;
- reminders for orders due soon and overdue are found when the bell or the
  inbox is read;
- `npm run worker` refuses to start.

Where pushes are wanted, the database's scheduler (pg_cron) calls
`/api/cron/due-orders` every five minutes. The job queue and its worker are
still there, ready to be turned back on (`AGENTS.md`, §17).

### Logs

What fails on the server is written to the **error log**, and every change to a
business's records to the **audit log**. Only the developer console reads them
(`/admin/logs` and `/admin/audit`), and both are kept for seven days.

### Starting over

`npm run db:reset` drops the database, replays every migration and reloads the
demo data. Run it whenever the data gets into a state you did not mean.

---

## Checks

```bash
npm run lint
npm run format:check
npm run typecheck
npm test                    # unit tests
npm run test:integration    # against the local Supabase (npm run db:start)
npm run build && npm run test:e2e   # browser journeys on the built app, port 3100
```

CI (`.github/workflows/ci.yml`) runs all of them on every push to `main` and
every pull request.

---

## Releasing

**A push deploys nothing. A published GitHub release does.**

1. Tag the release `vX.Y.Z`, matching `package.json`'s version.
2. `.github/workflows/release.yml` then:
   - checks the tag;
   - runs every CI gate on it;
   - applies the new migrations to the hosted Supabase;
   - builds that tag on GitHub, and deploys it to Vercel as production.

**Vercel never sees the code.** It is not connected to this repository: the
release uploads only the built app, and checks the upload first. Never deploy
from a working copy.

[`docs/RELEASE.md`](./docs/RELEASE.md) covers:

- who can see what, across GitHub, Vercel, Supabase, the domain and Gmail,
  and what their free plans allow;
- the one-time setup: the domain (GoDaddy), mail (a free Gmail), Supabase,
  Vercel and its rate limit on signing in, and GitHub;
- each release's steps;
- what to write in the release notes;
- backing up the database;
- rolling back, and other things that go wrong;
- the notes for v1.0.0.

### A hosted Supabase project

```bash
supabase link --project-ref <project-ref>
supabase db push          # replays supabase/migrations against the project
```

The release workflow does this for you once it is set up. The app reads only
the values listed in `.env.example`, and they belong in the host's environment
settings.

- **Do not load `supabase/seed.sql` into a hosted project.** It writes a known
  password into `auth.users`. Register the first account through the app
  instead. Add the developer account from the Supabase dashboard
  (`docs/RELEASE.md`, B4).
- **The service-role key is a real secret.** It bypasses row-level security. It
  belongs in `.env.local` and in the host's environment settings, never in the
  repository, and never in anything the browser receives.

---

## The Android app

Brio's Android app is Capacitor 8 loading the hosted web app (plan §139.17).
There is no separate Android code base: `src/` is the one app, and
`src/lib/native/` is the only part that knows it may be on Android. iPhones use
the installable web app.

1. Install **Android Studio 2025.2.1 or later**. It brings the Android SDK and
   its own JDK.
2. Set `ANDROID_APP_URL` in `.env.local` (see `.env.example`).
   `http://10.0.2.2:3000` reaches `npm run dev` from the emulator.
3. Run `npm run android:sync`, then `npm run android:open`, and run it from
   Android Studio.

A release build uses the deployed HTTPS address. Only CI signs it
(`.github/workflows/android.yml`, run by hand), with the upload key held as a
secret. [`docs/ANDROID.md`](./docs/ANDROID.md) is the guide to Play.

---

## Pictures the app makes of itself

- **The landing page's screenshots** (`src/assets/landing/`):
  `scripts/landing-shots.mts` builds a demo business with a month of orders,
  photographs it, and deletes it again. It works only against the local
  Supabase.
- **The picture a shared link shows** (`src/app/opengraph-image.jpg` and
  `twitter-image.jpg`): `scripts/og-image.mts` draws it from the landing page's
  own fonts, colours and phone frame.
- **The brand's marks** (`src/assets/brand/`, the app's icons, and the PNGs
  the emails show in `public/email/`): `node scripts/brand.mjs`, from the
  design references, which are not committed.

Both pictures scripts need the built app running on port 3100:

```bash
npm run build && npx next start -p 3100              # in another terminal
npx tsx --env-file=.env.local scripts/landing-shots.mts
npx tsx scripts/og-image.mts
```

**Emails** (`src/lib/mail/templates/`) are drawn in the same world: the
wordmark, a card, one dark button, and the brand's line. Their links and
pictures come from `NEXT_PUBLIC_APP_URL`, so the pictures only show once that
address serves the app. Locally, read them in Mailpit.
