---
name: Brio
description: The Home Kitchen Ledger — warm, calm and exact business management for home businesses, in two themes, Golden and Peach.
colors:
  # Golden — the default theme (and where a stored "clean" lands)
  toasted-caramel: "#7a4a25"
  toasted-caramel-deep: "#633b1d"
  caramel-cream: "#f3e6d6"
  on-caramel: "#fff8f0"
  honey-gold: "#a67628"
  espresso: "#2a1b12"
  espresso-lift: "#3a2619"
  warm-cream: "#f6efe5"
  oat-paper: "#fffcf8"
  flour-well: "#f1e8db"
  oat-hairline: "#e6dacb"
  oat-field-edge: "#918070"
  crust-ink: "#2b1d14"
  cocoa-muted: "#6b5747"
  chart-rust: "#9c4a25"
  chart-espresso: "#4f2d1b"
  chart-sand: "#d2a47c"
  chart-orange: "#e2713f"
  chart-peach: "#f0bf98"
  chart-taupe: "#8d7359"
  # Peach
  baked-terracotta: "#a94a26"
  baked-terracotta-deep: "#8e3c1d"
  terracotta-blush: "#fbe3d6"
  on-terracotta: "#fff8f3"
  apricot-glaze: "#c46a3c"
  cocoa: "#3a2119"
  cocoa-lift: "#4c2d22"
  blush-cream: "#fbeee6"
  rose-paper: "#fffaf6"
  blush-well: "#f7e6da"
  blush-hairline: "#f0dbcd"
  blush-field-edge: "#9a7d70"
  plum-ink: "#33201a"
  rosewood-muted: "#77574a"
  chart-terracotta: "#a8441f"
  chart-cocoa: "#5a2a1c"
  chart-apricot: "#e7a07a"
  chart-clay-orange: "#d0643a"
  chart-blush: "#f3c3a8"
  chart-rosy-taupe: "#9a6f5e"
  # Shared by both themes
  status-pending: "#8a5208"
  status-preparing: "#944616"
  status-ready: "#2f6f5e"
  status-transit: "#355f9a"
  status-delivered: "#2e7048"
  status-cancelled: "#a63a34"
  status-neutral: "#5e5550"
  bill-paper: "#ffffff"
  bill-ink: "#231a15"
  bill-ink-muted: "#5f534b"
  bill-rule: "#e6ded6"
  scrim: "#140c0873"
typography:
  display:
    fontFamily: "Brio Rupee Serif, Fraunces, Georgia, serif"
    fontSize: "2.75rem"
    fontWeight: 600
    lineHeight: 1.04
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Brio Rupee Serif, Fraunces, Georgia, serif"
    fontSize: "1.75rem"
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Brio Rupee Serif, Fraunces, Georgia, serif"
    fontSize: "1.125rem"
    fontWeight: 500
    lineHeight: 1.4
  figure:
    fontFamily: "Brio Rupee Serif, Fraunces, Georgia, serif"
    fontSize: "1.5rem"
    fontWeight: 500
    lineHeight: 1.33
    fontFeature: "\"tnum\" 1"
  body:
    fontFamily: "Brio Rupee Sans, Inter, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.43
  body-strong:
    fontFamily: "Brio Rupee Sans, Inter, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.43
  label:
    fontFamily: "Brio Rupee Sans, Inter, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.33
  lockup:
    fontFamily: "Brio Rupee Sans, Inter, system-ui, sans-serif"
    fontSize: "0.7rem"
    fontWeight: 600
    lineHeight: 1.7
    letterSpacing: "0.34em"
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  sheet: "32px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.toasted-caramel}"
    textColor: "{colors.on-caramel}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.lg}"
    padding: "10px 16px"
  button-primary-hover:
    backgroundColor: "{colors.toasted-caramel-deep}"
  button-action:
    backgroundColor: "{colors.espresso}"
    textColor: "{colors.on-caramel}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.lg}"
    padding: "10px 16px"
  button-action-hover:
    backgroundColor: "{colors.espresso-lift}"
  button-secondary:
    backgroundColor: "color-mix(in oklab, #7a4a25 10%, transparent)"
    textColor: "{colors.toasted-caramel}"
  button-secondary-peach:
    backgroundColor: "color-mix(in oklab, #a94a26 10%, transparent)"
    textColor: "{colors.baked-terracotta-deep}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.lg}"
    padding: "10px 16px"
  button-ghost:
    backgroundColor: "{colors.oat-paper}"
    textColor: "{colors.cocoa-muted}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.lg}"
    padding: "10px 16px"
  fab:
    backgroundColor: "{colors.espresso}"
    textColor: "{colors.on-caramel}"
    rounded: "{rounded.pill}"
    size: "56px"
  text-field:
    backgroundColor: "{colors.flour-well}"
    textColor: "{colors.crust-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "12px 16px"
  card:
    backgroundColor: "{colors.oat-paper}"
    textColor: "{colors.crust-ink}"
    rounded: "{rounded.xl}"
    padding: "16px"
  row:
    backgroundColor: "{colors.oat-paper}"
    textColor: "{colors.crust-ink}"
    typography: "{typography.body-strong}"
    padding: "12px 16px"
  medallion:
    backgroundColor: "{colors.caramel-cream}"
    textColor: "{colors.toasted-caramel}"
    rounded: "{rounded.pill}"
    size: "44px"
  status-pill:
    backgroundColor: "color-mix(in oklab, #8a5208 12%, #fffcf8)"
    textColor: "{colors.status-pending}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "4px 10px"
  nav-item-active:
    backgroundColor: "{colors.caramel-cream}"
    textColor: "{colors.toasted-caramel}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.lg}"
    padding: "10px 12px"
  segmented-control:
    backgroundColor: "{colors.flour-well}"
    rounded: "{rounded.lg}"
    padding: "4px"
  segmented-control-selected:
    backgroundColor: "{colors.oat-paper}"
    textColor: "{colors.crust-ink}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.md}"
  quote-block:
    backgroundColor: "{colors.flour-well}"
    textColor: "{colors.crust-ink}"
    rounded: "{rounded.xl}"
    padding: "16px 20px"
