# Brio — Home Business Management Platform

*Made by you. Managed simply.* The code and the repository keep the name `ovenly`.

A mobile-first management app for home bakers: orders, customers, products,
stock, expenses and bills.

The product and architecture specification is
[`home-bakery-management-platform-plan.md`](./home-bakery-management-platform-plan.md),
and it is the source of truth. How to work in this repository is in
[`AGENTS.md`](./AGENTS.md).

---

## Running it locally

### What you need

- **Node 20.9 or newer.** Next 16 refuses to start on Node 18. There is an
  `.nvmrc`, so `nvm use` picks the right one.
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

### The job worker

Work the app queues — notifications now, the confirmation email with R2.5 —
is run by a separate process, not by the app:

```bash
npm run worker          # in a second terminal; Ctrl-C stops it after the job in hand
```

Without it, queued jobs simply wait. Several can run at once: each job is
claimed by exactly one.

### Signing in

The demo bakery is created by `supabase/seed.sql`:

| | |
|---|---|
| **Mobile number** | `9876543210` |
| **Password** | `Password123!` |

The country code is added for you, so `9876543210`, `09876543210` and
`+91 98765 43210` all sign in to the same account.

It belongs to **Sweet Delights Home Bakery** (Priya Baker) and comes with four
customers, five products, five orders across every status, a stock ledger, some
expenses and two payments — enough for every screen to have something real to
draw, including an overdue order and a product that is low on stock.

### Where things run

| | |
|---|---|
| App | <http://localhost:3000> |
| Supabase Studio | <http://127.0.0.1:54323> |
| Mail (Mailpit) | <http://127.0.0.1:54324> |

`supabase status` prints every URL and key the running stack is using. The app
itself needs no database connection string: it talks to Supabase over its API,
and schema changes go through the CLI.

Registration and password-reset emails are real emails — they are delivered to
Mailpit, so open it to follow a confirmation link or read a temporary password.
Nothing leaves your machine.

### Starting over

`npm run db:reset` drops the database, replays every migration and reloads the
demo data. Run it whenever the data gets into a state you did not mean.

---

## Moving to a hosted Supabase project

```bash
supabase link --project-ref <project-ref>
supabase db push          # replays supabase/migrations against the project
```

Then comment out the local block in `.env.local` and uncomment the cloud one,
filling in the three values from **Project Settings → API**. That is the whole
switch — the app reads nothing else, and there is no connection string to
change.

Do not load `supabase/seed.sql` into a hosted project — it writes a known
password into `auth.users`. Register the first account through the app instead.

The **service-role key** bypasses row-level security. It is a real secret: it
belongs in `.env.local` and in your host's environment settings, never in the
repository and never in anything the browser receives.

---

## Checks

```bash
npm run typecheck
npm run lint
npm test
```
