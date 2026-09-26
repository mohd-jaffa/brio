# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

One responsive Next.js app serves every device: the browser, an installable PWA (iOS uses this), and an Android app in the Play Store that wraps the same web app with Capacitor (plan §139.17). The wrapper adds native abilities such as push, share, haptics and deep links, but it does not change the design language: the app looks the same everywhere and follows no single OS's native style.

## Users

**The owner of a home business in India.** The plan starts with home bakers and widens to hamper makers, florists and gift makers (§139.1). One person runs the business and holds its only account. There are no staff or helper accounts (Q7).

- **Day to day, on the phone.** Orders arrive through WhatsApp and calls. The owner records them, checks what is due, marks payments and deliveries, and shares bills, usually in short gaps between making things.
- **Weekly, at a desk.** The owner also sits down on a laptop to go through accounts, expenses and analytics. **Desktop matters as much as the phone.** Every screen ships for phone, tablet and desktop together.
- **Their customers never use the app.** They receive a bill the owner shares, and nothing else: no messages, notifications or logins.

## Product Purpose

Ovenly runs the business side of a made-to-order home business: customers, products, orders, payments, stock, expenses, deliveries, bills, notifications and analytics, all in one place (plan §1).

It exists to replace three things owners juggle today:
- WhatsApp chats plus a notebook or memory, where orders and dues slip on busy days;
- general billing apps built for shops and ledgers rather than made-to-order work;
- spreadsheets kept up by hand.

**Success** is an owner who never misses an order that is due, always knows who still owes money, can share a proper bill in seconds, and can see at the end of the week whether the business made money.

## Positioning

Built around **made-to-order work from home**, not a shop counter:

- Orders are organised by **when they are due**: overdue, today, tomorrow.
- An order can be for a saved customer or for a **Guest**. A customer can be added mid-order.
- Stock is **reserved when an order is placed**, so the last of something cannot be promised twice.
- The **bill carries the business's own name, catch phrase and address**, and is shared straight to WhatsApp as an image or PDF. The app is credited only in a small footer.
- Costs sit beside sales, so the owner can see what they actually earned.

## Operating Context

- **India throughout:** rupees, stored in paise and never as floating point; Indian mobile numbers; the business's day is counted in Asia/Kolkata. The interface is in English only; language and currency settings are out of scope (Q7).
- **Orders come from outside the app,** through WhatsApp messages and phone calls, and are keyed in afterwards.
- **Pickup or delivery,** each with a due date and time. "Overdue" is counted in whole days: an order due today stays "due today" until the day ends (IMP-05).
- **Payments** are taken by cash, UPI, bank transfer, card or other. An order can be unpaid, part paid or paid in full, including at the moment it is placed.
- **Bills** are generated on demand and never stored. An estimate can be viewed and shared before the order is saved.
- **Signing in** is by mobile number and password. Email confirms the account.
- **Rhythm:** many short phone sessions a day, plus a weekly desk session for the numbers.

## Capabilities and Constraints

- **Built:**
  - registration and sign-in;
  - a Home dashboard (what needs attention now, orders due, amounts to collect, low stock);
  - orders with a bill and estimate, share, PDF and print, custom items and guest orders;
  - customers and Guest sales, products with illustrations, stock kept as a ledger;
  - expenses with categories, analytics with charts;
  - business details with the one logo upload;
  - Settings, and a notifications inbox with a bell.
- **Roles:** `USER` is the owner; a screen calls it "Owner". `DEV` never sees business data.
- **Uploads:** the business logo is the only file a user uploads, up to 500 KB. Illustrations and photographs ship with the app; a user picks an illustration, and only its key is stored.
- **Themes:** exactly two, Golden and Peach, chosen by the user.
- **Words:** everything a user reads says *business*, not *bakery*.
- **Out of scope (Q7):** messages or chat; staff and team; suppliers; wholesale customers; language, currency and payment-method settings; a barcode scanner; a dark-mode toggle; switching between several businesses; "Today's special"; Help & Support; and any promise that "the customer will be notified".
- **Later:** a public Menu Builder with one QR code per business (§45–§49); push to Android (R8.6); Phase 9, Delight (§139.21).
- **Undecided:**
  - how the Android app is delivered (Q9);
  - the application id and Play developer account (Q10);
  - the licence of the illustrations, to be confirmed before the Play release (Q16).

## Brand Commitments

- **Name:** Ovenly. Its metadata calls it "Home Business Management".
- **The business leads.** Its name, catch phrase and logo head the app's header and every bill. Ovenly appears only in the bill's footer, by name and web link.
- **Maker credit:** Settings → About reads **Crafted by · jaFFa**. There is no illustration credit in the app (the user, 2026-09-26).
- **Voice: warm and quiet** (the user, 2026-09-26).
  - Plain, factual English, with one warm phrase at most at a moment that earns it.
  - A short line of encouragement on some screens, such as "Made by hand, shared with care."
  - Never whimsy on money, loss or errors: an error leads with what happened and how to recover.
- **Themes:** the two themes are named Golden and Peach.

## Evidence on Hand

- **Assets, all app-owned:**
  - the illustration library (`src/assets/illustrations/`, masters in `artwork/illustrations/`);
  - the photographic plates (`src/assets/plates/`).
- **Design references** are in `design-references/`, which is gitignored and never committed.
- **Seed data** for local development only (`supabase/seed.sql`).
- **Absent, and never to be invented:**
  - real users, testimonials, reviews or case studies;
  - usage numbers, ratings or press;
  - pricing.

  The launch is public on the Play Store, open to any home business, and has no track record yet.

## Product Principles

1. **What needs attention comes first.** Due and overdue orders and money still owed lead; analytics wait on their own page.
2. **The business's name, not ours.** Every surface a customer sees belongs to the owner's business.
3. **Numbers the owner can trust.** The server prices every order, stock cannot be oversold, and money is never a float.
4. **One way to say what happened.** Every outcome is reported the same way, in plain words, with a reference when something fails. A screen that cannot load says so where it stands.
5. **Phone first, desk just as well.** Built for one-handed use in short gaps, and complete on a laptop for the weekly review.

## Accessibility & Inclusion

- **Standard:** semantic HTML, a label on every control, keyboard navigation and visible focus, sufficient contrast in both themes, screen-reader support, errors announced beside their fields, and touch targets of at least 44 px (AGENTS §21).
- **Phones first:** 360, 390 and 414 px, with no sideways scroll. Every edge respects the device's safe areas, and heights use `dvh`.
- **Motion:** respects reduced motion; movement becomes a fade.
- **Plain English:** short, everyday words. Every piece of wording lives in one place (`src/constants/messages.ts`).
