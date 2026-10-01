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

/**
 * Where on the screen a step's title turns the phone to it: a little below the
 * middle, as the title arrives where it will be read.
 */
export const TURN_LINE = 0.6;

/** The stop shown: the last whose marker has crossed the line, and the first before any has. */
export function stopAt(markers: readonly number[], line: number): number {
  let active = 0;
  markers.forEach((top, at) => {
    if (top <= line) active = at;
  });
  return active;
}

/**
 * Where the phone is held beside the steps: wide enough for both, and tall
 * enough for the phone. Elsewhere — a phone, upright or on its side — each step
 * keeps its own screens. The `held` variant in globals.css is the same query.
 */
export const HELD = "(min-width: 768px) and (min-height: 600px)";

/** Each step's stops, for where each step shows its own screens. */
const stopsOf = (step: StepId) => DAY_STOPS.filter((stop) => stop.step === step);

/**
 * The ring round what a step is about on its screen. On the held phone it comes
 * once the screen has settled; on a step's own screens it is `still`, always there.
 */
function Spot({ spot, still = false }: { spot: Stop["spot"]; still?: boolean }) {
  return (
    <span
      aria-hidden="true"
      data-pill={spot.pill || undefined}
      data-still={still || undefined}
      className="day-spot"
      style={{ left: `${spot.x}%`, top: `${spot.y}%`, width: `${spot.w}%`, height: `${spot.h}%` }}
    />
  );
}

/**
 * A day on one phone (plan §139.11.22; the user, 2026-09-30: "overdrive for
 * about page", then "for mobile keep it like before … for larger screens like
 * ipad or laptop this looks way good"; the critique, 2026-10-01: on a phone,
 * the ring and the numbers too, and a phone on its side is not held).
 *
 * On a screen wide and tall enough (`HELD`), the phone stays where it is
 * while the day's six steps pass beside it, and its screen changes as each
 * step comes up, the way the app
 * itself moves: Home pushes in from the side, the bill rises as a sheet. A
 * ring marks what the step is about, and scrolling back plays it back. Which
 * stop is shown is worked out once a frame from where the steps' titles
 * stand against a line a little below the middle of the screen (`TURN_LINE`);
 * the screens move in CSS (globals.css, `.day-screen`), and fade under
 * reduced motion. The status bar and the header stay still above them
 * (`.day-chrome`), as they do in the app, and the bill rises as the app's
 * own sheet does, over its scrim.
 *
 * Elsewhere each step shows its own screens below its words, one under the
 * other, as they rise out of their well, each with its ring; each step
 * carries its number beside its title. Neither layout fetches the other's pictures,
 * nor its own before they are wanted: the held phone's screens after the
 * first are drawn only while held, once the day comes into view — a
 * step's turn is still most of a screen away; each step's own are fetched
 * lazily, which a hidden picture never is.
 */
export function DayOnOnePhone() {
  const [active, setActive] = useState(0);
  const [held, setHeld] = useState(false);
  const [near, setNear] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const media = window.matchMedia(HELD);
    const element = root.current!;
    let frame = 0;
    const measure = () => {
      frame = 0;
      setHeld(media.matches);
      if (!media.matches) return;
      if (element.getBoundingClientRect().top < window.innerHeight) setNear(true);
      const markers = [...element.querySelectorAll<HTMLElement>("[data-stop]")].map(
        (marker) => marker.getBoundingClientRect().top,
      );
      setActive(stopAt(markers, window.innerHeight * TURN_LINE));
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
    <div ref={root} className="day mt-14 held:grid held:grid-cols-2 held:gap-16">
      <div className="day-stage held:col-start-2 held:row-start-1">
        <span aria-hidden="true" className="day-well" />
        <PhoneShell className="day-phone">
          {DAY_STOPS.map(
            (stop, at) =>
              (at === 0 || (held && near)) && (
                <div
                  key={stop.shot}
                  data-state={screenState(at, active)}
                  data-enter={stop.enter}
                  aria-hidden={at !== active || undefined}
                  className="day-screen"
                  style={{ "--at": at } as CSSProperties}
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
                  <Spot spot={stop.spot} />
                </div>
              ),
          )}
          {/* One status bar and header, the app's own, held still while only what is under them moves. */}
          <div aria-hidden="true" className="day-chrome">
            <Image
              src={LANDING_SHOTS[DAY_STOPS[0].shot]}
              alt=""
              fill
              sizes="290px"
              loading="lazy"
              fetchPriority="low"
              className="object-cover"
            />
          </div>
          {/* The app's scrim, over all of it while a sheet is up. */}
          <span
            aria-hidden="true"
            data-shown={DAY_STOPS[active].enter === "sheet" || undefined}
            className="day-scrim"
          />
        </PhoneShell>
      </div>

      <ol className="day-steps held:col-start-1 held:row-start-1">
        {STEPS.map((id, at) => {
          const words = text.features[id];
          const stops = stopsOf(id);
          const pair = stops.length > 1;
          return (
            <li
              key={id}
              aria-labelledby={`landing-${id}`}
              data-state={at === current ? "current" : at < current ? "done" : "next"}
              className="day-step max-w-2xl"
            >
              <span data-stop="" aria-hidden="true" className="day-marker" />
              <span aria-hidden="true" className="day-number">
                {at + 1}
              </span>
              <div className="day-words max-w-xl">
                <div className="flex items-start gap-3">
                  {/* Where no rail numbers the steps, each carries its own number. */}
                  <span
                    aria-hidden="true"
                    className="day-ordinal grid size-8 shrink-0 place-items-center rounded-full border border-primary text-sm font-semibold tabular-nums text-primary sm:mt-1 held:hidden"
                  >
                    {at + 1}
                  </span>
                  <RisingTitle
                    as="h3"
                    id={`landing-${id}`}
                    className="min-w-0 font-display text-[1.75rem] font-medium leading-[1.15] tracking-[-0.025em] text-text text-balance sm:text-[2rem]"
                  >
                    {words.title}
                  </RisingTitle>
                </div>
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
              {/* Unheld, the step's own screens, one under the other, rising out of a well of the page's sunken ground. */}
              <div className="day-shelf landing-shelf relative isolate mt-10 flex flex-col items-center gap-8 py-6 held:hidden">
                <span
                  aria-hidden="true"
                  className="landing-well absolute inset-x-0 inset-y-[16%] -z-10 rounded-[2rem] bg-sunken"
                />
                {stops.map((stop, index) => (
                  <PhoneFrame
                    key={stop.shot}
                    src={LANDING_SHOTS[stop.shot]}
                    alt={SHOT_ALT[stop.shot]}
                    sizes={pair ? "(min-width: 640px) 270px, 62vw" : "(min-width: 640px) 290px, 68vw"}
                    // A pair steps down the well, the first a little to the left, the second to the right.
                    className={cn(
                      "landing-shelf-phone",
                      pair ? "w-[62%] max-w-[270px]" : "w-[68%] max-w-[290px]",
                      pair && (index === 0 ? "mr-[18%]" : "ml-[18%]"),
                    )}
                  >
                    <Spot spot={stop.spot} still />
                  </PhoneFrame>
                ))}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
