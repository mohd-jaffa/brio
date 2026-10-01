# Releasing Brio

How Brio goes live, and how every later version follows it. This guide is
written for one setup:

- the code in a **private repository on your personal GitHub**;
- the app on **Vercel's free Hobby plan**, in an account with a different Gmail;
- the database on **Supabase's free plan**;
- the address on a domain **bought from GoDaddy**;
- the emails sent from a **free Gmail account**.

The guide has five parts:

- **Part A** explains how these fit together, what each account can see, and
  what the free plans allow.
- **Part B** is done once, in order, before the first release.
- **Part C** is done for every release.
- **Part D** covers what to do when something goes wrong.
- **Part E** is the text for the v1.0.0 release notes.

Throughout, `yourdomain.com` stands for your domain. **The address** means
`https://www.yourdomain.com`. That is what people open and what Brio's links
and emails use, and several settings below must match it exactly.

---

## A. How it fits together

### A1. Your accounts, and what each one sees

| Account | Holds | Sees the code? |
|---|---|---|
| **GitHub**, your personal Gmail | The code and its history, the checks, the release workflow, and the keys to Vercel and Supabase. | Yes. It is the only place the code lives. |
| **Vercel** (Hobby), the Vercel Gmail | The running app, its settings and environment values, and the server's logs. | No. It gets only the built app (below). |
| **Supabase** (Free) | Every business's records and accounts, and the database the migrations build. | No. |
| **GoDaddy** | The domain. | No. |
| **Gmail**, a new Gmail only for Brio's mail | Every email Brio sends, in its Sent folder, and any replies. | No. |

**The keys go one way.** Vercel and Supabase each give GitHub a token, which
GitHub keeps as a secret. Neither of them is ever connected to GitHub, signed
in with it, or given a way into the repository:

```text
Vercel token ──────────────────┐
Supabase token, DB password ───┤
                               ▼
GitHub (private): the release workflow builds and checks Brio here
        │
        ├──► Supabase: the new migrations
        └──► Vercel: the built app, and nothing else
```

**What Vercel receives.** The release builds the app on GitHub and uploads only
the result (`vercel deploy --prebuilt`):

- the pages, and the JavaScript every visitor's browser downloads anyway;
- the server's code, compiled and minified, with no source maps;
- the pictures, fonts and icons in `public/`;
- `.env.example`, which Next.js packs beside the server. It holds the
  variables' names and the local demo values, nothing real.

It never receives `src/`, the migrations, the tests, the scripts, the docs, the
plan or the git history.

- A deploy shows its commit's message and author and the repository's address,
  but not the code.
- Before every upload, the workflow checks the upload and stops the release if
  a source file, a source map or an env file is in it
  (`scripts/check-deploy-output.mjs`).

**Never deploy from your Mac.** A deploy from the Mac would upload your
`.env.local` too. A plain `vercel` or `vercel deploy` uploads the whole folder,
code and all. Only the release workflow deploys.

**What people who share the Vercel Gmail can do.** They cannot get the code.
They can:

- read any environment value that is not marked **Sensitive**. B5 marks every
  secret Sensitive;
- see the server's logs, change the domain, and roll back or delete the
  project;
- deploy code of their own to the project.

That last one matters most. Their code would run with the production values,
Sensitive ones included. With the Supabase secret key, it could read every
business's data; with the Gmail app password, it could send as Brio and read
what Brio sent. Marking a value Sensitive hides it in the dashboard; it does
not stop this.

So the code is safe from them, but the data is only as safe as you trust them.
If that is not enough, make the Vercel account on a Gmail only you use; nothing
else in this guide changes.

**Keep the other accounts to yourself.** Use an account only you can sign in to
for:

- **Supabase**: it holds every business's data;
- **GoDaddy**: whoever holds the domain decides where Brio's address leads.

Your personal Gmail is the natural home for both.

**Brio's mail gets a Gmail of its own, used for nothing else** (B3). Its app
password is kept in Vercel, and it opens that whole mailbox, where every email
Brio sent is kept, temporary passwords included. It must not open your
personal Gmail, where GitHub and GoDaddy send their recovery emails, nor the
Vercel Gmail.

Turn on two-step verification on every account, GitHub first, because it
holds the keys to the rest.

### A2. What the free plans allow

**Vercel Hobby**

