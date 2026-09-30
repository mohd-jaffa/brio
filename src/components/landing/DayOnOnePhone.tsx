"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";

import { LANDING_SHOTS, type LandingShot } from "@/assets/landing";
import { cn } from "@/components/ui/cn";
import { UI_TEXT } from "@/constants/messages";

import { PhoneFrame, PhoneShell } from "./DeviceFrame";
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
  { step: "expenses", shot: "expenses", enter: "push", spot: { x: 3.9, y: 41.8, w: 92.2, h: 29 } },
];

const STEPS: readonly StepId[] = ["order", "due", "bill", "customers", "numbers", "expenses"];

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

/** Where the phone is held beside the steps; below it, each step keeps its own screens. */
const WIDE = "(min-width: 768px)";

/** Each step's screens, for a phone, where each step shows its own. */
const shotsOf = (step: StepId) => DAY_STOPS.filter((stop) => stop.step === step).map((stop) => stop.shot);

/** Where a screen stands in its step's row, for the scroll to set each in turn. */
const nth = (at: number) => ({ "--i": at }) as CSSProperties;

/**
 * A day on one phone (plan §139.11.22; the user, 2026-09-30: "overdrive for
 * about page", then "for mobile keep it like before … for larger screens like
 * ipad or laptop this looks way good").
 *
 * From 768 px, the phone stays where it is while the day's six steps pass
 * beside it, and its screen changes as each step comes up, the way the app
 * itself moves: Home pushes in from the side, the bill rises as a sheet. A
 * ring marks what the step is about, and scrolling back plays it back. Which
 * stop is shown is worked out once a frame from where the steps' markers
 * stand against the middle of the screen; the screens move in CSS
 * (globals.css, `.day-screen`), and fade under reduced motion.
 *
 * On a narrower screen each step shows its own screens below its words, as
 * they rise out of their well. Neither layout fetches the other's pictures,
 * nor its own before they are wanted: the held phone's screens after the
 * first are drawn only on a wide screen, once the day comes into view — a
 * step's turn is still most of a screen away; each step's own are fetched
 * lazily, which a hidden picture never is.
 */
export function DayOnOnePhone() {
  const [active, setActive] = useState(0);
  const [wide, setWide] = useState(false);
  const [near, setNear] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const media = window.matchMedia(WIDE);
    const element = root.current!;
    let frame = 0;
    const measure = () => {
      frame = 0;
      setWide(media.matches);
      if (!media.matches) return;
      if (element.getBoundingClientRect().top < window.innerHeight) setNear(true);
      const markers = [...element.querySelectorAll<HTMLElement>("[data-stop]")].map(
        (marker) => marker.getBoundingClientRect().top,
      );
      setActive(stopAt(markers, window.innerHeight / 2));
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
      <div className="day-stage md:col-start-2 md:row-start-1">
        <span aria-hidden="true" className="day-well" />
        <PhoneShell className="day-phone">
          {DAY_STOPS.map(
            (stop, at) =>
              (at === 0 || (wide && near)) && (
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
                    sizes="290px"
                    // The first waits until the phone is near; the rest are on hand
                    // before their step comes, or a turn would show a blank.
                    loading={at === 0 ? "lazy" : "eager"}
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
              ),
          )}
        </PhoneShell>
      </div>

      <ol className="day-steps md:col-start-1 md:row-start-1">
        {STEPS.map((id, at) => {
          const words = text.features[id];
          const shots = shotsOf(id);
          const pair = shots.length > 1;
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
                <p className="landing-words mt-4 text-base leading-relaxed text-text-muted text-pretty">{words.body}</p>
                <ul className="mt-6 space-y-3">
                  {words.points.map((point, line) => (
                    // The numbers come up once the stock's line has been read.
                    <Point key={point} marker={id === "numbers" && line === 1}>
                      {point}
                    </Point>
                  ))}
                </ul>
              </div>
              {/* On a phone, the step's own screens, rising out of a well of the page's sunken ground. */}
              <div className="day-shelf landing-shelf relative isolate mt-10 flex items-start justify-center gap-4 py-6 sm:gap-6 md:hidden">
                <span
                  aria-hidden="true"
                  className="landing-well absolute inset-x-0 inset-y-[16%] -z-10 rounded-[2rem] bg-sunken"
                />
                {shots.map((shot, index) => (
                  <PhoneFrame
                    key={shot}
                    src={LANDING_SHOTS[shot]}
                    alt={SHOT_ALT[shot]}
                    sizes={pair ? "44vw" : "68vw"}
                    className={cn(
                      "landing-shelf-phone",
                      pair ? "w-[46%] max-w-[240px]" : "w-[68%] max-w-[290px]",
                      index === 1 && "mt-12",
                    )}
                    style={nth(index)}
                  />
                ))}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
