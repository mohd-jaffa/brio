# Brio — Impeccable technical audit

Date: 2026-09-29. Baseline: working copy based on `1eea5b7`.

## Implementation integrity: pass

Brio expresses a coherent, product-specific system: Golden and Peach share semantic tokens and a component kit; order entry follows the approved workflow; forms, bills, navigation and response cards use the existing product vocabulary. No redesign or new feature is needed to address this audit.

**Provisional health score: 15/20 — Good.** Four verified issues: **0 P0, 1 P1, 3 P2, 0 P3**. Fix the field contrast first, then the chart summary, picker keyboard behavior and waiting states. This is a sampled technical audit, not a WCAG conformance certification.

| Dimension | Score | Evidence |
|---|---:|---|
| Accessibility | 2/4 | Field boundaries have insufficient contrast; two pickers expose radio roles without arrow navigation; Home announces a mismatched chart total. |
| Performance | 3/4 | Server-seeded reads, lazy sheets, optimized images and reduced-motion branches are present. Production timing and frame-rate measurements were not taken. |
| Responsive design | 3/4 | All 132 sampled screen/theme/width combinations fit without page overflow. Physical-device safe areas, software keyboards and text zoom were not re-tested. |
| Theming | 4/4 | Both approved themes switch and persist correctly; shared tokens supply the screen colors. Dark mode is explicitly out of scope. |
| Implementation integrity | 3/4 | Coherent shared system; a chart summary and three report screens misrepresent their underlying state. Detector advisories are explained below. |
| **Total** | **15/20** | **Good — address the verified gaps.** |

Scores reflect the inspected scope. Performance and responsive design remain provisional because their full production/device checks were not repeated.

## Verified findings

### A1 · P1 — Resting text-field boundaries disappear at low contrast

- **Category:** Accessibility.
- **Location:** `src/components/ui/field-styles.ts:10`; token values in `src/app/globals.css:41` and the Peach block starting at line 73.
- **Evidence:** The shared field style uses `border-border` and `bg-sunken`. Computed browser styles on Business details match the source values in both themes. Against the surface used by form sheets, Golden's border is **1.35:1** and Peach's **1.29:1**. The field fill offers only **1.19:1** and **1.17:1**, respectively. Ratios are rounded here for readability.
- **Impact:** An empty, unfocused input or textarea has no sufficiently contrasting boundary to show a person with low vision where to enter text. The stronger focused state does not solve discovering the control before focus.
- **Standard:** WCAG 2.2 AA 1.4.11 requires necessary visual indicators to reach 3:1; W3C explicitly includes text-input borders. This finding concerns field boundaries, not decorative card dividers or text-labelled buttons. [W3C: Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html).
- **Recommendation:** Give editable field boundaries a semantic token that clears 3:1 on their adjacent backgrounds in both themes. Apply it through the shared field kit; retain softer decorative dividers elsewhere. Check empty, populated, error, focus and disabled states separately.
- **Suggested command:** `/impeccable harden`.
- **Verification after fixing:** Measure the new token pairings and inspect an empty product/customer form and Business details in both themes.

### A2 · P2 — Home's accessible sales summary totals a different period

- **Category:** Accessibility / Implementation integrity.
- **Location:** `src/features/dashboard/components/Home.tsx:180`; period calculation in `src/features/dashboard/summary.ts:18`.
- **Reproduction:** Open Home on desktop with Today selected. In the local demo on 29 September, the chart is labelled “Sales per day from 23 Sep to 29 Sep: ₹0 in all.” Its accessible table contains **₹1,460 on 24 Sep and ₹3,040 on 26 Sep**, a **₹4,500** total.
- **Cause:** The dates and bars come from `salesByDay`, which includes at least seven days. The spoken total uses `data.sales`, which covers the selected Today/Week/Month period. The mismatch also occurs early in a week when earlier days contain sales.
- **Impact:** A screen-reader user receives contradictory financial information. The full data table provides a workaround, so this is not a task blocker.
- **Standard:** Equivalent, accurate chart alternatives; plan §139.11.11.
- **Recommendation:** Build the chart's summary total from the same points it plots, using the existing money helper. Keep the selected-period KPI unchanged.
- **Suggested command:** `/impeccable harden`.
- **Verification after fixing:** Add a regression where today's total differs from the seven-day chart total, plus a Week case whose chart begins before the week.

### A3 · P2 — Customer and illustration pickers lack radio-group keyboard behavior

