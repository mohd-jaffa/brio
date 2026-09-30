"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

import { BRAND, brandWidth } from "@/assets/brand";
import { WELCOME_SCENES, type WelcomeScene } from "@/assets/onboarding";
import { Button } from "@/components/ui/button";
import { UI_TEXT } from "@/constants/messages";
import { BUSINESS_ROLES } from "@/constants/roles";
import { useBusiness } from "@/features/business/hooks/useBusiness";
import { afterLaunch } from "@/lib/launch/splash";

import { AuthClient } from "../api.client";
import { useAuth } from "../AuthProvider";
import type { AuthProfile } from "../types";

const text = UI_TEXT.welcome;

/** How long the welcome takes to lift away (globals.css, `.welcome[data-leaving]`). */
export const WELCOME_LEAVE_MS = 420;
/** How far a finger must carry a slide to turn it. */
export const WELCOME_SWIPE_PX = 56;
const WORDMARK_HEIGHT = 26;

interface Slide {
  scene: WelcomeScene;
  title: string;
  body: string;
}

const firstNameOf = (name: string) => name.trim().split(/\s+/)[0];

function slidesFor(profile: AuthProfile, business: string | undefined): Slide[] {
  return [
    {
      scene: "maker",
      title: text.hello.title(firstNameOf(profile.name)),
      body: text.hello.body(business || text.yourBusiness),
    },
    { scene: "calendar", ...text.orders },
    { scene: "bouquet", ...text.bills },
    { scene: "desk", ...text.numbers },
  ];
}

const stateOf = (slide: number, current: number) =>
  slide === current ? "current" : slide < current ? "before" : "after";

/**
 * The welcome (plan §139.11.20; the user, 2026-09-30): four slides, once, for
 * a new account's owner — whichever way they first come in, on whichever
 * device — until they finish or skip it. It stands over the screen they came
 * in to, drawn with the page, so that screen never shows first; finishing
 * lifts it away and the screen is there.
 */
export function Welcome() {
  const { profile, requiresPasswordChange, adopt } = useAuth();
  if (!profile || profile.welcomedAt || requiresPasswordChange || !BUSINESS_ROLES.includes(profile.role)) return null;
  return (
    <WelcomeSlides
      profile={profile}
      onDone={(welcomedAt) => void adopt({ profile: { ...profile, welcomedAt }, requiresPasswordChange })}
    />
  );
}

/**
 * - **A modal dialog** named "Welcome to Brio", over everything once the page
 *   is live and any launch splash has gone (`afterLaunch`); until then it is
 *   drawn over the screen, so nothing of it shows first. Focus starts on the
 *   first slide's title.
 * - **One slide at a time:** a picture, a title and a line, with dots for
 *   where it stands. Next, Back, the arrow keys and a swipe move it; each new
 *   slide is read out. The slides not shown are out of reach.
 * - **Skip, Escape and Get started** all end it. It is recorded at once
 *   (`AuthClient.markWelcomed`) and lifts away; a failed record only means it
 *   is shown again on the next visit.
 */
