import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { BRAND, brandWidth } from "@/assets/brand";
import { LinkButton } from "@/components/ui/button";
import { UI_TEXT } from "@/constants/messages";
import { PRIVACY_POLICY, type PrivacySection } from "@/constants/privacy";
import { AUTH_ROUTES, DELETE_ACCOUNT_ROUTE } from "@/constants/routes";
import { readInitialSession } from "@/features/auth/session.server";
import { supportEmail } from "@/lib/env/server";
import { formatDate } from "@/lib/format/date";

const text = UI_TEXT.privacy;

export const metadata: Metadata = {
  title: `${text.title} — ${UI_TEXT.appName}`,
};

function Action({ action, email }: { action: PrivacySection["action"]; email: string | null }) {
  if (action === "deleteAccount") {
    return <LinkButton href={DELETE_ACCOUNT_ROUTE} label={text.deleteAccount} variant="danger" shape="pill" />;
  }
  if (action === "contact" && email) {
    return <LinkButton href={`mailto:${email}`} label={text.writeTo(email)} variant="secondary" shape="pill" />;
  }
  return null;
}

/**
 * The privacy policy (plan §139.17.5, R8.10): open to anyone, signed in or
 * not, since Google Play links to it — the proxy does not run for it. Its
 * words are `PRIVACY_POLICY`; the address to write to is `SUPPORT_EMAIL`
 * (`supportEmail`). It stands on its own, outside the app shell, as a page to
 * read: the way back leads to Settings for someone signed in, and to signing
 * in for anyone else.
 */
export default async function PrivacyPage() {
  const signedIn = Boolean(await readInitialSession());
  const email = supportEmail();
  const back = signedIn ? { href: "/settings", label: text.backToSettings } : { href: AUTH_ROUTES.signIn, label: text.backToSignIn };

  return (
    <main className="safe-top safe-bottom safe-x [--safe-pt:1.5rem] [--safe-pb:4rem] [--safe-px:1.25rem] min-h-dvh bg-background">
      <article className="mx-auto w-full max-w-2xl">
        <div className="flex items-center justify-between gap-4">
          <Link
            href={back.href}
            className="touch-target -ml-2 inline-flex min-h-11 items-center gap-2 rounded-full px-2 text-sm font-medium text-text-muted transition-colors hover:text-text"
          >
            <ArrowLeft size={18} strokeWidth={1.75} aria-hidden="true" />
            {back.label}
          </Link>
          <Image
            src={BRAND.wordmark.src}
            alt={UI_TEXT.appName}
            width={brandWidth("wordmark", 32)}
            height={32}
            priority
          />
        </div>

        <header className="mt-10">
          <h1 className="font-display text-4xl leading-tight tracking-tight text-text text-balance">{text.title}</h1>
          <p className="mt-2 text-sm text-text-muted">{text.updated(formatDate(PRIVACY_POLICY.updated))}</p>
          <div className="mt-6 space-y-3 text-base leading-relaxed text-text text-pretty">
            {PRIVACY_POLICY.intro.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </header>

        <nav aria-labelledby="privacy-contents" className="mt-8 rounded-2xl border border-border bg-surface p-5 shadow-card">
          <h2 id="privacy-contents" className="text-sm font-semibold text-text">
            {text.contents}
          </h2>
          <ol className="mt-3 grid gap-1 sm:grid-cols-2">
            {PRIVACY_POLICY.sections.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="inline-flex min-h-11 items-center text-sm text-text-muted underline decoration-border underline-offset-4 transition-colors hover:text-text hover:decoration-primary"
                >
                  {section.heading}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {PRIVACY_POLICY.sections.map((section: PrivacySection) => (
          <section key={section.id} id={section.id} aria-labelledby={`${section.id}-heading`} className="mt-10 scroll-mt-6">
            <h2 id={`${section.id}-heading`} className="font-heading text-2xl font-medium leading-tight text-text">
              {section.heading}
            </h2>
            <div className="mt-3 space-y-3 text-base leading-relaxed text-text text-pretty">
              {section.paragraphs?.map((line) => <p key={line}>{line}</p>)}
              {section.points && (
                <ul className="list-disc space-y-2 pl-5 marker:text-text-muted">
                  {section.points.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              )}
              {section.after?.map((line) => <p key={line}>{line}</p>)}
            </div>
            {section.action && (
              <div className="mt-5">
                <Action action={section.action} email={email} />
              </div>
            )}
          </section>
        ))}
      </article>
    </main>
  );
}
