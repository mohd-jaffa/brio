import * as z from "zod";

import { VALIDATION_MESSAGES } from "@/constants/messages";
import { DATE_RANGES, DEFAULT_DATE_RANGE } from "@/constants/ranges";

import { cursorParam } from "./list";

/** How long a custom period may be: a year and a day, so a whole year fits. */
export const MAX_RANGE_DAYS = 366;

/** A day in the business's calendar, as `YYYY-MM-DD`. */
export const dayParam = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: VALIDATION_MESSAGES.invalid });

const DAY_MS = 86_400_000;

/** A period as a report or a list takes it: a preset, or Custom with its dates. */
export const rangeFields = z.object({
  range: z.enum(DATE_RANGES, { error: VALIDATION_MESSAGES.invalid }).default(DEFAULT_DATE_RANGE),
  from: dayParam.optional(),
  to: dayParam.optional(),
});

export type RangeFields = z.output<typeof rangeFields>;

/** Custom needs both its dates, the first not after the second, and no more than a year apart. */
export function customRange(query: RangeFields, ctx: z.core.$RefinementCtx<RangeFields>) {
  if (query.range !== "CUSTOM") return;
  if (!query.from || !query.to) {
    ctx.addIssue({ code: "custom", path: [query.from ? "to" : "from"], message: VALIDATION_MESSAGES.invalid });
    return;
  }
  const span = (Date.parse(query.to) - Date.parse(query.from)) / DAY_MS + 1;
  if (!(span >= 1 && span <= MAX_RANGE_DAYS)) {
    ctx.addIssue({ code: "custom", path: ["to"], message: VALIDATION_MESSAGES.invalid });
  }
}

/**
 * The period a report reads over (plan §139.11.11): a preset, or Custom with
 * its two dates, and how its trend is grouped.
 */
export const rangeQuerySchema = rangeFields
  .extend({ interval: z.enum(["DAY", "WEEK"], { error: VALIDATION_MESSAGES.invalid }).optional() })
  .superRefine(customRange);

/** A period's rows, a page at a time: Guest sales (plan §139.11.3). */
export const pagedRangeQuerySchema = rangeFields.extend({ cursor: cursorParam }).superRefine(customRange);

export type RangeQuery = z.output<typeof rangeQuerySchema>;
export type PagedRangeQuery = z.output<typeof pagedRangeQuerySchema>;
