# Releasing the Android app

Brio's Android app is the hosted web app in a Capacitor shell (plan §139.17).
A web deploy updates what it shows; a new build is needed only when the
native side changes (plugins, icons, the manifest, Capacitor itself).

Nothing here needs the Android SDK on your Mac: GitHub Actions builds and
signs the app (`.github/workflows/android.yml`). You need a JDK only for
`keytool`, to make the upload key once (`brew install openjdk@17` is enough).

---

## 1. Once: the upload key

The upload key signs what you upload to Play. Play then re-signs the app
with its own key (Play App Signing), so losing the upload key can be
recovered through Play support. Losing it is still a bad day: keep the file
and its passwords in a password manager, never in the repository.

```sh
keytool -genkeypair -v -keystore brio-upload.jks -alias upload \
  -keyalg RSA -keysize 2048 -validity 10000
```

It asks for a store password, your name and organisation (any honest
values), and a key password. Use the same password for both if you like.

Its SHA-256 fingerprint, for App Links (step 4):

```sh
keytool -list -v -keystore brio-upload.jks -alias upload | grep SHA256
```

## 2. Once: GitHub

In the repository: **Settings → Secrets and variables → Actions**.

| Kind | Name | Value |
|---|---|---|
| Variable | `ANDROID_APP_URL` | The hosted app, e.g. `https://app.yourdomain.com` (the same as `NEXT_PUBLIC_APP_URL`) |
| Secret | `BRIO_UPLOAD_KEYSTORE_BASE64` | `base64 -i brio-upload.jks \| pbcopy`, then paste |
| Secret | `BRIO_UPLOAD_KEYSTORE_PASSWORD` | The store password |
| Secret | `BRIO_UPLOAD_KEY_ALIAS` | `upload` |
| Secret | `BRIO_UPLOAD_KEY_PASSWORD` | The key password |

Or from the terminal, with `gh`:

```sh
gh variable set ANDROID_APP_URL --body "https://app.yourdomain.com"
base64 -i brio-upload.jks | gh secret set BRIO_UPLOAD_KEYSTORE_BASE64
gh secret set BRIO_UPLOAD_KEYSTORE_PASSWORD
gh secret set BRIO_UPLOAD_KEY_ALIAS --body upload
gh secret set BRIO_UPLOAD_KEY_PASSWORD
```

## 3. Each release: build

**Actions → Android release → Run workflow.** In about ten minutes the run
keeps `brio-android-<n>`, with:

- `brio-<n>.aab`: the bundle to upload to Play.
- `brio-<n>.apk`: the same build, to install on a test phone by hand
  (`adb install brio-<n>.apk`, or open it on the phone).

`<n>` is the run number and the build's `versionCode`, which Play needs to
rise with every upload. The version name is `package.json`'s `version`.

## 4. App Links: the email confirmation opens in the app

With App Links, tapping the "Confirm your email" link on the phone opens
Brio, confirmed and signed in, instead of the browser (R8.5). The app is
built to claim `https://<your host>/confirm-email`. Android believes the claim
only once the site vouches for the app, at `/.well-known/assetlinks.json`.

1. In Play Console, **Test and release → App integrity → App signing**, copy
   the SHA-256 fingerprint of the **app signing key**, and of the **upload
   key**. Play installs apps signed with the first; a hand-installed APK from
   step 3 is signed with the second.
2. On the server, set both in the environment, comma-separated, and restart:

   ```sh
   ANDROID_CERT_FINGERPRINTS=AB:CD:…:EF,12:34:…:56
   ```

3. Check it answers (with no redirect):

   ```sh
   curl -i https://app.yourdomain.com/.well-known/assetlinks.json
   ```

4. Android checks when the app is installed. On a phone with it installed:

   ```sh
   adb shell pm get-app-links in.brio.app      # "verified" for your host
   adb shell pm verify-app-links --re-verify in.brio.app
   ```

Supabase's redirect allow list already has `/confirm-email`: it is the web
app's own confirmation page.

## 5. Play Console

### Before the first upload

- **Create the app**: name Brio, app (not game), free, default language
  English (India).
- **App signing**: accept Play App Signing when you upload the first bundle.
- **Store listing**: short and full description, the icon
  (`src/assets/brand/`, 512 × 512), a feature graphic (1024 × 500) and phone
  screenshots. Screenshots are simplest from the web app at 390 px wide.

### App content (Policy → App content)

| Section | Answer |
|---|---|
| Privacy policy | `https://app.yourdomain.com/privacy` |
| App access | Sign-in is required. Give the review team a working test account (a sign-in number and password) whose business has a few orders. |
| Ads | No ads. |
| Content rating | Questionnaire: category *Utility, productivity, communication or other*; no violence, sexual content, language, controlled substances, gambling or user-to-user sharing. Expect *Everyone* / *3+*. |
| Target audience | 18 and over only. |
| News app | No. |
| Financial features | None. Brio records payments; it does not move money. |
| Health | None. |
| Government app | No. |
| Data safety | The table below. |
| Account deletion | Yes. The web link is `https://app.yourdomain.com/privacy#delete`, and in the app it is Settings → Delete account. |

