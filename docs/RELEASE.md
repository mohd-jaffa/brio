# Releasing Brio

How a version of Brio goes out: numbering it, tagging it on GitHub, and having
it deployed to Vercel by the release workflow. Part A says what happens. Part B
is done once, before the first release. Part C is done for every release.
Part D covers what to do when a release goes wrong. Part E is the text for
the v1.0.0 release notes.

---

## A. What a release is

A release is a **GitHub release** whose tag is `v` and three numbers, such as
`v1.0.0`. The numbers must match `version` in `package.json`. Publishing the
release starts `.github/workflows/release.yml`:

```text
Publish the release "v1.0.0" on GitHub
        │
        ▼
version   the tag is v1.0.0, and package.json says 1.0.0      (seconds)
        │
        ▼
checks    every CI gate again, on that tag: lint, format, types,
          unit tests, integration tests, the build, the journeys   (~10 min)
        │
        ▼
migrate   the new migrations applied to the hosted Supabase      (~1 min)
        │
        ▼
deploy    that tag built and deployed to Vercel as production    (~3 min)
          (waits for your approval, if you asked for it in B3)
```

Each job waits for the one before it, and the first failure stops the rest.
Until part B is done, `migrate` and `deploy` each leave a note saying they
are not set up, and change nothing. Pushing to `main` never deploys; only a
published release does.