---

# Design System: Brio

## Overview

**Creative North Star: "The Home Kitchen Ledger"**

Brio is a well-kept order book on a kitchen shelf: warm, homely materials holding figures you can trust. The ground is cream, the pages are oat paper, the ink is a deep crust brown, and the one thing that must be done next is set in espresso. It is warm, calm and exact. Warmth comes from the materials, never from noise; calm comes from restraint, with one strong voice per screen; exactness comes from measured contrast, tabular figures and money that is never a guess.

Controls are **soft and certain**: rounded, tinted and gently lifted, and never ambiguous about what can be tapped or where something stands. The owner meets these screens many times a day, often one-handed between batches, so density stays steady and the structure stays predictable. What is due and what is owed always leads.

Two themes share one vocabulary. **Golden** is caramel on warm cream; **Peach** is terracotta on blush. A screen names a role and the theme supplies the value, so the two can never drift apart.

**Key Characteristics:**
- Three warm tones carry depth: the cream ground, oat-paper cards and flour-well fields.
- Fraunces serif for titles and headline figures; Inter for everything you operate.
- One espresso control per screen: the thing to do next.
- Status reads as a tinted pill with a dot, in the same colour in both themes.
- The business's own bakes and gifts (an app-owned illustration library) mark products and categories; nothing is uploaded but the logo.
- Every text pairing is measured against the ground it sits on, in both themes.

## Colors

A warm, low-chroma kitchen palette. One caramel (or terracotta) voice does the pointing, espresso takes the one action, and six shared status colours say where things stand.

### Primary
- **Toasted Caramel** (Golden) / **Baked Terracotta** (Peach): the pointing colour. It marks the active tab's underline, links, icons, the filled primary button, the active nav label and a bill's header rule and total. As text on paper it clears 4.5 : 1.
- **Caramel Cream** (Golden) / **Terracotta Blush** (Peach): the soft tint of the primary. It sits behind medallions and the active nav pill, with the primary on top (6.03 : 1 in Golden, 4.62 in Peach).
- **Primary strong** (`--color-primary-strong`): words on a translucent primary tint, the secondary button's. Golden keeps Toasted Caramel, which holds 4.55 : 1 or better at rest and on hover over any ground. Peach takes **Baked Terracotta Deep**, because terracotta itself falls to 3.58 : 1 on its hover tint over a field; the deep tone holds 4.71 or better.
- **On-Caramel** / **On-Terracotta**: the cream words set on the primary and on espresso.

### Secondary
- **Honey Gold** (Golden) / **Apricot Glaze** (Peach): marks and charts only. It is never text.

### Tertiary
- **Espresso** (Golden) / **Cocoa** (Peach): the one dark control per screen, such as the round + on a phone, **New order** on a desktop, or the sign-in submit. Words on it read 15.8 : 1 in Golden and 14.2 : 1 in Peach.