- **Category:** Accessibility.
- **Location:** `src/components/ui/customer-picker.tsx:78`; `src/components/ui/illustration-picker.tsx:56`.
- **Reproduction:** Open Create order → Choose a customer, focus Guest, then press Arrow Down: focus and selection remain on Guest. Open Products → Add product → Change picture, focus Price tag, then press Arrow Right: nothing changes. All **59 illustration choices** are independent Tab stops.
- **Cause:** Buttons declare `role="radio"` and `aria-checked`, but neither picker supplies arrow navigation or a roving Tab stop.
- **Impact:** The control behaves differently from the radio group announced to assistive technology. Keyboard users must repeatedly Tab through a large illustration library. Tab and activation still work; this is a usability and pattern-conformance gap, not a complete keyboard lockout.
- **Standard:** The [WAI-ARIA radio-group pattern](https://www.w3.org/WAI/ARIA/apg/patterns/radio/) uses a single entry point and arrow movement. The illustration picker also has an explicit arrow-key requirement in plan §139.5.
- **Recommendation:** Reuse the existing arrow-selection infrastructure or use a deliberate selection pattern that preserves the chooser until activation. Make focus, selection and dismissal consistent; moving an arrow must not unexpectedly close the sheet before the user can explore choices.
- **Suggested command:** `/impeccable harden`.
- **Verification after fixing:** Test forward/backward movement, wraparound, entry at the current choice, activation, Escape, and focus return for both pickers.

### A4 · P2 — Incomplete custom ranges appear to load forever

- **Category:** Implementation integrity / Accessibility.
- **Location:** `src/features/analytics/components/Analytics.tsx:50` and `:132`; the same source pattern occurs in `src/features/expenses/components/Expenses.tsx:56` and `:121`, and `src/features/customers/components/GuestSales.tsx:33` and `:59`.
- **Reproduction:** In Analytics, choose Custom while From/To are empty. The figures become animated skeletons and the accessibility tree says “Loading analytics.” They remain in that state until the dates are entered. This was reproduced in the browser; the Expenses and Guest sales instances were confirmed in source.
- **Cause:** Fetching is correctly disabled by a null query while the dates are incomplete, but the render path treats waiting for user input as a pending network request.
- **Impact:** Owners can wait for work that is not running. Assistive technology receives a busy state without an explanation of the action needed to continue.
- **Standard:** Accurate loading and feedback states under plan §139.10; this is not presented as a separate formal WCAG failure.
- **Recommendation:** Show a short instruction to choose both dates while the range is incomplete, without a busy state. Reserve skeletons for an actual pending request. Put the wording in the existing message catalogue.
- **Suggested command:** `/impeccable clarify`, followed by `/impeccable harden` for the state logic.
- **Verification after fixing:** Test empty and one-ended ranges, a complete range, network loading, success and failure across the three report screens.

## Detector review and false positives

`impeccable detect --json src` returned **ten advisory findings**, with no non-advisory findings:

- Six `#000` color advisories in `globals.css` are image-mask opacity stops, not rendered black UI. No palette defect.
- Three color advisories and one type-size advisory belong to the branded launch splash. Its separate Brio identity is approved by plan §139.11.18–19. These are documentation gaps in the detector's palette/type vocabulary, not evidence for recoloring the splash. Record the intentional exception next time that design documentation is updated.
- The context loader flags `PRODUCT.md` declaring web while `android/build.gradle` exists. Brio intentionally wraps its shared web UI with Capacitor. Clarify this distinction in Impeccable context documentation if desired; do not switch the audit to an Android-only visual system.

The live geometry scan also found 17 px-tall order-number links on desktop. Their whole table row is clickable and measures approximately 73 px tall, so these were not counted as undersized pointer targets. The product-grid Add buttons are drawn at 32 px and use the shared `hit-area`; their visual box alone is not proof of a touch-target defect.

## Patterns and positive findings

- **The gaps sit at shared boundaries:** field styling affects many forms; radio semantics drift in two pickers; three reports conflate user-input waiting with loading. Fixing the owning components/patterns avoids screen-specific patches.
- **Text contrast is strong:** muted text on the field well measures 5.62:1 in Golden and 5.32:1 in Peach. Primary-button text measures 7.04:1 and 5.41:1.
- **Responsive foundations hold in the sampled states:** every screen/theme/width sample had one visible primary heading, labelled text fields, and no page-level horizontal overflow.
- **Nested modal behavior works:** Escape closed the illustration chooser alone, kept the product form open, and returned focus to Change picture. Closing the customer chooser returned focus to its opener.
- **The custom calendar fits at 360 px:** measured width 334 px, left edge 16 px, right edge 350 px; focus opened on the current day and Escape dismissed it.
- **Performance foundations are deliberate:** first reads are seeded, sheets load lazily, image dimensions are specified, and motion has explicit reduced-motion branches. No production speed claim is inferred from the development server.
- **Regression coverage exists:** all **380 tests across 64 files** in the focused shared UI, navigation and Home component run passed. These tests do not establish browser accessibility conformance or production performance.

## Scope and evidence limits

Reviewed the plan's shared kit, response, input, device, responsive and chart requirements; product/design context; shared components; and affected feature code. Ran the bundled detector once and manually verified its advisories.

Live review used the local Next.js development server and existing local demo business. The matrix covered **11 screens × 6 widths × 2 themes = 132 samples**:

- Home, Orders, Products, Customers, Inventory, Analytics, Expenses, Notifications, Business details, Settings, and the initial Create order screen.
- Widths: **360, 390, 414, 768, 1024, 1440 px**, with a 900 px viewport height for the matrix.
- Golden and Peach; additional 360 × 800 checks of forms, the calendar and custom-range state.

These are baseline-state DOM geometry checks plus selected screenshots and interactions, not exhaustive validation of all data lengths, errors or transaction journeys. Page-level overflow checks alone do not prove that no descendant clips content.

Not repeated: an axe sweep, screen-reader software testing, all authentication/developer/detail screens, physical Android/iOS devices, simulated notch insets, software keyboards, text zoom, production build/bundle profiling, or transactional E2E. No application fix, database migration or business-data mutation was made for this report. Temporary theme/range changes were restored. Unrelated work in the shared checkout was excluded from the audit commit.

## Recommended sequence

1. **P1 — `/impeccable harden`:** fix shared editable-field contrast.
2. **P2 — `/impeccable harden`:** correct Home's chart summary and implement picker keyboard behavior.
3. **P2 — `/impeccable clarify`:** write the incomplete-range instruction; use `/impeccable harden` to separate waiting and loading states.
4. **`/impeccable polish`:** confirm the resulting changes in both themes and across target widths.

These can be requested one at a time, together, or in another order. Re-run `/impeccable audit` after fixes to reassess the score.

## Resolution (2026-09-29)

All four findings were checked against the code, found valid, and fixed (`/impeccable harden`, `clarify`, `polish`).

- **A1 · fixed.** A new token, `field-edge`, carries every editable boundary: Golden `#918070`, Peach `#9a7d70`, the developer console `#7d8a9c`. Each clears **3.1 : 1 or more** against the page, the card and the field's own well. It is applied through the kit: `FIELD_WELL` (text fields, textareas, the select and the date field), the search box and the quantity stepper. A read-only field keeps the hairline, since nothing is typed there. Decorative dividers and labelled filter buttons are unchanged.
- **A2 · fixed.** Home's chart summary totals the days the chart draws, and the period's own total stays in its tile. In the local demo it now reads "₹4,500 in all", matching its table. A regression test covers a day's total that differs from the chart's.
- **A3 · fixed.**
  - The illustration picker, the customer picker and the profile-picture sheet share `useSheetChoice`, built on the kit's `useArrowSelection`. Each has one Tab stop, entering at the choice in use.
  - The arrow keys, Home and End move the mark and focus together, wrapping round, without committing or closing. Enter, Space or a tap commits.
  - Each opening starts again from the choice in use.
  - `Modal` now begins at a control in the Tab order, so a sheet opens on the current choice rather than the group's first button.
- **A4 · fixed.** While a custom period lacks a date, Analytics, Expenses (every tab) and Guest sales show one calm prompt, *"Choose both dates — Pick a From and a To date above, and the figures for those days appear here."* It is a polite status with no busy state (`RangePrompt`). Skeletons are kept for a request in flight.

**Verified:**
- The unit suites cover each fix, including the keyboard walk, wraparound, entry and reopening, and the prompt on every screen.
- The full suite passes, and `tsc` and `eslint` are clean.
- One batched browser round in Golden and Peach, at 390 and 1280 px:
  - the fields' edges show at rest;
  - the picker entered at the choice in use and stayed open under the arrows;
  - the custom range showed the prompt with no busy region;
  - Home's summary matched its bars.