- **It is free, but only for personal, non-commercial use.** Vercel's terms
  count a deployment as commercial when it is "used for the purpose of
  financial gain of anyone involved in any part of the production of the
  project". That includes taking payment through the site, or advertising a
  product or service for sale.
  - Hobby suits Brio while Brio is free to use.
  - Once owners pay for it, Vercel requires the Pro plan.
  - If you are unsure, ask Vercel Support.
- Each month it gives a small Brio plenty of room:
  - 100 GB of data transfer;
  - 1,000,000 function calls;
  - 4 hours of active CPU;
  - 5,000 image transformations.
- The server runs in one region, which you choose (B5).
- Its firewall allows one rate-limiting rule, which B5 uses to slow down
  password guessing and floods of emails.

**Supabase Free**

- Two free projects per account, each with:
  - a 500 MB database;
  - 1 GB of files (the logos);
  - 5 GB of data out;
  - 50,000 monthly active users.
- **A project with little activity over seven days is paused.** Brio then
  stops working until you restore the project (D4). Owners using Brio every day
  keep it running.
- **There are no backups you can download.** Take your own, before every
  release and once a week (C3).

**GitHub Free, with a private repository**

- **2,000 Actions minutes a month.**
  - Every push to `main` runs CI, and every release runs it again before it
    deploys.
  - Push several commits at once rather than one at a time.
  - Your account's Settings → Billing and licensing → Usage shows how many
    minutes are used.
  - When they run out, workflows stop until the next month, unless a payment
    method is on file.
- **No approval step and no protection rules.** On GitHub Free, a private
  repository cannot use:
  - environment protection, which makes a release wait for your approval;
  - rulesets, which protect `main` and the tags.

  The release works without them. GitHub Pro adds them, and B6 says what to set
  if you have it.

**GoDaddy**

- Buy only the domain. Brio needs none of GoDaddy's hosting, website builder,
  SSL certificates or email: Vercel serves the site over HTTPS for free.

**Gmail (free)**

- Brio sends its own emails over SMTP: confirming an email address, a new
  email address, and a temporary password. A free Gmail account sends them,
  signed in with an app password (B3).
- **At most 500 emails a day.** Past that, Gmail stops sending for 1 to 24
  hours. Registrations and password resets fit easily, and B5's rate limit
  stops one person using them up quickly.
- **They come from the Gmail address**, with Brio as the sender's name:
  `Brio <brio.mail@gmail.com>`, for example. A free Gmail cannot send from an
  address on your domain, so GoDaddy needs no mail records.
- Another SMTP provider can take Gmail's place later, through the same
  variables.

### A3. What a release is

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
deploy    that tag built on GitHub, checked, and only the built
          app uploaded to Vercel as production                   (~3 min)
