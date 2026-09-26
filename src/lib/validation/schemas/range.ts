import { z } from "zod";

import { VALIDATION_MESSAGES } from "@/constants/messages";
import { DATE_RANGES, DEFAULT_DATE_RANGE } from "@/constants/ranges";

/** How long a custom period may be: a year and a day, so a whole year fits. */
export const MAX_RANGE_DAYS = 366;

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: VALIDATION_MESSAGES.invalid });

const DAY_MS = 86_400_000;

/**
 * The period a report reads over (plan §139.11.11): a preset, or Custom with
 * its two dates — both of them, the first not after the second, and no more
 * than a year apart — and how its trend is grouped.
 */
export const rangeQuerySchema = z
  .object({
    range: z.enum(DATE_RANGES, { error: VALIDATION_MESSAGES.invalid }).default(DEFAULT_DATE_RANGE),
    from: day.optional(),
    to: day.optional(),
    interval: z.enum(["DAY", "WEEK"], { error: VALIDATION_MESSAGES.invalid }).optional(),
  })
  .superRefine((query, ctx) => {
    if (query.range !== "CUSTOM") return;
    if (!query.from || !query.to) {
      ctx.addIssue({ code: "custom", path: [query.from ? "to" : "from"], message: VALIDATION_MESSAGES.invalid });
      return;
    }
    const span = (Date.parse(query.to) - Date.parse(query.from)) / DAY_MS + 1;
    if (!(span >= 1 && span <= MAX_RANGE_DAYS)) {
      ctx.addIssue({ code: "custom", path: ["to"], message: VALIDATION_MESSAGES.invalid });
    }
  });

export type RangeQuery = z.output<typeof rangeQuerySchema>;