### Neutral
- **Warm Cream** (Golden) / **Blush Cream** (Peach): the page ground.
- **Oat Paper** / **Rose Paper**: cards, sheets, the response card and rows.
- **Flour Well** / **Blush Well**: fields, product tile wells, the quote block, the segmented control's track.
- **Oat Hairline** / **Blush Hairline**: every divider and card border.
- **Crust Ink** / **Plum Ink**: body text (14.3 : 1 and 13.6 : 1 on the ground).
- **Cocoa Muted** / **Rosewood Muted**: secondary text, at 5.3 : 1 or better on every ground, fields included.
- **Scrim**: the dimmed page behind a sheet or a dialog, espresso at 45 %, the same in both themes (`--color-scrim`). It is set as a value, not a variable, because a dialog's backdrop does not inherit variables in every browser the app runs in.

### Status (shared by both themes)
- **Pending** amber-brown, **Preparing** rust, **Ready** pine, **Out for delivery** slate blue, **Delivered / Completed** leaf green, **Cancelled** brick, **Neutral** stone.
- Each is ≥ 4.5 : 1 as a word on its own 12 % tint. Success, warning, danger and info borrow from these: delivered, pending, cancelled and transit.

### Charts
- Each theme has six browns and oranges: rust, espresso, sand, orange, peach, taupe (Peach: terracotta, cocoa, apricot, clay orange, blush, rosy taupe).
- The first colour draws every line and strong bar (6.0 : 1 on paper).
- The taupe is always last, as "Others".

### The Bill
- **Bill Paper** white with **Bill Ink** near-black, in either theme. The theme shows only in the header rule and the total.
- The shared image and the PDF use the same values.

### Named Rules
**The Role, Not Colour Rule.** A screen never picks a colour. It names a role (surface, text-muted, primary, action, a status) and the theme on `<html data-theme>` decides the value.

**The Measured Pair Rule.** No text pairing ships unmeasured: body and muted text are ≥ 4.5 : 1 on the ground they sit on, and marks are ≥ 3 : 1. Each value is noted beside its token.

**The Accent Is Not Ink Rule.** Honey Gold and Apricot Glaze never carry words. They are for marks, rings and bars.

**The Two Themes Rule.** There are exactly two themes, Golden and Peach, and no third or dark variant.

## Typography

**Display Font:** Fraunces (with Georgia, serif), a variable serif with its optical-size axis on (its soft and wonky axes are not loaded).
**Body Font:** Inter (with system-ui, sans-serif).
**The rupee sign:** each face's ₹ ships as its own 1–2 KB file (Brio Rupee Serif and Brio Rupee Sans, cut from Fraunces and Inter, SIL OFL). It heads each stack, covering U+20B9 only, so a screen with money does not download a whole extended character set for one glyph. It looks exactly like the face it was cut from.

**Character:** Fraunces brings the warmth of a handwritten ledger heading; Inter keeps every control crisp and legible at 14 px.

### Hierarchy
- **Display** (600, 2.75rem, 1.04, −0.035em): the sign-in screens' headline only ("Good work starts here.").
- **Headline** (500, 1.75rem rising to 1.875rem from 640 px, 1.25, −0.025em): each screen's one page title, and the Home greeting.
- **Title** (500, 1.125rem, 1.4): section headings ("Orders due", "Top products") and sheet titles.
- **Figure** (500, 1.5rem, tabular numerals): headline amounts in stat tiles and a customer's figures. Counts stay in Inter semibold.
- **Body** (400 / 500, 0.875rem, 1.43): rows, fields, messages. Row titles take 600.
- **Label** (500, 0.75rem): pills, helper text, captions, table headers.
- **Lockup** (600, 0.7rem, 0.34em, uppercase): only the intro line on the sign-in screens. The app's own line under its wordmark is 500, 0.75rem, 0.12em, in sentence case, as the brand sets it.

### Named Rules
**The Serif for Figures Rule.** Titles and money in headline position are set in Fraunces; anything you type, tap or scan in a list is Inter.

**The Tabular Money Rule.** Every amount, count and time in a column uses tabular numerals, so figures line up down a list.

## Layout

- **Operate mode throughout:** predictable structure, steady density, and one clear reading order. What is due and what is owed comes first.
- **Phone (under 768 px):**
  - a top bar with the business's mark, name and catch phrase, the bell and the owner's profile picture; a long name takes a second line rather than lose its end;
  - a five-item bottom bar (Home, Orders, Products, Customers, More) with a tinted pill on the current place;
  - 16 px gutters.