```

- Each job waits for the one before it, and the first failure stops the rest.
- Until part B is done, `migrate` and `deploy` each leave a note saying they
  are not set up, and change nothing.
- Pushing to `main` never deploys. Only a published release does.

**Version numbers** follow [Semantic Versioning](https://semver.org):

- **Patch** (1.0.**1**): fixes, with nothing new to learn.
- **Minor** (1.**1**.0): something new, and everything that worked still works.
- **Major** (**2**.0.0): a change that owners must know about before they
  update, or that needs something done by hand.

The same number appears in Settings → About. It is also the Android app's
version name, so an Android build made from the tag carries it too.

**Node.js is 22 everywhere.** `.nvmrc` and the `engines` field in
`package.json` both say 22: CI tests on it and Vercel runs it. Vercel takes its
Node version from `engines`, not from its dashboard. When Node 22's support
ends (April 2027), change both together, in a release of its own.

---

## B. Once, before the first release

Do these steps in order. Each one gives you values that a later step needs.

- **Keep every value in a password manager as you go.** Never put one in the
  repository, in a note inside the project folder, or in a chat.
- **You need on your Mac:** Docker running, the Supabase CLI, and Node 22
  (`nvm use`), as in the README.

### B1. The domain (GoDaddy)

1. **Buy the domain** at [godaddy.com](https://www.godaddy.com), on your
   personal Gmail (A1).
   - Decline the extras (A2).
   - Turn on **auto-renew**. If the domain lapses, Brio's address stops working.
2. **Buy it before the first release.** An installed Brio and its reminders
   belong to the address they were installed from. Moving to a new address
   later means every owner installs Brio again and turns reminders on again.

There is nothing to set at GoDaddy yet; B5 adds the records.

### B2. Brio's own keys

On your Mac, in the project folder:

```bash
openssl rand -hex 32                 # CRON_SECRET
npx web-push generate-vapid-keys     # the push key pair
```

Save three values:

- **`CRON_SECRET`**: the first line.
- **`NEXT_PUBLIC_VAPID_PUBLIC_KEY`**: the Public Key.
- **`VAPID_PRIVATE_KEY`**: the Private Key.

Make the key pair once, and keep it. A new pair silently stops the reminders on
every browser that turned them on.

### B3. Mail (Gmail)

Brio sends its emails through a free Gmail account, over SMTP, signed in with
an app password.

1. **Make a new Gmail for it**, such as `brio.mail@gmail.com`, and use it for
   nothing else (A1).
   - Owners see this address as the sender, so choose one that reads well.
   - Keep its password and recovery details in your password manager.
2. **Turn on 2-Step Verification** for it, at
   [myaccount.google.com/signinoptions/twosv](https://myaccount.google.com/signinoptions/twosv).
   Google offers app passwords only with it on.
   - Use a phone or an authenticator app as a second step. With security keys
     only, Google offers no app passwords.
3. **Make an app password** at
   [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords),
   signed in to that Gmail.
   - Name it `Brio`, and choose **Create**.
   - Google shows 16 letters once, in four groups. Copy them without the
     spaces. This is `SMTP_PASSWORD`.
   - **Changing that Gmail's password cancels the app password**, and Brio's
     emails stop until you make a new one (D7).
4. **Check that Gmail accepts it**, on your Mac, in the project folder. It asks
   for the app password without showing it, and keeps it out of your shell's
   history. It is written for the Mac's own shell, zsh. Put the new Gmail
   address in place of `brio.mail@gmail.com` at the end:

   ```bash
   cd ~/projects/ovenly
   read -s "P?App password: " && echo
   P="$P" node -e '
     const [user] = process.argv.slice(1);
     require("nodemailer")
       .createTransport({ host: "smtp.gmail.com", port: 465, secure: true, auth: { user, pass: process.env.P } })
       .verify()
       .then(() => console.log("Gmail accepts the app password."), (e) => console.error("Gmail refused it:", e.message));
   ' brio.mail@gmail.com
   unset P
   ```

   - **"Gmail accepts the app password."** You are done.
   - **"Gmail refused it: Invalid login …"**, which can take a minute to
     appear: the address or the app password is wrong. Check both, or make a
     new app password.

The mail settings for B5:

| Variable | Value |
|---|---|
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `465` |
| `SMTP_SECURE` | `true` |
| `SMTP_USER` | the Gmail address, in full |
| `SMTP_PASSWORD` | the app password, without spaces |
| `SMTP_FROM` | `Brio <brio.mail@gmail.com>`, with the same Gmail address |

- **`SMTP_FROM` must be the same Gmail address.** Gmail puts the account's own
  address in place of any other.
- **Nothing is needed at GoDaddy** for mail.
- **Replies go to that Gmail.** Read it now and then. If you leave
  `SUPPORT_EMAIL` out (B5), the privacy policy gives this address too.

### B4. Supabase (the hosted database)

1. **Create the project** at [supabase.com](https://supabase.com), on an
   account only you use (A1).
   - Name: `brio`.
   - Region: nearest your owners. For India, **South Asia (Mumbai)**.
   - Plan: Free.
   - Choose a strong database password and keep it. It is
     `SUPABASE_DB_PASSWORD`.

2. **Note its values**, from Project Settings → API Keys and the project's
   home page:

   | Value | What it is | It becomes |
   |---|---|---|
   | The project reference | the `xxxx` in `https://xxxx.supabase.co` | `SUPABASE_PROJECT_REF` |
   | The URL | `https://xxxx.supabase.co` | `NEXT_PUBLIC_SUPABASE_URL` |
   | The **publishable key** | `sb_publishable_…` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
   | A **secret key** | `sb_secret_…` | `SUPABASE_SERVICE_ROLE_KEY` |

   A new project has these newer keys, and Brio takes them in place of the
   older `anon` and `service_role` keys. If the project shows only the older
   keys, those work the same way.

   **The secret key is the most dangerous value in this guide.** It bypasses
   every access rule and reads every business's data. Never commit it, share
   it, or send it to the browser.