### Data safety

This matches the privacy policy (`src/constants/privacy.ts`). If the app
starts keeping something new, both change together.

**Overview**

- Collects user data: **Yes**. Shares user data with third parties: **No**
  (Supabase, Cloudflare and Gmail are service providers acting for us, which
  Play does not count as sharing).
- Encrypted in transit: **Yes** (HTTPS).
- A way to request deletion: **Yes** (above).

**Data types.** Each is *collected*, *not shared*, *processed ephemerally: no*.

| Category → type | Whose | Required? | Purpose |
|---|---|---|---|
| Personal info → Name | the owner; their customers | Required | App functionality, Account management |
| Personal info → Email address | the owner | Required | App functionality, Account management |
| Personal info → Phone number | the owner (sign-in); customers | Required | App functionality, Account management |
| Personal info → Address | the business; customers' delivery addresses | Required | App functionality |
| Personal info → Other info | notes on customers | Optional | App functionality |
| Financial info → Purchase history | the orders customers placed | Required | App functionality |
| Financial info → Other financial info | payments recorded, expenses | Optional | App functionality |
| Photos and videos → Photos | the business logo | Optional | App functionality |
| App activity → Other user-generated content | products, stock, order notes | Required | App functionality |
| App info and performance → Diagnostics | the server's request and error records | Required | App functionality |

**Not collected**: location, contacts, files other than the logo, calendar,
messages, audio, health, web browsing, device or advertising IDs. The
Android app keeps its reminders on the phone, so it registers no push token.

### Testing tracks

1. **Internal testing**: create a release, upload `brio-<n>.aab`, add your
   testers' Google accounts, and install from the opt-in link. Do the device
   checks (section 6) on this build.
2. **Closed testing**: Google requires a new personal developer account to run
   a closed test before it may publish (at the time of writing, at least 12
   testers opted in for 14 days in a row). Play Console shows the current
   rule under **Publishing overview**.
3. **Production**: apply for access once the closed test is done, then promote
   the tested release.

---

## 6. The device checks (R8.4, R8.12)

Run these on the internal-testing build, or on the APK from step 3. Copy the
results table at the end into the changelog when done.

### The devices (plan §139.17.5)

Between them, the phones and tablets used must cover:

- Android 10 and Android 15, and one version between.
- A small phone (360 dp wide), a large phone and a tablet.
- Gesture navigation, and three-button navigation (Settings → System →
  Gestures → System navigation).
- A display cutout, a notch or hole punch, in portrait and landscape.
- Both themes, Golden and Peach (Settings → Appearance).

An emulator counts for versions and sizes. Use a real phone for at least one
row.

### What to check on each

1. **Launch.** The icon has no white square around it, and follows the
   wallpaper's colours where Android 13+ themed icons are on. The splash is
   the Brio mark on cream, then the app.
2. **Edges (R8.4).** Nothing sits under the status bar, the notch, or the
   gesture bar or buttons:
   - the top of Home and of a pushed screen's header;
   - the bottom navigation, and a sheet's buttons (for example New customer);
   - a response card, and the More menu;
   - the same with the phone turned sideways.
3. **Keyboard.** In a sheet (New customer) and on Create order's details,
   tap the last field. The field and its button stay in view above the
   keyboard.
4. **Back button.** An open list or menu closes first, then a card or
   sheet, then it goes back a screen. On Home, it leaves the app.
5. **Links out.** On an order, Call opens the dialler, WhatsApp opens
   WhatsApp, and a delivery's map link opens Maps, each outside Brio.
6. **The bill.** On an order, Share sends the bill image to WhatsApp, and
   Download PDF opens the share sheet with the PDF.
7. **Offline.** In aeroplane mode, reopen the app: the offline page shows.
   Turn the network back on and tap Try again: the app opens.
8. **Reminders.**
   - Settings → Notifications → Order reminders asks for permission
     (Android 13+). Allow it.
   - Leave an order due tomorrow: a "Due soon" reminder arrives at 8 AM.
   - With Brio swiped away, tapping it opens that order.
   - On a locked screen it shows without the order's details.
   - Signing out removes waiting reminders.
9. **App Links** (once step 4 is done). On the phone, register a test
   account, or change the email in Settings, and tap the link in the email.
   Brio opens, confirmed and signed in, not the browser.
10. **Status bar.** In both themes, the clock and icons are readable.

### Results

| Device | Android | Size | Navigation | Cutout | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| | | | | | | | | | | | | | | |

If the keyboard covers a field (check 3), or the edges are wrong on a phone
(check 2), note the phone and the screen. The native layer can then take on
the keyboard, or write the insets itself (plan §139.17.2, §139.17.3).
