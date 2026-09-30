import { Check, Monitor, ShieldCheck, Smartphone, TabletSmartphone, type LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { BRAND, brandWidth } from "@/assets/brand";
import { LANDING_SHOTS, type LandingShot } from "@/assets/landing";
import { PLATES, PLATE_FOCUS, PLATE_QUALITY } from "@/assets/plates";
import { LinkButton } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { Illustration } from "@/components/ui/illustration";
import { Medallion } from "@/components/ui/medallion";
import { UI_TEXT } from "@/constants/messages";
import { AUTH_ROUTES, HOME_ROUTE, PRIVACY_ROUTE } from "@/constants/routes";

import { LaptopFrame, PhoneFrame } from "./DeviceFrame";

const text = UI_TEXT.landing;

/** Every section's measure, with the page's gutters paid through the safe areas. */
const FRAME = "safe-x [--safe-px:1.25rem] md:[--safe-px:2rem] mx-auto w-full max-w-6xl";
const SECTION_TITLE =
  "font-display text-[2rem] font-semibold leading-[1.1] tracking-[-0.03em] text-text text-balance sm:text-[2.5rem]";

const ALT: Record<LandingShot, string> = {
  home: text.shots.home,
  "new-order": text.shots.order,
  bill: text.shots.bill,
  customer: text.shots.customer,
  inventory: text.shots.inventory,
  analytics: text.shots.analytics,
  "desktop-home": text.shots.desktop,
};

const WHO = [
  { id: "bakers", picture: "strawberry-cake" },
  { id: "hampers", picture: "gift-box-red" },
  { id: "florists", picture: "rose-bouquet" },
  { id: "gifts", picture: "heart-gift-box" },
] as const;

// A day in the order it goes: the order comes in, is due, is handed over with
// its bill, is paid for, and adds to what the business knows.
const FEATURES = [
  { id: "order", shots: ["new-order"] },
  { id: "due", shots: ["home"] },
  { id: "bill", shots: ["bill"] },
  { id: "customers", shots: ["customer"] },
  { id: "numbers", shots: ["inventory", "analytics"] },
] as const satisfies readonly { id: keyof typeof text.features; shots: readonly LandingShot[] }[];

const DEVICES: readonly { id: keyof typeof text.devices; icon: LucideIcon }[] = [
  { id: "android", icon: Smartphone },
  { id: "iphone", icon: TabletSmartphone },
  { id: "computer", icon: Monitor },
];

/** Where a visitor goes next: into the app when signed in, or to make an account. */
function Start({ signedIn, size }: { signedIn: boolean; size: "sm" | "lg" }) {
  return signedIn ? (
    <LinkButton href={HOME_ROUTE} label={text.openApp} variant="action" size={size} shape="pill" />
  ) : (
    <LinkButton
      href={AUTH_ROUTES.register}
      label={size === "sm" ? text.createAccount : text.start}
      variant="action"
      size={size}
      shape="pill"
    />
  );
}

function Point({ children }: { children: string }) {
  return (
    <li className="flex gap-3 text-[0.9375rem] leading-relaxed text-text">
      <Check size={18} strokeWidth={2.25} aria-hidden="true" className="mt-[0.2rem] shrink-0 text-primary" />
      <span>{children}</span>
    </li>
  );
}

function Feature({ feature, flip }: { feature: (typeof FEATURES)[number]; flip: boolean }) {
  const words = text.features[feature.id];
  const pair = feature.shots.length > 1;
  return (
    <article aria-labelledby={`landing-${feature.id}`} className="grid items-center gap-10 md:grid-cols-2 md:gap-16">
      <div className={cn("max-w-md", flip && "md:order-2 md:justify-self-end")}>
        <h3
          id={`landing-${feature.id}`}
          className="font-display text-[1.75rem] font-medium leading-[1.15] tracking-[-0.025em] text-text text-balance sm:text-[2rem]"
        >
          {words.title}
        </h3>
        <p className="mt-4 text-base leading-relaxed text-text-muted text-pretty">{words.body}</p>
        <ul className="mt-6 space-y-3">
          {words.points.map((point) => (
            <Point key={point}>{point}</Point>
          ))}
        </ul>
      </div>
      {/* The phones rise out of a well of the page's own sunken ground. */}
      <div className={cn("relative isolate flex items-start justify-center gap-4 py-6 sm:gap-6", flip && "md:order-1")}>
        <span aria-hidden="true" className="absolute inset-x-0 inset-y-[16%] -z-10 rounded-[2rem] bg-sunken" />
        {feature.shots.map((shot, at) => (
          <PhoneFrame
            key={shot}
            src={LANDING_SHOTS[shot]}
            alt={ALT[shot]}
            sizes={pair ? "(min-width: 768px) 240px, 44vw" : "(min-width: 768px) 290px, 68vw"}
            className={cn(pair ? "max-w-[240px]" : "max-w-[290px]", pair ? "w-[46%]" : "w-[68%]", at === 1 && "mt-12")}
          />
        ))}
      </div>
    </article>
  );
}

/**
 * The landing page (`/about`; plan §139.11.22, the user, 2026-09-30): what
 * Brio is, who it is for, and a day's work in it, shown on the app's own
 * screens — a demo business photographed on a phone and a laptop
 * (scripts/landing-shots.mts). It is open to anyone, signed in or not, and
 * leads to making an account, or back into the app for someone signed in.
 * It says only what the app does.
 */
export function Landing({ signedIn, year }: { signedIn: boolean; year: number }) {
  const [madeBy, managed] = UI_TEXT.appTagline.split(/(?<=\.)\s+/);
  return (
    <div className="min-h-dvh bg-background text-text">
      <header className={cn(FRAME, "safe-top [--safe-pt:1rem]")}>
        <nav aria-label={UI_TEXT.appName} className="flex min-h-12 items-center justify-between gap-4">
          <Image
            src={BRAND.wordmark.src}
            alt={UI_TEXT.appName}
            width={brandWidth("wordmark", 32)}
            height={32}
            loading="eager"
          />
          <div className="flex items-center gap-2">
            {!signedIn && (
              <LinkButton href={AUTH_ROUTES.signIn} label={text.signIn} variant="ghost" size="sm" shape="pill" />
            )}
            <span className={cn(!signedIn && "hidden sm:inline-flex")}>
              <Start signedIn={signedIn} size="sm" />
            </span>
          </div>
        </nav>
      </header>

      <main>
        <section
          aria-labelledby="landing-title"
          className={cn(
            FRAME,
            "landing-hero grid items-center gap-14 pt-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-12 lg:pt-20",
          )}
        >
          <div className="max-w-xl">
            <h1
              id="landing-title"
              className="font-display text-[clamp(2.75rem,1.75rem+4.4vw,4.25rem)] font-semibold leading-[1.02] tracking-[-0.035em] text-text lg:text-[clamp(3rem,4.4vw,4.25rem)]"
            >
              {/* Each line rises out of its own line; the window keeps room for descenders. */}
              <span className="-mb-[0.14em] block overflow-hidden pb-[0.14em]">
                <span className="landing-line block whitespace-nowrap [--line:0]">{madeBy}</span>
              </span>
              <span className="-mb-[0.14em] block overflow-hidden pb-[0.14em]">
                <span className="landing-line block whitespace-nowrap text-primary [--line:1]">{managed}</span>
              </span>
            </h1>
            <p className="landing-settle mt-6 max-w-[34rem] text-lg leading-relaxed text-text-muted text-pretty [--settle:0]">
              {text.heroLead}
            </p>
            <div className="landing-settle mt-8 flex flex-wrap items-center gap-3 [--settle:1]">
              <Start signedIn={signedIn} size="lg" />
              {!signedIn && (
                <LinkButton href={AUTH_ROUTES.signIn} label={text.signIn} variant="secondary" size="lg" shape="pill" />
              )}
            </div>
            <p className="landing-settle mt-7 flex items-center gap-2.5 text-sm text-text-muted [--settle:2]">
              <Image src={BRAND.leaf.src} alt="" width={brandWidth("leaf", 16)} height={16} className="shrink-0" />
              {text.heroFor}
            </p>
          </div>

          {/* The laptop, with the phone stood in front of its left corner. */}
          <div className="relative pb-[4%] pl-[19%] sm:pl-[13%]">
            <LaptopFrame
              className="landing-laptop"
              src={LANDING_SHOTS["desktop-home"]}
              alt={ALT["desktop-home"]}
              sizes="(min-width: 1024px) 620px, 86vw"
              lead
            />
            <PhoneFrame
              src={LANDING_SHOTS.home}
              alt={ALT.home}
              sizes="(min-width: 1024px) 170px, 30vw"
              lead
              className="landing-phone absolute bottom-0 left-0 w-[31%] sm:w-[25%]"
            />
          </div>
        </section>

        <section aria-labelledby="landing-who" className={cn(FRAME, "pt-24 sm:pt-32")}>
          <h2 id="landing-who" className={SECTION_TITLE}>
            {text.whoTitle}
          </h2>
          <ul className="mt-10 grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
            {WHO.map(({ id, picture }) => (
              <li key={id} className="flex flex-col items-start gap-3">
                <span className="grid size-24 place-items-center rounded-full bg-sunken">
                  <Illustration name={picture} fallback="default-product" size={72} />
                </span>
                <h3 className="mt-1 font-display text-xl font-medium text-text">{text.who[id].title}</h3>
                <p className="text-sm leading-relaxed text-text-muted text-pretty">{text.who[id].body}</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="landing-day" className={cn(FRAME, "pt-24 sm:pt-32")}>
          <div className="max-w-2xl">
            <h2 id="landing-day" className={SECTION_TITLE}>
              {text.dayTitle}
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-text-muted">{text.dayLead}</p>
          </div>
          <div className="mt-14 space-y-20 md:space-y-28">
            {FEATURES.map((feature, at) => (
              <Feature key={feature.id} feature={feature} flip={at % 2 === 1} />
            ))}
          </div>
        </section>

        <section aria-labelledby="landing-devices" className={cn(FRAME, "pt-24 sm:pt-32")}>
          <h2 id="landing-devices" className={SECTION_TITLE}>
            {text.devicesTitle}
          </h2>
          <ul className="mt-10 grid gap-8 sm:grid-cols-3">
            {DEVICES.map(({ id, icon }) => (
              <li key={id} className="flex gap-4">
                <Medallion icon={icon} />
                <div>
                  <h3 className="text-base font-semibold text-text">{text.devices[id].title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-text-muted text-pretty">{text.devices[id].body}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-8 text-sm text-text-muted">{text.looks}</p>
        </section>

        <section aria-labelledby="landing-trust" className="mt-24 bg-sunken sm:mt-32">
          <div className={cn(FRAME, "grid gap-10 py-16 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-16 lg:py-20")}>
            <div>
              <Medallion icon={ShieldCheck} size="lg" />
              <h2 id="landing-trust" className={cn(SECTION_TITLE, "mt-5")}>
                {text.trustTitle}
              </h2>
              <Link
                href={PRIVACY_ROUTE}
                className="touch-target mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-primary underline decoration-primary/40 underline-offset-4 transition-colors hover:decoration-primary"
              >
                {text.privacyLink}
              </Link>
            </div>
            <ul className="grid content-start gap-6 sm:grid-cols-2">
              {text.trust.map((point) => (
                <Point key={point}>{point}</Point>
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="landing-closing" className={cn(FRAME, "pt-24 sm:pt-32")}>
          {/* The app's picture band: words on the well, a plate fading in on the right. */}
          <div className="relative isolate overflow-hidden rounded-[1.5rem] bg-sunken">
            <div aria-hidden="true" className="absolute inset-y-0 right-0 -z-10 hidden w-3/5 max-w-2xl sm:block">
              <Image
                src={PLATES["cake-table"]}
                alt=""
                fill
                quality={PLATE_QUALITY}
                sizes="(min-width: 1024px) 670px, 60vw"
                className="object-cover [mask-image:linear-gradient(to_right,transparent_15%,black_70%)]"
                style={{ objectPosition: PLATE_FOCUS["cake-table"] }}
              />
            </div>
            <div className="max-w-lg p-7 sm:p-12">
              <h2 id="landing-closing" className={SECTION_TITLE}>
                {text.closingTitle}
              </h2>
              <p className="mt-4 text-base leading-relaxed text-text-muted text-pretty">{text.closingBody}</p>
              <div className="mt-7">
                <Start signedIn={signedIn} size="lg" />
              </div>
              {!signedIn && (
                <p className="mt-4 flex flex-wrap items-center gap-x-1.5 text-sm text-text-muted">
                  {text.haveAccount}
                  <Link
                    href={AUTH_ROUTES.signIn}
                    className="touch-target inline-flex min-h-11 items-center font-semibold text-primary underline decoration-primary/40 underline-offset-4 transition-colors hover:decoration-primary"
                  >
                    {text.signIn}
                  </Link>
                </p>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className={cn(FRAME, "safe-bottom [--safe-pb:2rem] mt-20")}>
        <div className="flex flex-col gap-6 border-t border-border pt-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Image src={BRAND.wordmark.src} alt={UI_TEXT.appName} width={brandWidth("wordmark", 24)} height={24} />
            <p className="mt-2 text-xs font-medium tracking-[0.12em] text-text-muted">{UI_TEXT.appTagline}</p>
          </div>
          <ul className="flex flex-wrap gap-x-6 text-sm">
            {[
              { href: PRIVACY_ROUTE, label: text.privacy },
              ...(signedIn
                ? [{ href: HOME_ROUTE, label: text.openApp }]
                : [
                    { href: AUTH_ROUTES.signIn, label: text.signIn },
                    { href: AUTH_ROUTES.register, label: text.createAccount },
                  ]),
            ].map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="touch-target inline-flex min-h-11 items-center font-medium text-text-muted transition-colors hover:text-text"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-4 text-xs text-text-muted">{text.copyright(year)}</p>
      </footer>
    </div>
  );
}
