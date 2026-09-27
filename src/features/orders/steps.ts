import type { ZodError } from "zod";

import { UI_TEXT } from "@/constants/messages";
import { ApiError } from "@/lib/api/client";

import type { StockShortfall } from "./estimate";

/**
 * The steps of the order screens (plan §139.10): items, then details, then —
 * for a new order — payment. On a phone each is its own page, `?step=`, so
 * the back button walks back through them; from 1024 px they share one.
 */
export const STEPS = ["items", "details", "payment"] as const;
export type Step = (typeof STEPS)[number];

/** The paths each step answers for, and every step before it. */
const STEP_PATHS: Record<Step, readonly string[]> = {
  items: ["items"],
  details: ["items", "customer", "delivery", "adjustments", "notes"],
  payment: ["items", "customer", "delivery", "adjustments", "notes", "payment"],
};

/** The step in the address, if the screen has it; otherwise the first. */
export function readStep(value: string | null, steps: readonly Step[] = STEPS): Step {
  return (steps as readonly (string | null)[]).includes(value) ? (value as Step) : "items";
}

/** The first message under each path — what each field shows. */
export function issuesByPath(error: ZodError): Record<string, string> {
  const issues: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".");
    issues[path] ??= issue.message;
  }
  return issues;
}

/** The issues a step answers for. */
export function within(issues: Record<string, string>, step: Step): Record<string, string> {
  return Object.fromEntries(
    Object.entries(issues).filter(([path]) =>
      STEP_PATHS[step].some((prefix) => path === prefix || path.startsWith(`${prefix}.`)),
    ),
  );
}

/**
 * The stock refusal as a card that names what is short, in words — "Only 2
 * left of Red Velvet Cake." — with nothing to try again: the order has to
 * change first. Null for any other failure.
 */
export function stockRefusal(failure: unknown, title: string) {
  if (!(failure instanceof ApiError) || failure.code !== "ORDER_INSUFFICIENT_STOCK") return null;
  const shortfalls = (failure.details as { shortfalls?: StockShortfall[] } | undefined)?.shortfalls ?? [];
  if (shortfalls.length === 0) return null;
  return {
    title,
    message: shortfalls.map(({ name, available }) => UI_TEXT.newOrder.onlyLeft(name, available)).join(" "),
    requestId: failure.requestId,
  };
}