**Version numbers** follow [Semantic Versioning](https://semver.org):

- **Patch** (1.0.**1**): fixes, nothing new to learn.
- **Minor** (1.**1**.0): something new, and everything that worked still works.
- **Major** (**2**.0.0): a change owners must know about before they update, or
  that needs something done by hand.

The same number appears in Settings → About. It is also the Android app's
version name, so an Android build made from the tag carries it too.

---

## B. Once, before the first release

Do these in order. Each gives you values that a later step needs.

### B1. Vercel

1. **Make an account** at [vercel.com](https://vercel.com), and install the
   command-line tool on your Mac:

   ```bash
   npm install --global vercel
   vercel login
   ```

2. **Create the project from this folder.** This links the folder to a new
   Vercel project and writes `.vercel/project.json`, which git ignores:

   ```bash
   cd ~/projects/ovenly
   vercel link
   ```

   Answer: set up this folder → **yes**; which scope → your account or team;
   link to an existing project → **no**; the project's name → `brio`; the code's
   directory → `./`. Vercel recognises Next.js by itself; keep the settings it
   suggests.

3. **Keep deploys to releases only.** A project made with `vercel link` is not
   connected to GitHub, so a push deploys nothing. That is what you want: the
   release workflow deploys.

   If you connect the repository in the Vercel dashboard later (for example,
   for preview links on pull requests), stop pushes to `main` from going to
   production:
   - go to Project → Settings → Git → **Ignored Build Step**;
   - choose **Custom**, and enter `exit 0`.

4. **Project settings** (Project → Settings):
   - **Node.js Version:** 22.x, as `.nvmrc` says.
   - **Functions → Region:** the region nearest your Supabase project. For a
     Supabase project in Mumbai (`ap-south-1`), that is **Mumbai, `bom1`**.
     Every screen reads the database, so the two should be close.

5. **Environment variables** (Project → Settings → Environment Variables).
   Add each to **Production**, with the values for the hosted services. They
   are the variables `src/lib/env/server.ts` checks; `.env.example` explains
   each one.

   | Variable | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://<project-ref>.supabase.co` (B2) |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the project's anon key (B2) |
   | `SUPABASE_SERVICE_ROLE_KEY` | the project's service-role key (B2); mark it **Sensitive** |
   | `NEXT_PUBLIC_APP_URL` | the address people will use, e.g. `https://app.yourdomain.com`, with no `/` at the end. Links in emails, the pictures they show, and a shared link's preview are all made from it |
   | `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | your mail provider's settings |
   | `SUPPORT_EMAIL` | the address the privacy policy gives for questions about data |
   | `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | from `npx web-push generate-vapid-keys`; make them once, and keep them |
   | `CRON_SECRET` | from `openssl rand -hex 32`; also goes into Supabase (B2, step 5) |
   | `ANDROID_CERT_FINGERPRINTS` | empty until the Android app is on Play (`docs/ANDROID.md`) |

   Do not add `NODE_ENV`: Vercel sets it. A `NEXT_PUBLIC_` value is built into
   the app, so after changing one, release again or redeploy (D3).

6. **Your domain** (Project → Settings → Domains): add it, and set the DNS
   records Vercel shows at your domain's registrar. Wait until Vercel shows it
   as valid. `NEXT_PUBLIC_APP_URL` must be exactly this address.

7. **The three values GitHub needs:**
   - **`VERCEL_TOKEN`:** Account Settings → Tokens → Create. Scope it to the
     project's team, and give it an expiry you will remember to renew.
   - **`VERCEL_ORG_ID`** and **`VERCEL_PROJECT_ID`:** `orgId` and `projectId`
     in `.vercel/project.json`.

### B2. Supabase (the hosted database)

1. **Create the project** at [supabase.com](https://supabase.com), in the
   region nearest your owners (for India, **Mumbai**). Choose a strong database
   password and keep it: it is `SUPABASE_DB_PASSWORD`.

2. **Note its values** (Project Settings → API, and Data API):
   - the **project reference**: the `xxxx` in `https://xxxx.supabase.co`;
   - the **URL**, the **anon key** and the **service-role key**, for B1's
     step 5.

3. **Authentication settings** (Authentication → Sign In / Providers, and URL
   Configuration). These match `supabase/config.toml`:
   - **Site URL:** the value of `NEXT_PUBLIC_APP_URL`.
   - **Redirect URLs:** add `NEXT_PUBLIC_APP_URL` followed by `/confirm-email`.
   - **Email:** on, with **Confirm email off**. Brio sends its own
     confirmation through your mail provider.
   - **Phone:** on, with **Confirm phone off**. Brio signs in with the number
     and a password, and never sends a text message.

4. **The tables.** The release workflow applies every migration that the
   hosted database lacks, which on the first release is all of them
   (`supabase/migrations`, 0001 to 0036). You can apply them once from your
   Mac first, to see them go in:

   ```bash
   supabase login
   supabase link --project-ref <project-ref>
   supabase db push --dry-run     # lists what would be applied
   supabase db push
   ```

5. **The order-reminder scheduler.** The database calls the app every five
   minutes to push reminders for orders due. Tell it where, once, in the SQL
   Editor. Use your address and the same `CRON_SECRET` as in Vercel:

   ```sql
   select vault.create_secret('https://app.yourdomain.com/api/cron/due-orders', 'due_order_sweep_url');
   select vault.create_secret('<CRON_SECRET>', 'due_order_sweep_secret');
   ```

   The hourly clean-up of logs older than seven days needs nothing; its
   migration schedules it.

6. **An access token for GitHub:** Account → Access Tokens → Generate. This is
   `SUPABASE_ACCESS_TOKEN`.

7. **A developer account, if you want the developer console** (`/admin`;
   AGENTS.md §8). Once the app is live:
   - in Authentication → Users, add a user with a phone number and a
     password;
   - then, in the Table Editor, add a `profiles` row for that user's id, with
     the role `DEV` and no business.

### B3. GitHub

1. **Secrets and variables** (the repository's Settings → Secrets and
   variables → Actions):
   - **Secrets tab → New repository secret**, one for each: `VERCEL_TOKEN`,
     `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `SUPABASE_ACCESS_TOKEN`,
     `SUPABASE_DB_PASSWORD`.
   - **Variables tab → New repository variable:** `SUPABASE_PROJECT_REF`, set
     to the project reference.

2. **The production environment** (Settings → Environments). It appears after
   the first release has run; you can also make it now with **New environment**,
   named exactly `production`. Then:
   - **Required reviewers:** add yourself. Every release then waits, after the
     checks and the migrations, until you press **Approve and deploy** on its
     run.
   - **Deployment branches and tags:** choose **Selected branches and tags**,
     and add the tag rule `v*`, so nothing but a release tag can deploy.

3. **Rules** (Settings → Rules → Rulesets → New ruleset):
   - **For `main`** (target: the default branch): tick **Require status checks
     to pass**, and add both CI checks, **Lint, format, types and unit tests**
     and **Integration, build and journeys**. Tick **Block force pushes**.
   - **For tags** (New tag ruleset; target pattern `v*`): tick **Restrict
     updates** and **Restrict deletions**. A released tag then always means
     the same code.

4. **Actions permissions** (Settings → Actions → General): leave **Workflow
   permissions** at *Read repository contents*. The release workflow needs no
   more.

---

## C. Every release

### C1. Set the version

Choose the number (A), and set it in `package.json` and `package-lock.json`
together:

```bash
npm version 1.0.0 --no-git-tag-version
```

### C2. Write it down

1. Add an entry to the end of `changelog.md`, dated today, headed with the
   version. Say what is in it, and what the hosted database gets. For v1.0.0:

   ```markdown
   ## 2026-10-01 — Release v1.0.0

   ### Release
   - Brio 1.0.0, the first release. Notes: docs/RELEASE.md, part E.

   ### Migration notes
   - A new hosted database gets every migration, 0001 to 0036.

   ### Blockers
   - None.
   ```

2. Draft the release notes: for v1.0.0 they are part E, ready to paste. For
   a later release, write them as below.

#### What goes in the release notes

They are for the people who use Brio, and for you when you set it up. Write
what changed for them, in plain words, not the commits.

1. **Collect what changed** since the last release (here `v1.0.0`; use the
   last tag you published):

   ```bash
   git log v1.0.0..HEAD --oneline                       # every commit since
   git diff --name-only v1.0.0..HEAD -- supabase/migrations   # new migrations
   git diff v1.0.0..HEAD -- .env.example                # new or changed settings
   ```

   and read the `changelog.md` entries dated after the last release. Each
   entry says what changed, why, and what the database gets.

2. **Write these sections**, leaving out any that are empty:

   | Section | What goes in it |
   |---|---|
   | A one-line summary | What this release is about, under the title. |
   | **New** | Each new thing someone can do, one line each, grouped by screen (Orders, Home, Bills, Customers, Products, stock and money, Reminders, Your account, Everywhere), as part E does. |
   | **Changed** | What works or looks differently now, and why it is better. |
   | **Fixed** | What was wrong, as the user saw it, now right. |
   | **For developers** | Changes to the console, the logs, CI or the release itself. |
   | **Setting it up** | Every new migration by number (the release applies them; say what each adds). Every new or changed environment variable or GitHub secret, and where to set it (B1, step 5; B3) — **set these before you publish**. Any one-time step, such as a new Vault secret (B2). |
   | **Before you update** | Only if something breaks for someone already using Brio: what they must do. |

3. **Leave out** secrets, keys, passwords, internal file paths and anything
   about a private customer. Never promise what the release does not do.

A later release's notes then look like this:

```markdown
**Brio 1.1.0**

One line on what this release is about.

### New
- …

### Changed
- …

### Fixed
- …

### Setting it up
- The release applies migrations 0037 to 0039: …
- New environment variable `…` in Vercel (Production), before publishing.
```

GitHub's **Generate release notes** button lists the commits and pull
requests since the last tag. Use it as a reminder of what changed, then
rewrite it as above.

### C3. Commit, push, and wait for green

```bash
git add package.json package-lock.json changelog.md
git commit -m "chore(release): v1.0.0"
git push origin main
```

Open the repository's **Actions** tab and wait until the **CI** run for this
commit shows both jobs green. Do not release a red commit; the release would
stop at `checks` anyway.

### C4. Publish the release on GitHub

1. Open the repository's **Releases** (the right-hand column of the Code tab),
   then **Draft a new release**.
2. **Choose a tag:** type `v1.0.0`, and pick **Create new tag: v1.0.0 on
   publish**.
3. **Target:** `main`. It must be the commit from C3; if anything was pushed
   after it, pick that commit under **Recent commits** instead.
4. **Release title:** `Brio 1.0.0`.
5. **Description:** paste the notes (part E for v1.0.0).
6. Tick **Set as the latest release**; leave **Set as a pre-release** unticked.
7. **Publish release.**

**From the terminal instead**, tag the commit and publish the release with the
GitHub CLI:

```bash
git tag -a v1.0.0 -m "Brio 1.0.0"
git push origin v1.0.0
gh release create v1.0.0 --title "Brio 1.0.0" --notes-file notes.md --latest
```

Pushing the tag alone deploys nothing: publishing the release starts the
workflow.

### C5. Watch it go out

In the **Actions** tab, open the **Release** run:

1. **Tag matches the version.** A failure here means `package.json` does not
   say the tag's number. See D1.
2. **Every gate, on the tag.** About ten minutes.
3. **Hosted database migrations.**
4. **Deploy to Vercel.** If you asked for approval (B3), press **Review
   deployments → Approve and deploy**. When it is done, the run shows the
   address it deployed.

### C6. Check it is live

On the production address, in a private window:

- [ ] The site's address shows the landing page, a shared link to it shows
      Brio's picture (paste it into WhatsApp), and Settings → About shows the new
      version.
- [ ] Register a new account. The confirmation email arrives, and the welcome
      shows once after signing in.
- [ ] Create an order. Open its bill, then **Share** and **Download PDF**.
- [ ] Move the order to Ready, then Delivered. Home and the stock follow it.
- [ ] Sign in as the developer (B2, step 7). `/admin` shows the accounts, the
      error log and the audit log.
- [ ] In Vercel, Project → **Logs** shows no errors. In Supabase, the SQL
      Editor shows the scheduler running:

      ```sql
      select jobname, status, start_time from cron.job_run_details order by start_time desc limit 10;
      ```

Delete the test account afterwards, from Settings → Delete account.

### C7. The Android app (when you release it)

Build it from the same tag, so it carries the same version name. In the
**Actions** tab, open **Android release** → **Run workflow** → **Use workflow
from: Tags → v1.0.0**. Then follow `docs/ANDROID.md` to upload it to Play.

---

## D. When something goes wrong

### D1. The release stopped before `deploy`

- **What changed:** nothing live changed. If it stopped at `deploy`, after
  `migrate`, the hosted database has the new migrations, and the old app keeps
  running on them. Migrations only ever add, so it can.
- **What to do:** fix the cause on `main`, choose the next patch number
  (v1.0.1), and release that.
- **Never move or reuse a tag.** The tag ruleset (B3) stops you: v1.0.0 should
  always mean the same code.

A mismatched version (the first job) is the exception. If the release has not
deployed anything:

1. delete the release on GitHub (Releases → the release → Delete);
2. delete its tag. The tag ruleset (B3) refuses this until you add yourself
   to its bypass list, or turn it off for a moment:

   ```bash
   git push origin --delete v1.0.0
   git tag -d v1.0.0
   ```

3. set the version (C1), push, and publish again.

### D2. The new version is live, and wrong

1. **Put the previous version back at once.** In Vercel, go to the
   project's **Deployments**, open the one before (it says *Production* ·
   *Current* until replaced), and choose **Instant Rollback**. From the
   terminal instead:

   ```bash
   vercel rollback
   ```

   This takes seconds, and builds nothing.
2. **The database is not rolled back.** Migrations are written so the version
   before them keeps working. If one is wrong, the fix is a new migration in
   the next release.
3. **Fix it on `main`, and release a patch** (v1.0.1). The release replaces the
   rollback.

### D3. Deploy a released version again

For example, after changing an environment variable in Vercel:

1. open **Actions → Release → Run workflow**;
2. under **The release tag to deploy again**, enter the tag, e.g. `v1.0.0`;
3. press **Run workflow**.

It runs the same four jobs for that tag.

---

## E. Release notes for v1.0.0

Paste everything below the line as the release's description (C4).

---

**Brio 1.0.0 — Made by you. Managed simply.**

The first release of Brio, the order book for businesses run from home: home
bakers, hamper makers, florists and gift makers. Orders come in on WhatsApp
or a call; Brio keeps them, with the customers, the stock and the money, in
one place, on a phone, a tablet or a computer.

### Orders
- Take an order in a few taps: pick from your products or add a custom item,
  choose a saved customer, add a new one on the spot, or keep it as a guest.
- Pickup or delivery, with the day and time it is due; charges and discounts;
  paid in full, part paid or unpaid when it is placed.
- Stock is set aside the moment an order is placed, so nothing is promised
  twice. It is used when the order is delivered, and put back if the order
  is cancelled.
- Move an order through Pending, Preparing, Ready, Out for delivery and
  Delivered, or cancel it. An open order can still be changed.
- Search and filter every order by status, payment, customer and due date.

### Home
- It opens on what needs you now: orders late, due today and due tomorrow;
  money still to collect; stock running low.
- Sales, orders, top products and recent customers for today, the week or
  the month.

### Bills
- A clean bill for every order, with your business's name, logo, catch phrase
  and address. Share it as an image, or download it as a PDF. See the estimate
  before an order is placed.
- Bills are made when you ask for them, and never stored.

### Customers
- Each customer's orders, what they have spent and what they still owe, with
  Call and WhatsApp a tap away. Tabs for regulars, new customers and balances
  due.
- Guest orders counted together as Guest sales.

### Products, stock and money
- Products with pictures from Brio's own illustration library, sold by the
  piece, kilo, box, dozen, set, bunch or pack.
- Stock kept as a ledger: stock in, adjustments, wastage and returns, with low
  stock flagged.
- Expenses by category, with categories of your own.
- Analytics for any stretch of time: sales, orders, the average order, best
  sellers, customers, and expenses beside sales.

### Reminders
- A bell and an inbox for orders coming due and orders overdue.
- Reminders pushed to your browser, or set on your phone by the Android app.

### Your account
- Register with your business's details, confirm your email, and sign in with
  your mobile number.
- Forgotten password? A temporary one comes by email.
- Change your name, number, email and profile picture.
- Business details, with your logo, printed on every bill.
- Two looks, Golden and Peach.
- A short welcome, once, for a new account.
- Emails in Brio's own look, with its name and logo: confirming your email, a
  new email address, and a temporary password.
- Delete your account and everything in it from Settings, at any time. The
  privacy policy is at `/privacy`.

### Everywhere
- A phone, a tablet and a computer, each laid out for its screen.
- Install it on a phone's home screen from the browser, or use the Android
  app.
- A landing page at the site's own address shows what Brio does: a day's
  work, taking an order to the month's costs, on Brio's own screens, on one
  phone held beside the steps on a tablet or a computer, and step by step on
  a phone. The sign-in screen links to it. The app itself starts at `/home`.
- A link to Brio shared on WhatsApp, or anywhere else, shows its name, what it
  is, and a picture of it.

### For developers
- A developer console at `/admin`: every account, an error log of what failed
  on the server, and the audit log of every change. Both logs are kept for
  seven days.
- Checks on every push: lint, format, types, unit tests, integration tests
  against a real database, the build and browser journeys. A release runs them
  again on its tag before it deploys.

### Setting it up
- A new hosted database gets every migration, 0001 to 0036, from the release
  workflow.
- The environment it needs is listed in `docs/RELEASE.md` (B1, step 5).