3. **Authentication settings** (Authentication → Sign In / Providers, and URL
   Configuration). They match `supabase/config.toml`:
   - **Site URL:** the address.
   - **Redirect URLs:** add `https://www.yourdomain.com/confirm-email`.
   - **Email:** on, with **Confirm email** off. Brio sends its own
     confirmation through Gmail (B3).
   - **Phone:** on, with **Confirm phone** off. Brio signs in with the number
     and a password, and never sends a text message. If Supabase asks for an
     SMS provider before Phone can be turned on:
     - choose Twilio;
     - enter placeholder values in the shape `supabase/config.toml` uses:
       Account SID `AC` followed by 32 letters, Message Service SID `MG`
       followed by 32 letters, and any Auth Token.

     Nothing is ever sent through it.

4. **The tables.** The release workflow applies every migration the hosted
   database lacks; on the first release, that is all of them (0001 to 0036).
   Link your Mac to the project now as well, since the backups in C3 need it:

   ```bash
   supabase login                               # the Supabase account
   supabase link --project-ref <project-ref>    # asks for the database password
   supabase db push --dry-run                   # lists what would be applied
   ```

   From here on, `supabase db push` on your Mac changes the live database. Leave
   that to the release workflow. `npm run db:reset` and the rest still work on
   the local database only.

5. **The order-reminder scheduler.** The database calls Brio every five
   minutes to push reminders for orders coming due. Tell it where, once, in the
   SQL Editor, using the address and `CRON_SECRET` (B2):

   ```sql
   select vault.create_secret('https://www.yourdomain.com/api/cron/due-orders', 'due_order_sweep_url');
   select vault.create_secret('<CRON_SECRET>', 'due_order_sweep_secret');
   ```

   - Use the address exactly as it is, with `www`. A call to the bare domain is
     redirected, and the scheduler does not follow redirects.
   - The hourly clean-up of logs older than seven days needs nothing; its
     migration schedules it.