- **Tablet (768 – 1023 px):** a 72 px icon rail whose labels appear as tooltips, a top bar with the bell and the account, and 24 px gutters. On a screen shorter than the rail (a phone on its side) the rail scrolls, and its tooltips give way.
- **Desktop (1024 px and up):**
  - a 248 px sidebar in three groups: the daily work, the numbers, and the rest;
  - content capped at 1200 px, with 32 px gutters;
  - screens split into a main column and a side column that stack independently;
  - order and expense lists become tables at 1280 px.
- **Rhythm:**
  - a screen's title keeps 24 px below it;
  - search, tabs and the list bind at 16 px;
  - sections part at 24 px, and at 32 px on a desktop.
- **Every edge pays its safe area** (`--safe-top/right/bottom/left`), and heights use `dvh`, never `vh`. On a phone, a screen with the round + keeps its last row clear of it.
- **Touch:** every target is at least 44 px. A control drawn smaller takes an invisible 44 px halo (`hit-area`, for controls drawn at 32 px or more). The quantity between a stepper's − and + is 44 px tall over the stepper's padding, its ring drawn inside. A link inside a line of small text, such as View order in a stock row or an email under a name, takes a 44 px band centred on its line (`hit-area-line`), and only where nothing else a finger could mean sits in that band. Two such links are never stacked closer than 44 px: where they would be, one becomes plain text beside the full-size control that does the same thing (a customer's number, beside Call).

### Named Rules
**The What-Is-Due-Leads Rule.** On any screen the first thing read is what needs doing: overdue and due orders, money still owed, stock running low.

## Elevation & Depth

Layered and softly lifted. Depth is mostly tonal: the cream ground, paper cards and flour-well fields step down from one another, each resting card with a barely-there shadow. Real lift is kept for what floats: sheets and dialogs, the response card, the one dark action, and the sign-in card on a desktop. Every shadow is tinted with the theme's own warm brown, never grey or black.

### Shadow Vocabulary
- **Card** (`0 1px 2px rgb(var(--shadow-tone) / 0.05), 0 1px 1px rgb(var(--shadow-tone) / 0.03)`): every resting card, row list and tile. It is felt more than seen.
- **Elevated** (`0 14px 32px -14px rgb(var(--shadow-tone) / 0.2), 0 2px 6px -2px rgb(var(--shadow-tone) / 0.08)`): the espresso action, the round +, menus, popovers and floating sheets.
- **Rising sheet** (`0 -18px 40px -22px rgb(var(--shadow-tone) / 0.28)`): the sign-in sheet as it rises from a phone's foot.

### Named Rules
**The Warm Shadow Rule.** Shadows take `--shadow-tone`, the theme's brown. A grey or black shadow is a stain on the page.

**The Float-Only Lift Rule.** Only what floats above the page earns the elevated shadow. A resting card never does.

## Shapes

- **Radii:** soft corners everywhere, and nothing sharp:
  - 12 px on fields, buttons and product tile wells;
  - 16 px on cards, row lists, the hero band, the quote block and the response card;
  - 32 px on the sign-in sheet;
  - fully round on pills, medallions, avatars, the round + and the bell's count.
- **Hairlines:** one hairline border (Oat or Blush Hairline) outlines each card. Rows inside a card are split by hairlines, not gaps.
- **Photographs** are app-owned plates. They sit in 16 px rounded bands and fade to nothing before any word, so no text ever sits on a photograph.

### Named Rules
**The One Card Rule.** A list is hairline rows inside one card. Cards never nest.

## Components

### Buttons
- **Feel:** soft and certain. They respond to the press and never leave you guessing.
- **Shape:** 12 px corners by default, or fully round where the reference sets a pill (the sign-in submits, Mark all as read).
- **Primary:** Toasted Caramel with cream words, 10 × 16 px padding, 14 px semibold.
- **Action:** Espresso. The one per screen; it carries the elevated shadow.
- **Secondary:** a 10 % primary tint with the primary's strong tone for its words (see Primary strong).
- **Ghost:** Oat Paper with a hairline and muted words that darken on hover.
- **Danger:** a brick tint with brick words.
- **Sizes:** 12 px text for small, 16 px for large.
- **States:** hover deepens the fill; press scales slightly (0.98). Loading shows a spinner and refuses a second press. Focus is a 2 px caramel ring offset by a cream halo, so it shows on any ground.

### The Round + (FAB)
- A 56 px espresso circle above the bottom bar, clear of the home indicator, on phones only.
- From 768 px it becomes a labelled espresso button in the page header.

### Chips
- Choice chips for small single choices; the segmented control for a period: a Flour Well track with a 4 px inset, and an Oat Paper tile that glides to the chosen segment.

### Select
- **One component** (`select-menu`) for every choice from a list: the period pill, Daily or Weekly beside a chart, and the select fields in forms. The browser's own list never opens.
- **The control** takes the look of where it sits: a field's Flour Well well; the period pill in Oat Paper with a card shadow and the calendar mark; a small hairline box beside a chart. A chevron turns over while it is open.
- **The list:** Oat Paper, one hairline, 12 px corners and the elevated shadow, with a 6 px inset. Each choice is at least 44 px tall. The one the keys are on sits on Flour Well, and the chosen one is semibold with a caramel tick.
- **Where it opens:** in the top layer, so no scrolling sheet clips it; under the control, or over it where there is more room; lined up with the control's nearer screen edge; at most 288 px tall, then it scrolls. It drops in over 240 ms, as a fade under reduced motion.
- **Keyboard:** the arrows, Home and End move; a letter jumps; Enter or Space takes; Escape or Tab closes, and Escape never closes the sheet behind it.

### The brand
- **Brio** (the user, 2026-09-28), built from the supplied files by `scripts/brand.mjs` into `src/assets/brand/`, `public/icons/` and the favicon:
  - **the icon:** a cream "b" with an orange leaf, on a dark green rounded square;
  - **the wordmark:** "Brio" in a heavy serif, dark green, the leaf over its i;
  - **the leaf** alone, the smallest mark.
- **Where:** the wordmark (44 px tall) with the line "Made by you. Managed simply." heads the sign-in screens, where the seedling mark and the name in type used to be; the leaf (16 px) marks their closing promise; the icon stands in the install sheet and the developer console, and is the installed app's icon and the favicon.
- **Its colours stay in the marks.** The screens keep Golden and Peach; nothing else takes the green or the leaf's orange. A business's own mark still leads its header and its bills.

### Launch Splash
- **When the app opens as an app** (installed, or the Android app), once a launch: the supplied bakery scene full screen — whisk, cake, piping bag round the edges, the counter at the foot — portrait or landscape to the screen, its middle plain cream `#fdfaf2`.
- **In the middle:** the wordmark (48 vmin, 170 – 380 px), the line "Made by you. Managed simply." in the sans, green `#0e2d1b`, 0.04em; and a pill bar (28 vmin, 112 – 220 px wide), deep green `#03351d` on warm sand `#efdec6`, filling from the left as the launch goes.
- **It leaves** once full, fading over 300 ms, at least 0.9 s after it came; under reduced motion it just goes. These colours are the splash's own, whatever the theme.

### Welcome
- **Once, for a new account** (the user, 2026-09-30): four slides over the screen the owner first comes in to, drawn with the page, so that screen never shows first. Paper (`surface`) to every edge.
- **A slide:** a drawing from the supplied sheet, cut out along its paper so it sits on either theme; a title in the heading serif (30 px on a phone, 36 from 768 px, 40 from 1024, 26 on a short screen); a line in muted Inter at 16 px. Upright, the drawing sits above the words, resting on them; on a screen turned on its side, a tablet's or a computer's, it stands to the left and the words are set left.
- **Controls:** the wordmark (26 px) and a small ghost **Skip** pill at the top; dots under the words, the current one a 24 px caramel pill; then **Next** as the screen's one espresso pill, full width, which reads **Get started** on the last slide. From the second slide a ghost **Back** pill with an arrow makes room for itself beside it.
- **Motion:** only a change moves. A turn sends the slide out one way as the next comes in from the other, the drawing tilting a little (3°) and the words a beat behind; a finger carries the slide, held back past either end. Ending, the whole lifts away (fades, growing to 103 %) over 420 ms and the screen is there. Under reduced motion the slides and the leaving fade.

### Landing page
- **`/about`, for anyone** (the user, 2026-09-30): Persuade mode on the app's own world — the ground, the serif, the espresso action, the caramel pointing colour. The brand's line is the headline, "Managed simply." set in the primary; one espresso **Create your account** per view, with **Sign in** beside it as a secondary pill.
- **Its pictures are the app's screens**, shown on devices: a phone drawn as a current Pro phone (a titanium band, an even black border, the Dynamic Island, the buttons on its sides) round a screenshot that carries its own status bar and home indicator; and a laptop with a thin black border and an aluminium base. Every measure of a frame is a share of its own width, so it is the same object at any size. **Their colours are the devices' own**, like the launch splash's, whatever the theme.
- **Composition:** the hero sets the words beside a laptop with the phone stood in front of its corner; below, who it is for (the illustration library's pictures on sunken discs, no cards), then a day's work on one pinned phone (below); where it runs; what stays private on a sunken band; and the closing picture band, words on the well and a plate fading in on the right.
- **Its type steps** are the page's own, larger than a screen's: the headline 44 px rising to 68 (two lines that never break inside); section titles 32 px rising to 40; a feature's title 28 rising to 32; its points 15 px.
- **Motion: the order book opens, once, as the page arrives** (the user, 2026-09-30: "animate about page"). The headline's two lines rise out of their own line, 120 ms apart; the laptop's lid swings up from its hinge (from 74° over 1 s) while its screen is dark, and the screen wakes onto Home; the phone steps up in front, turning upright; the words under the headline settle in behind. All on the arrival curve, in transforms and opacity, done inside 1.5 s. Under reduced motion the hero only fades in, over 240 ms.
- **A day on one phone, from 768 px** (the user, 2026-09-30: "overdrive for about page"; then "for mobile keep it like before … for larger screens like ipad or laptop this looks way good"): the day's six steps pass beside one phone, held in the middle of the screen in a sunken well. Below 768 px there is no held phone: each step shows its own screens under its words (the stock and the numbers side by side), rising out of their well as they scroll in. Its screen changes as each step reaches the middle, the way the app moves: a screen pushes in from the side over the last (560 ms, the arrival curve), which is pushed a little aside and dimmed; the bill rises as a sheet over Home. Knowing where you stand shows the stock, then the numbers; the last step is the expenses. Once a screen settles, a caramel ring marks what the step is about (the order adding up, what is due today, Share and Download PDF, what the customer owes, the low stock, the sales, the costs by category). A rail numbers the steps, the one being read filled caramel, those read outlined; the others dim. Scrolling up plays it back; under reduced motion the screens fade.
- **Motion as it scrolls** (the user, 2026-09-30: "give animation while scrolling down and up also"): tied to the scroll itself (CSS scroll timelines), so scrolling back up plays it backwards. Titles rise out of their own line as they come into view, as the headline does; each point's check is drawn as it comes in, as a job is ticked off; the pictures of who it is for are set down one after another, and the three devices slide in; the hero's laptop and phone step back as the page moves on; the closing photograph settles into its band. Transforms, opacity and a check's stroke only. A browser without scroll timelines, and a visitor who asks for reduced motion, see the page still.

### Installing the app
- **Install app** stands with the other menus: a row of its own in More, above Sign out, with a download medallion and "Add Brio to your home screen"; the sidebar's last place on a tablet and a desktop. It is not there inside the installed app.
- **The sheet:** the app's icon at 56 px beside a line on what installing gives, then **Install** where the browser offers it (full width, primary), then three numbered steps. Each is a Flour Well card with a caramel number disc on the left and, on the right, the mark the device shows for that step (Safari's Share, Chrome's three dots, an add-to-home square). The heading names the device ("On iPhone or iPad"). A muted line ends it.
- **Offline:** a whole-screen stop, like Not found, with the crossed-out wifi mark, "You're offline" in the display serif, and **Try again**. While the app is open and the connection drops, a quiet warning-tinted bar sits over the screen with **Try again**.
- **Icons:** the "b" and its leaf on dark green (see The brand); the maskable one keeps the mark inside the middle 56 %, green to every edge.

### The developer console
- **Its own look, and only there** (the user, 2026-09-27): white and blue with the sans throughout, `data-theme="dev"`. It is set on the page while the console is open, so its sign-out card takes it too, and it never reaches an owner's screens. Ground #f5f7fb, paper white, well #eef2f8, hairline #dde4ee, ink #0f1b2d, muted #4a5a70, blue #1d4ed8 on white 6.7 : 1.
- **Frame:** a white top bar with the app's icon at 36 px, "Brio · Developer console", who is signed in, and Sign out; under it, tabs for Overview, Users and Audit log, the open one underlined in blue.
- **Pages:** the kit's cards, stat tiles and list states. Stored values (an audit entry's before and after) are shown as indented JSON in the mono face, in a well that scrolls sideways.

### Date picker
- **One calendar** (`date-picker`) for every day the app asks for: a custom period's two ends, the orders filter's due dates, an expense's date, and an order's delivery day. The browser's own date control never opens.
- **The control** sits in the look of where it sits, as a select does: a field's Flour Well, or a small hairline box beside the period pill. It shows the day ("27 Sep 2026") after a calendar mark, or muted words while none is chosen ("Choose a date", "Any day").
- **The calendar:** Oat Paper, one hairline, 16 px corners and the elevated shadow, 334 px wide with a 12 px inset. The month is in the display serif between round Previous and Next buttons, each dimmed past the bounds. Weeks run from Monday. Days are 44 px circles, a finger's width. The chosen one is filled caramel with its number semibold, today is ringed in caramel, and days out of bounds fade to 35 %. Under a hairline, **Today** is in caramel and, where the field may be empty, **Clear** is muted.
- **Where it opens:** as the select's list does, in the top layer against its control (`anchored-popover`), at most 456 px tall: six weeks fit without scrolling.
- **Keyboard:** the focus goes to the chosen day or today. The arrows move a day or a week, Page Up and Page Down a month (with Shift, a year), and Home and End go to the week's ends. Enter takes the day, and Escape closes the calendar and never the sheet behind it.
- **A day and a time** (an order's delivery) are one field: the calendar, then the time from a select every quarter of an hour, side by side under one label.

### Profile picture
- **The owner's own account only** (`profile-avatar`): one of nine animal faces or 24 people that ship with the app, on a round well of Caramel Cream / Terracotta Blush; a person's own pastel disc fills the well to its edge. 36 px in the top bar and the account menu; 80 px on Settings' profile card, ringed in Oat Paper where it overlaps the plate. A customer keeps their initials (`avatar`).
- **On Settings it is a button** named "Change profile picture", with a 28 px caramel badge and a pencil at its lower right; it grows a little under a pointer.
- **The chooser:** **Animals** then **People**, each under a small uppercase heading, three across on a phone and four from 640 px, each 80 px over its name in 12 px; the one in use has a caramel ring with a 2 px gap and a caramel tick badge, and its name in semibold. Tapping one saves it, a spinner over that picture meanwhile. A bottom sheet on a phone, a dialog from 768 px.

### Empty State
- **An icon in the kit's medallion** (`empty-state`), the title in the serif (20 px), a muted hint, and one secondary action. The inbox's title is **All quiet**.
- **A search or a tab that matches nothing** keeps a plain line, with no medallion.
- *Drawings were tried here on 2026-09-28 and taken out the same day: the supplied ones were too small to stay sharp on a phone.*

### Cards / Containers
- **Corner style:** 16 px.
- **Background:** Oat Paper on the cream ground.
- **Shadow:** Card (see Elevation).
- **Border:** one hairline.
- **Internal padding:** 16 px, or 12 × 16 px for a row.
- **A sheet over a sheet** (a picture picker over the product form): Escape closes only the one on top, focus goes back to what opened it, and the form behind keeps what was typed.

### Rows
- One line of a list: a tile, an avatar or a medallion; a title (14 px semibold) with one or two lines under it; what it amounts to at the right edge (an amount, a pill, a time); and a chevron when it goes somewhere.
- The whole row is the target. On a desktop the right edge carries a scannable figure.
- **An order row** says when it is due as a maker plans by it — "Today · 4:00 PM", "Tomorrow · 9:30 AM", "30 Sep · 5:30 PM" — and an open order from a day gone by says how late it is, "3 days late", in brick. Its pill keeps the real status, so a late order still shows how far it has got. Where the line is too short for both when and what is owed, it breaks between them, after the "·", and cuts neither.
- **Product card:** its picture sits in a 144 px Flour Well tile, 80 % of its height, whatever the card's width; the tile never grows as the picture arrives, so nothing below it moves.
- **Action row** (`ActionRow`): a card-width row that opens something rather than naming a record: a mark, a title and a line under it, and a chevron. Add custom item above the product grid, and the customer on an order, are both one.

### Inputs / Fields
- **Style:** Flour Well fill, a Field Edge border (Oat Field Edge, Blush Field Edge), 12 px corners, 12 × 16 px padding, 14 px medium text. The edge clears 3 : 1 against the page, the card and the well itself, so an empty field can be found before it is focused (WCAG 1.4.11; audit A1, 2026-09-29). A hairline stays for cards and dividers, never for something typed into; the search box and the quantity stepper take the edge too.
- **Focus:** the border turns caramel with a 1 px caramel ring, and the caret is caramel.
- **Error:** a brick border and ring, with the message beside the field.
- **Read-only:** muted text, a hairline in place of the edge (there is nothing to type), and no focus ring.

### Status Pill
- A fully round tinted pill (12 % of its status colour on paper), 12 px medium words, and a 6 px dot in the same colour.
- It is how an order's or a payment's state always reads.

### Medallion
- An icon (lucide, 1.75 stroke) in a round tint: 36, 44 or 56 px.
- It is decorative: the words beside it carry the meaning.

### Stat Tile
- A medallion, the figure (the serif for money), and its label.
- On a phone the label sits beside the medallion. From 1024 px the label drops under the figure and a sparkline takes the medallion's row, so every tile is the same height.
- **A tile that goes somewhere** is a target as a row is: the whole tile, named by its label, with a chevron beside it. Home's Due today, To collect and Low stock open their screens.
- **Under the figure**, one of: how it moved, or what needs seeing in brick ("6 late" under Due today, so a zero today never hides late orders).

### Navigation
- **Bottom bar:** five places in equal columns, the current one on a Caramel Cream pill with a semibold caramel label. It is measured in px, like a native tab bar, so a larger text size cannot push the last place off the edge.
- **Sidebar and rail:** the same active pill; a sidebar place is at least 44 px tall, a rail place 48 px square.
- **Tabs:** underlined for the views of a screen, each 44 px tall; a single 2 px caramel underline glides to the chosen tab over 300 ms, stretched by a transform, never by its width.
- **Section heading:** a serif title with **View all** and an arrow at its end, which goes to another screen or shows another view of this one (Recent expenses → Transactions).
- **Bell:** a bell with the unread count in a small brick (danger) circle ringed in paper, 1 to 9 then "9+".
- **Arriving at a screen:** a screen arrives drawn, with its data; there is no full-screen loader. A navigation still on its way after 150 ms puts the next screen's skeleton in the page's place (a title bar, a line under it, four rows, in Flour Well), with the header and the navigation kept.

### Response Card
- The one way an outcome is reported, on the web and in the app: a medallion, a serif title, the message, up to three facts in a strip, and at most two actions.
- It rises a short way as a sheet on a phone, and zooms in from the middle of the screen as a dialog on a desktop. Plain successes close themselves after 3 seconds.
- **A plain success over an open sheet** is drawn inside that sheet, above its content, where it can be tapped and is read out. With no sheet open it floats above everything, even a sheet still sliding away. Its close button is named for it (`Close “Stock recorded”`).
- **A confirm card** stands before anything that cannot be undone: marking an order Delivered or Completed, cancelling it, deleting, clearing an order being built, signing out. The safe answer ("Not yet", "Keep order", "Stay signed in") is always offered; on a destructive one the confirm is brick and focus rests on the safe answer, so Enter cannot destroy anything.

### Photographic Band and Quote Block
- **Hero and band:** a Flour Well panel with serif words on the left and an app-owned plate fading in on the right.
- **Quote block:** a line of encouragement in italic Fraunces on Flour Well, with a small plate.

### Motion
- **Easing:** one arrival curve, `cubic-bezier(0.16, 1, 0.3, 1)`.
- **Durations:**
  - on a phone, sheets slide up from the bottom edge over 320 ms and go back down it;
  - from 768 px, every sheet and card is a centred dialog that zooms in from the middle of the screen, from 90 % over 280 ms, whatever opened it, and shrinks back there;
  - exits take 200 ms;
  - a row that joins a list drops in over 240 ms, and the gap one leaves closes;
  - content that replaces a placeholder fades in over 200 ms.
- **Figures** roll the way they moved, up or down, over 220 ms; a pill that comes pops in, and one that goes shrinks away in 200 ms.
- **A change made under a sheet** plays once the sheet has left, where it can be seen.
- **A row that joins a list in a sheet** opens from nothing over 260 ms, so the sheet grows smoothly to hold it instead of jumping.
- **Reduced motion:** every movement becomes a short fade.

## Do's and Don'ts

### Do:
- **Do** name a role (`surface`, `text-muted`, `primary`, `action`, a status) and let the theme decide the colour.
- **Do** keep to one espresso control per screen, and make it the thing to do next.
- **Do** show state as a tinted pill with a dot, in the shared status colours.
- **Do** set headline money in Fraunces with tabular numerals, and everything operated in Inter.
- **Do** put a list's rows inside one hairline card, and let the right edge carry the figure to scan.
- **Do** tint every shadow with `--shadow-tone`, and keep the elevated shadow for what floats.
- **Do** give every target 44 px and pay every safe area.
- **Do** report an outcome on the response card; keep field errors beside their field.
- **Do** mark products and expense categories with the app's own illustrations.

### Don't:
- **Don't** pick a hex in a screen, or add a third theme or a dark variant.
- **Don't** set words in Honey Gold or Apricot Glaze.
- **Don't** nest cards, or wrap every group in a container when proximity already groups it.
- **Don't** use grey or black shadows, or a hard offset shadow.
- **Don't** set text on a photograph: plates fade to nothing before the words.
- **Don't** use a toast; outcomes go on the response card.
- **Don't** show uploaded photographs of products, customers or anything else. The logo is the only upload.
- **Don't** let a screen restyle a kit button, field, row or sheet; a pattern needed twice belongs in the kit.
