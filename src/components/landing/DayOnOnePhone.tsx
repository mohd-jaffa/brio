"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { LANDING_SHOTS, type LandingShot } from "@/assets/landing";
import { UI_TEXT } from "@/constants/messages";

import { PhoneShell } from "./DeviceFrame";
import { SHOT_ALT } from "./shots";
import { Point, RisingTitle } from "./Words";

const text = UI_TEXT.landing;

type StepId = keyof typeof text.features;

/** How a screen comes on, as the app moves: pushed in from the side, or rising as a sheet. */
type Enter = "first" | "push" | "sheet";

interface Stop {
  step: StepId;
  shot: LandingShot;
  enter: Enter;
  /** What the step is about on that screen, in percent of the screen; `pill` for a round button. */
  spot: { x: number; y: number; w: number; h: number; pill?: boolean };
}

/**
 * The day, screen by screen. Knowing where you stand shows the stock, and then
 * the numbers, as its lines are read.
 */
export const DAY_STOPS: readonly Stop[] = [
  { step: "order", shot: "new-order", enter: "first", spot: { x: 3.9, y: 78.3, w: 92.2, h: 8.9 } },
  { step: "due", shot: "home", enter: "push", spot: { x: 3.9, y: 43.4, w: 44.6, h: 15.2 } },
  { step: "bill", shot: "bill", enter: "sheet", spot: { x: 5.8, y: 87.9, w: 88.6, h: 6, pill: true } },
  { step: "customers", shot: "customer", enter: "push", spot: { x: 3.9, y: 46, w: 92.2, h: 16.3 } },
  { step: "numbers", shot: "inventory", enter: "push", spot: { x: 3.9, y: 33.8, w: 92.2, h: 8 } },
  { step: "numbers", shot: "analytics", enter: "push", spot: { x: 3.9, y: 61.7, w: 92.2, h: 12.6 } },
];

const STEPS: readonly StepId[] = ["order", "due", "bill", "customers", "numbers"];

export type ScreenState = "before" | "under" | "current" | "after";

/**
 * Where a screen stands while another is shown: the one shown; one still to
 * come, off to the side; one gone by, pushed aside — or, under a sheet, left
 * where it was.
 */
export function screenState(at: number, active: number): ScreenState {
  if (at === active) return "current";
  if (at > active) return "after";
  return at === active - 1 && DAY_STOPS[active].enter === "sheet" ? "under" : "before";
}

/** The stop shown: the last whose marker has crossed the line, and the first before any has. */
export function stopAt(markers: readonly number[], line: number): number {
  let active = 0;
  markers.forEach((top, at) => {
    if (top <= line) active = at;
  });
  return active;
}

/**
 * A day on one phone (plan §139.11.22; the user, 2026-09-30: "overdrive for
 * about page", A day on one phone). The phone stays where it is while the
 * day's five steps pass beside it — on a phone, pinned above them — and its
 * screen changes as each step comes up, the way the app itself moves: Home
 * pushes in from the side, the bill rises as a sheet. A ring marks what the
 * step is about. Scrolling back plays it back.
 *
 * Which stop is shown is worked out from where the steps' markers stand
 * against a line — the middle of the screen, or on a phone the middle of the
 * part under the pinned phone — once a frame as the page scrolls. The screens
 * move in CSS (globals.css, `.day-screen`); under reduced motion they fade.
 */
export function DayOnOnePhone() {
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = root.current!;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const markers = [...element.querySelectorAll<HTMLElement>("[data-stop]")].map(
        (marker) => marker.getBoundingClientRect().top,
      );
      const pinnedAbove = window.matchMedia("(min-width: 768px)").matches
        ? 0
        : stage.current!.getBoundingClientRect().bottom;
      setActive(stopAt(markers, pinnedAbove + (window.innerHeight - pinnedAbove) / 2));
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  const current = STEPS.indexOf(DAY_STOPS[active].step);
  return (
    <div ref={root} className="day mt-14 md:grid md:grid-cols-2 md:gap-16">
      <div
        ref={stage}
        className="day-stage safe-top [--safe-pt:0.75rem] md:col-start-2 md:row-start-1 md:[--safe-pt:1.5rem]"
      >
        <span aria-hidden="true" className="day-well" />
        <PhoneShell className="day-phone">
          {DAY_STOPS.map((stop, at) => (
            <div
              key={stop.shot}
              data-state={screenState(at, active)}
              data-enter={stop.enter}
              aria-hidden={at !== active || undefined}
              className="day-screen"
              style={{ zIndex: at + 1 }}
            >
              <Image
                src={LANDING_SHOTS[stop.shot]}
                alt={SHOT_ALT[stop.shot]}
                fill
                sizes="(min-width: 768px) 290px, 44vw"
                // Every screen is on hand before its step comes, or a turn would show a blank.
                loading="eager"
                fetchPriority="low"
                className="object-cover"
              />
              <span
                aria-hidden="true"
                data-pill={stop.spot.pill || undefined}
                className="day-spot"
                style={{
                  left: `${stop.spot.x}%`,
                  top: `${stop.spot.y}%`,
                  width: `${stop.spot.w}%`,
                  height: `${stop.spot.h}%`,
                }}
              />
            </div>
          ))}
        </PhoneShell>
        <ol aria-hidden="true" className="day-dots">
          {STEPS.map((id, at) => (
            <li key={id} data-current={at === current || undefined} className="day-dot" />
          ))}
        </ol>
      </div>

      <ol className="day-steps md:col-start-1 md:row-start-1">
        {STEPS.map((id, at) => {
          const words = text.features[id];
          return (
            <li
              key={id}
              aria-labelledby={`landing-${id}`}
              data-state={at === current ? "current" : at < current ? "done" : "next"}
              className="day-step"
            >
              <span data-stop="" aria-hidden="true" className="day-marker" />
              <span aria-hidden="true" className="day-number">
                {at + 1}
              </span>
              <div className="day-words">
                <RisingTitle
                  as="h3"
                  id={`landing-${id}`}
                  className="font-display text-[1.75rem] font-medium leading-[1.15] tracking-[-0.025em] text-text text-balance sm:text-[2rem]"
                >
                  {words.title}
                </RisingTitle>
                <p className="mt-4 text-base leading-relaxed text-text-muted text-pretty">{words.body}</p>
                <ul className="mt-6 space-y-3">
                  {words.points.map((point, line) => (
                    // The numbers come up once the stock's line has been read.
                    <Point key={point} marker={id === "numbers" && line === 1}>
                      {point}
                    </Point>
                  ))}
                </ul>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