6. **An access token for GitHub.** Go to
   [Account → Access Tokens](https://supabase.com/dashboard/account/tokens) →
   **Generate new token**. This is `SUPABASE_ACCESS_TOKEN`.

7. **A developer account, if you want the developer console** (`/admin`;
   AGENTS.md §8). Do this after the first release.

   1. Go to Authentication → Users → **Add user → Create new user**. Enter an
      email and a password, and tick **Auto Confirm User**.
   2. In the SQL Editor, give that user a sign-in number and a developer's
      profile. Use the user's email, and the number with `91` in front: no
      `+` in `auth.users`, and a `+` in `profiles`.

   ```sql
   update auth.users set phone = '91XXXXXXXXXX', phone_confirmed_at = now()
    where email = 'dev@yourdomain.com';

   insert into public.profiles (id, phone, email, name, role, bakery_id, email_confirmed_at)
   select id, '+91XXXXXXXXXX', email, 'Brio Developer', 'DEV', null, now()
     from auth.users where email = 'dev@yourdomain.com';
   ```

   The developer then signs in with that number, and is taken to `/admin`.

### B5. Vercel

Vercel never sees the code (A1). You make the project from the command line
without connecting it to GitHub, and only the release workflow ever deploys to
it.

1. **Make the account, or sign in,** at [vercel.com](https://vercel.com) with
   the Vercel Gmail. **Never choose "Continue with GitHub"**, now or later. The
   account stays on the free **Hobby** plan.

2. **Create the project from your Mac.** This only creates an empty project
   and writes `.vercel/project.json`, which git ignores. It uploads nothing.

   ```bash
   cd ~/projects/ovenly
   npx vercel login        # sign in with the Vercel Gmail, not with GitHub
   npx vercel link         # never add --yes: it would connect GitHub for you
   ```

   Answer its questions:

   | Question | Answer |
   |---|---|
   | Set up this folder? | **yes** |
   | Which scope? | your account |
   | Link to an existing project? | **no** |
   | The project's name? | `brio` |
   | The code's directory? | `./` |
   | Modify the detected settings? | **no** (Vercel recognises Next.js) |
   | **Connect this Git repository** to deploy on every push? | **no** |

   For anything else, take the default. Never answer yes to connecting Git or
   to deploying.

3. **Take the two ids, then sign out**, so nothing on your Mac can deploy by
   mistake:

   ```bash
   cat .vercel/project.json     # "orgId" is VERCEL_ORG_ID, "projectId" is VERCEL_PROJECT_ID
   npx vercel logout
   rm -rf .vercel
   ```

4. **Check that Git is not connected.** In the Vercel dashboard, open the
   project → Settings → **Git**. It must offer to connect a repository, not
   name one. If it names one, choose **Disconnect**.

5. **Project settings** (Project → Settings):
   - **Build and Deployment → Node.js Version:** 22.x. Vercel takes 22 from
     `package.json` anyway (A3).
   - **Functions → Function Regions:** the region nearest your Supabase project.
     For Mumbai, that is **Mumbai, `bom1`**. Every screen reads the database,
     so the two should be close.

6. **Environment variables** (Project → Settings → Environment Variables).
   - Add each one to **Production** only.
   - Where the table says **Sensitive**, switch **Sensitive** on before saving.
     A Sensitive value can never be read back, even by you, so keep it in your
     password manager.

   These are the variables `src/lib/env/server.ts` checks; `.env.example`
   explains each one.

   | Variable | Value | Sensitive |
   |---|---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | the URL (B4) | no |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the publishable key (B4) | no |
   | `SUPABASE_SERVICE_ROLE_KEY` | the secret key (B4) | **yes** |
   | `NEXT_PUBLIC_APP_URL` | the address, with no `/` at the end. Email links, the pictures emails show, and a shared link's preview are all made from it. | no |
   | `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_FROM` | from B3 | no |
   | `SMTP_PASSWORD` | the Gmail app password (B3) | **yes** |
   | `SUPPORT_EMAIL` | optional: an address you read, which the privacy policy shows to everyone. Left out, the policy gives Brio's Gmail (B3). | no |
   | `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | from B2 | no |
   | `VAPID_PRIVATE_KEY` | from B2 | **yes** |
   | `CRON_SECRET` | from B2, the same value as in the Vault (B4) | **yes** |

   - **Leave out** `NODE_ENV` (Vercel sets it) and `VAPID_SUBJECT` (it falls
     back to the privacy policy's address).
   - **Leave out `ANDROID_CERT_FINGERPRINTS`** until the Android app is on
     Play (`docs/ANDROID.md`).
   - **After changing any value, deploy again** (D3). A deployment keeps the
     values it was made with.
   - **A `NEXT_PUBLIC_` value is built into the app**, and is never a secret:
     the browser can see it.

7. **Your domain** (Project → Settings → Domains).
   1. **Add `yourdomain.com`.** Choose Vercel's recommended option: add
      `www.yourdomain.com`, and redirect `yourdomain.com` to it.
   2. **Note the records Vercel shows.** It shows one for each name:
      - for `yourdomain.com`, an **A** record whose value is an IP address;
      - for `www`, a **CNAME** record whose value ends in `vercel-dns…com`.
   3. **Set them at GoDaddy** (Domain Portfolio → your domain → **DNS**):
      - **The A record named `@`.** GoDaddy points it at a parking page.
        Choose **Edit**, set the value to Vercel's IP address, and save.
        Delete any other A or AAAA record named `@`.
      - **The CNAME record named `www`.** GoDaddy points it at `@`. Choose
        **Edit**, set the value to Vercel's CNAME, and save.
      - **Forwarding.** If any is set (your domain → **Forwarding**), remove
        it.
   4. **Leave the rest alone.** Keep the NS and SOA records and anything else
      GoDaddy put there, and do not change the nameservers. Brio's mail needs
      no records (B3).

   Within minutes to a few hours, Vercel shows both names as **Valid
   Configuration** and issues the HTTPS certificate itself.

8. **A rate limit on signing in, after the first release.** Brio has no
   limiter of its own (plan, R6.2); Vercel's firewall stands in, counting each
   IP address's requests to the routes that check a password or send an email.
   Hobby allows one such rule.

   1. Open the project → **Firewall** → **Configure** → **+ New Rule**.
   2. **Name:** `Sign-in and emails`.
   3. **If** **Request Path** **Is any of**:
      - `/api/auth/login`
      - `/api/auth/register`
      - `/api/auth/password-reset`
      - `/api/auth/resend-confirmation`
      - `/api/auth/email/resend`
   4. **AND** **Method** **Equals** `POST`.
   5. **Then:** **Rate Limit**, **Fixed Window**:
      - **Time Window:** 10 minutes (600 seconds);
      - **Request Limit:** 20;
      - **Key:** IP;
      - the action left at **Default (429)**.
   6. **Save Rule**, then **Review Changes** → **Publish**.

   - Someone past the limit sees "Something went wrong. Please try again."
     until the ten minutes pass.
   - It slows one person down. It cannot stop many addresses at once.
   - **Leave Attack Challenge Mode off**, and never add a Challenge or Deny
     rule for every visitor. The database's scheduler calls Brio without a
     browser, and would be refused (B4, step 5).

9. **A token for GitHub.** Go to Account Settings → **Tokens → Create**.
   - Scope: your account.
   - Expiry: one year, with a reminder in your calendar to replace it (D5).
   - This is `VERCEL_TOKEN`. Vercel shows it once.

### B6. GitHub

1. **Lock the account down.**
   - **Private repository:** the repository's name carries a **Private**
     label.
   - **Two-factor authentication:** your account's Settings → Password and
     authentication.
   - **No third-party access:** under Settings → Applications, **Installed
     GitHub Apps** and **Authorized OAuth Apps** must not list Vercel or
     Supabase. If either appears, revoke it.

2. **Secrets and the variable.** Open the repository's Settings → Secrets and
   variables → Actions.
   - **Secrets tab → New repository secret.** Add one for each of
     `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`,
     `SUPABASE_ACCESS_TOKEN` and `SUPABASE_DB_PASSWORD`.
   - **Variables tab → New repository variable.** Add `SUPABASE_PROJECT_REF`,
     set to the project reference.

   A secret can be replaced but never read back. A workflow log shows it as
   `***`.

3. **Actions permissions** (Settings → Actions → General). Leave **Workflow
   permissions** at *Read repository contents*. The release workflow needs no
   more.

4. **Only with GitHub Pro.** On GitHub Free these settings are not offered for
   a private repository, and the release works without them (A2).
   - **The `production` environment** (Settings → Environments → New
     environment, named exactly `production`):
     - **Required reviewers:** add yourself. Every release then waits, after
       the checks and the migrations, until you press **Approve and deploy**.
     - **Deployment branches and tags:** choose **Selected branches and tags**,
       and add the tag rule `v*`.
   - **Rulesets** (Settings → Rules → Rulesets):
     - **For `main`:** require both CI checks to pass (**Lint, format, types
       and unit tests** and **Integration, build and journeys**), and block
       force pushes.
     - **For the tags `v*`:** restrict updates and deletions, so a released
       tag always means the same code.

### B7. Before the first release, check

- [ ] Gmail accepts the app password (B3, step 4).
- [ ] Supabase: the authentication settings are set (B4, step 3), your Mac
      is linked (B4, step 4), and the scheduler's two Vault secrets are in
      (B4, step 5).
- [ ] Vercel: the project names no Git repository (B5, step 4). Every variable
      in B5, step 6 is in Production, with the secrets marked Sensitive. Both
      domain names show **Valid Configuration**.
- [ ] Your Mac is signed out of Vercel, and the project folder has no
      `.vercel` (B5, step 3).
- [ ] GitHub: five secrets and one variable (B6, step 2).

Then make the release (part C).

---

## C. Every release

### C1. Set the version

**For v1.0.0 this is done:** `package.json` and `package-lock.json` both say
1.0.0.

For a later release, choose the number (A3), and set it in both files
together:

```bash
npm version 1.0.1 --no-git-tag-version
```

### C2. Write it down

1. **Add an entry to the end of `changelog.md`**, dated today and headed with
   the version. Say what is in it, and what the hosted database gets. For
   v1.0.0:

   ```markdown
   ## 2026-10-01 — Release v1.0.0

   ### Release
   - Brio 1.0.0, the first release. Notes: docs/RELEASE.md, part E.

   ### Migration notes
   - A new hosted database gets every migration, 0001 to 0036.

   ### Blockers
   - None.
   ```

2. **Draft the release notes.** For v1.0.0 they are part E, ready to paste. For
   a later release, write them as below. They appear on the repository's
   Releases page, which only you can see while the repository is private.

#### What goes in the release notes

They are for the people who use Brio, and for you when you set it up. Write
what changed for them, in plain words, not the commits.

1. **Collect what changed** since the last release. Here that is `v1.0.0`; use
   the last tag you published:

   ```bash
   git log v1.0.0..HEAD --oneline                       # every commit since
   git diff --name-only v1.0.0..HEAD -- supabase/migrations   # new migrations
   git diff v1.0.0..HEAD -- .env.example                # new or changed settings
   ```

   Then read the `changelog.md` entries dated after the last release. Each one
   says what changed, why, and what the database gets.

2. **Write these sections**, leaving out any that are empty:

   | Section | What goes in it |
   |---|---|
   | A one-line summary | What this release is about, under the title. |
   | **New** | Each new thing someone can do, one line each, grouped by screen (Orders, Home, Bills, Customers, Products, stock and money, Reminders, Your account, Everywhere), as part E does. |
   | **Changed** | What works or looks different now, and why it is better. |
   | **Fixed** | What was wrong, as the user saw it, and is now right. |
   | **For developers** | Changes to the console, the logs, CI or the release itself. |
   | **Setting it up** | Every new migration by number, and what each adds (the release applies them). Every new or changed environment variable or GitHub secret, and where to set it (B5, step 6; B6) — **set these before you publish**. Any one-time step, such as a new Vault secret (B4). |
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

### C3. Back up the database

Take a backup before every release that brings migrations, and once a week
besides. Supabase Free keeps none you can download (A2). The first release has
nothing to back up.

Docker must be running. From the project folder, run the commands below. They
ask for the database password, and save the backup outside the project:

```bash
cd ~/projects/ovenly
B=~/brio-backups/$(date +%F) && mkdir -p "$B"
supabase db dump --linked --role-only -f "$B/roles.sql"
supabase db dump --linked -f "$B/schema.sql"
supabase db dump --linked --data-only --use-copy \
  -x "storage.buckets_vectors" -x "storage.vector_indexes" -f "$B/data.sql"
```

- **It holds** every table and every row: the accounts, the businesses,
  orders, customers, stock, money, and the logs.
- **It does not hold** the logos, which are files, or the Vault secrets, which
  are in your password manager.
- **Keep the folder private.** It holds every business's data and every
  account's password hash. Never put it in the repository, and never share it.

### C4. Commit, push, and wait for green

```bash
git add package.json package-lock.json changelog.md
git commit -m "chore(release): v1.0.0"
git push origin main
```

Open the repository's **Actions** tab, and wait until the **CI** run for this
commit shows both jobs green. Do not release a red commit; the release would
stop at `checks` anyway.

### C5. Publish the release on GitHub

1. Open the repository's **Releases** (in the right-hand column of the Code
   tab), then **Draft a new release**.
2. **Choose a tag:** type `v1.0.0`, and pick **Create new tag: v1.0.0 on
   publish**.
3. **Target:** `main`. It must be the commit from C4. If anything was pushed
   after it, pick that commit under **Recent commits** instead.
4. **Release title:** `Brio 1.0.0`.
5. **Description:** paste the notes (part E for v1.0.0).
6. Tick **Set as the latest release**, and leave **Set as a pre-release**
   unticked.
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

### C6. Watch it go out

In the **Actions** tab, open the **Release** run. Its jobs are:

1. **Tag matches the version.** A failure here means `package.json` does not
   say the tag's number. See D1.
2. **Every gate, on the tag.** This takes about ten minutes.
3. **Hosted database migrations.**
4. **Deploy to Vercel.** Its step **Only the built app goes to Vercel** checks
   the upload before it is sent (A1).
   - If you set up approval (B6, GitHub Pro), press **Review deployments →
     Approve and deploy**.
   - When the job is done, it shows the address it deployed.

### C7. Check it is live

On the address, in a private window:

- [ ] `yourdomain.com` and `www.yourdomain.com` both open the landing page, on
      the address.
- [ ] A shared link to it shows Brio's picture (paste it into WhatsApp), and
      Settings → About shows the new version.
- [ ] Register a new account. The confirmation email arrives from Brio's
      Gmail, and not in spam; the welcome shows once after signing in.
- [ ] Create an order. Open its bill, then **Share** and **Download PDF**.
- [ ] Move the order to Ready, then Delivered. Home and the stock follow it.
- [ ] The privacy policy (`/privacy`) gives `SUPPORT_EMAIL`, or Brio's Gmail
      if you left it out.
- [ ] **On the first release only:** add the developer account (B4,
      step 7), and the rate limit (B5, step 8).
- [ ] Sign in as the developer. `/admin` shows the accounts, the error log
      and the audit log.
- [ ] In Vercel, Project → **Logs** shows no errors.
- [ ] In Supabase, the SQL Editor shows the scheduler running:

      ```sql
      select jobname, status, start_time from cron.job_run_details order by start_time desc limit 10;
      ```

Delete the test account afterwards, from Settings → Delete account.

### C8. The Android app (when you release it)

Build it from the same tag, so it carries the same version name. In the
**Actions** tab, open **Android release** → **Run workflow** → **Use workflow
from: Tags → v1.0.0**. Then follow `docs/ANDROID.md` to upload it to Play.

---

## D. When something goes wrong

### D1. The release stopped before `deploy`

- **What changed:** nothing live. If it stopped at `deploy`, after `migrate`,
  the hosted database has the new migrations, and the old app keeps running on
  them. Migrations only ever add, so it can.
- **What to do:** fix the cause on `main`, choose the next patch number
  (v1.0.1), and release that.
- **Never move or reuse a tag:** v1.0.0 should always mean the same code. On
  GitHub Free, nothing stops you doing so, so it is up to you; with Pro, the
  tag ruleset does (B6).

A mismatched version (the first job) is the exception. If the release has not
deployed anything:

1. delete the release on GitHub (Releases → the release → Delete);
2. delete its tag. With the Pro tag ruleset, first add yourself to its bypass
   list:

   ```bash
   git push origin --delete v1.0.0
   git tag -d v1.0.0
   ```

3. set the version (C1), push, and publish again.

### D2. The new version is live, and wrong

1. **Put the previous version back at once.** In the Vercel dashboard, open
   the project's **Deployments**. Open the one before the current one, and
   choose **Instant Rollback**. On Hobby you can go back to the version just
   before. It takes seconds and builds nothing. Your Mac is signed out of
   Vercel, so use the dashboard.
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

### D4. Supabase paused the project

Brio shows that it cannot load anything, and Supabase emails you that the
project is paused (A2).

1. In the Supabase dashboard, open the project and choose **Restore project**.
2. Wait a few minutes. The data is kept.

Once owners use Brio daily, it stays awake.

### D5. A token expired

`deploy` or `migrate` fails, saying the token is not valid.

1. Make a new one: Vercel's as in B5, step 9, or Supabase's as in B4, step 6.
2. Replace the GitHub secret (B6, step 2).
3. Deploy the release again (D3).

### D6. The data is lost

Restore the newest backup (C3) into a new Supabase project. Supabase's guide
[Backup and restore using the CLI](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore)
gives the commands. Then:

1. set up the new project as in B4, steps 2 to 6;
2. change the Supabase values in Vercel (B5, step 6) and GitHub (B6, step 2);
3. deploy again (D3).

Owners upload their logos again.

### D7. Emails stopped arriving

The developer console's error log (`/admin/logs`) shows each email that
failed, with Gmail's reason.

- **"Invalid login" or "Username and Password not accepted":** the app
  password no longer works. Changing that Gmail's password cancels it.
  1. Make a new app password (B3, step 3), and check it (B3, step 4).
  2. Replace `SMTP_PASSWORD` in Vercel (B5, step 6).
  3. Deploy the release again (D3).
- **A daily sending limit:** Gmail's 500 a day are used up, and it sends again
  within 24 hours by itself. If it happens again, see who is asking: the
  Firewall's overview shows the rate limit's matches (B5, step 8).
- **Google disabled the account:** sign in to that Gmail in a browser, and
  follow Google's steps.

Until mail works again:

- **A registration still made its account.** Once mail works, the owner
  chooses **Resend confirmation** in Settings.
- **A password reset has already replaced the password, but its email was not
  sent.** The owner asks for a new one once mail works.

---

## E. Release notes for v1.0.0

Paste everything below the line as the release's description (C5).

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
- The environment it needs is listed in `docs/RELEASE.md` (B5, step 6).