function WelcomeSlides({ profile, onDone }: { profile: AuthProfile; onDone: (welcomedAt: string) => void }) {
  const business = useBusiness();
  const slides = slidesFor(profile, business.data?.name);
  const last = slides.length - 1;
  const [index, setIndex] = useState(0);
  const [moved, setMoved] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const firstTitle = useRef<HTMLHeadingElement>(null);
  const drag = useRef<{ id: number; x: number; y: number; dragging: boolean } | null>(null);

  useEffect(() => {
    const element = dialog.current!;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    const stop = afterLaunch(() => {
      // Drawn open with the page, which is not yet modal: made so, in place.
      element.close();
      element.showModal();
      firstTitle.current?.focus();
    });
    return () => {
      stop();
      document.body.style.overflow = overflow;
      element.close();
    };
  }, []);

  const go = (next: number) => {
    const to = Math.max(0, Math.min(last, next));
    if (to === index) return;
    setIndex(to);
    setMoved(true);
  };

  const finish = () => {
    if (leaving) return;
    setLeaving(true);
    void AuthClient.markWelcomed().catch(() => undefined);
    const welcomedAt = new Date().toISOString();
    window.setTimeout(() => onDone(welcomedAt), WELCOME_LEAVE_MS);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === "ArrowRight") go(index + 1);
    else if (event.key === "ArrowLeft") go(index - 1);
  };

  // A swipe: the slide follows the finger, held back past either end, and
  // turns once carried far enough; otherwise it settles back.
  const setDrag = (px: number | null) => {
    const element = body.current!;
    if (px === null) {
      element.removeAttribute("data-dragging");
      element.style.removeProperty("--welcome-drag");
    } else {
      element.setAttribute("data-dragging", "");
      element.style.setProperty("--welcome-drag", `${px}px`);
    }
  };
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (leaving || event.button !== 0 || (event.target as Element).closest("button")) return;
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, dragging: false };
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const from = drag.current;
    if (!from || from.id !== event.pointerId) return;
    const dx = event.clientX - from.x;
    const dy = event.clientY - from.y;
    if (!from.dragging) {
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 8) drag.current = null;
      if (Math.abs(dx) < 8 || Math.abs(dx) <= Math.abs(dy)) return;
      from.dragging = true;
      event.currentTarget.setPointerCapture?.(event.pointerId);
    }
    const pastEnd = (dx > 0 && index === 0) || (dx < 0 && index === last);
    setDrag(pastEnd ? dx / 3 : dx);
  };
  const onPointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    const from = drag.current;
    drag.current = null;
    if (!from?.dragging) return;
    setDrag(null);
    const dx = event.clientX - from.x;
    if (event.type === "pointercancel") return;
    if (dx <= -WELCOME_SWIPE_PX) go(index + 1);
    else if (dx >= WELCOME_SWIPE_PX) go(index - 1);
  };

  const slide = slides[index];
  return (
    <dialog
      ref={dialog}
      open
      aria-modal="true"
      aria-label={text.label}
      data-leaving={leaving || undefined}
      onCancel={(event) => {
        event.preventDefault();
        finish();
      }}
      onKeyDown={onKeyDown}
      className="welcome"
    >
      <div className="welcome-frame safe-top [--safe-pt:0.75rem] safe-x [--safe-px:1.25rem] safe-bottom [--safe-pb:1.25rem] md:[--safe-px:2.5rem] md:[--safe-pb:2rem]">
        <header className="flex min-h-11 items-center justify-between gap-4">
          <Image
            src={BRAND.wordmark.src}
            alt={UI_TEXT.appName}
            width={brandWidth("wordmark", WORDMARK_HEIGHT)}
            height={WORDMARK_HEIGHT}
            loading="eager"
            className="block"
          />
          <Button label={text.skip} variant="ghost" size="sm" shape="pill" onClick={finish} />
        </header>

        <div
          ref={body}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          className="welcome-body"
        >
          <div aria-hidden="true" className="welcome-stage">
            {slides.map((each, at) => (
              <div key={each.scene} data-state={stateOf(at, index)} className="welcome-art">
                <Image
                  src={WELCOME_SCENES[each.scene]}
                  alt=""
                  fill
                  quality={75}
                  // The first is the screen's largest paint; the rest are
                  // fetched with it, so none waits when its slide comes.
                  loading="eager"
                  fetchPriority={at === 0 ? "high" : undefined}
                  draggable={false}
                  sizes="(orientation: landscape) 46vw, 88vw"
                  // Upright, each rests on the words under it, whatever its shape.
                  className="object-contain object-bottom landscape:object-center"
                />
              </div>
            ))}
          </div>

          <div className="welcome-copy">
            <div className="grid">
              {slides.map((each, at) => (
                <section
                  key={each.scene}
                  data-state={stateOf(at, index)}
                  aria-hidden={at !== index || undefined}
                  inert={at !== index}
                  className="welcome-text [grid-area:1/1]"
                >
                  <h2
                    ref={at === 0 ? firstTitle : undefined}
                    tabIndex={-1}
                    className="welcome-title text-balance font-heading text-[1.875rem] font-medium leading-[1.15] tracking-[-0.025em] text-text md:text-[2.25rem] lg:text-[2.5rem] [@media(max-height:44rem)]:text-[1.625rem]"
                  >
                    {each.title}
                  </h2>
                  <p className="mt-3 text-pretty text-base leading-relaxed text-text-muted md:text-[1.0625rem] [@media(max-height:44rem)]:text-[0.9375rem]">
                    {each.body}
                  </p>
                </section>
              ))}
            </div>

            <div className="welcome-controls">
              <div aria-hidden="true" className="welcome-dots">
                {slides.map((each, at) => (
                  <span key={each.scene} data-current={at === index || undefined} className="welcome-dot" />
                ))}
              </div>
              <div className="flex items-stretch">
                <div data-shown={index > 0 || undefined} inert={index === 0} className="welcome-back">
                  <div className="absolute inset-y-0 left-0 flex">
                    <Button
                      aria-label={text.back}
                      variant="ghost"
                      size="lg"
                      shape="pill"
                      icon={ArrowLeft}
                      onClick={() => go(index - 1)}
                    />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <Button
                    label={index === last ? text.start : text.next}
                    variant="action"
                    size="lg"
                    shape="pill"
                    fullWidth
                    icon={ArrowRight}
                    iconPosition="end"
                    onClick={index === last ? finish : () => go(index + 1)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <p aria-live="polite" className="sr-only">
        {moved ? `${slide.title}. ${slide.body} ${text.slideOf(index + 1, slides.length)}` : ""}
      </p>
    </dialog>
  );
}
