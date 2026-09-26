import * as z from "zod";

import { ILLUSTRATION_KEYS } from "@/constants/illustrations";
import { MAX_AMOUNT_PAISE, MAX_QUANTITY } from "@/constants/limits";
import { VALIDATION_MESSAGES } from "@/constants/messages";
import { formatPaise } from "@/lib/format/currency";
import { parseRupees } from "@/lib/money";
import { toE164India } from "@/lib/phone";
import { normaliseLine, normaliseLines } from "@/lib/text/normalise";

/**
 * The building blocks the entity schemas in ./schemas are made of. Every
 * message comes from VALIDATION_MESSAGES (src/constants/messages.ts) and names
 * its field, so a baker sees one wording whichever side catches the mistake.
 *
 * Client validation is for the person filling the form. The server parses the
 * same schema again, and the database's CHECK constraints are what actually
 * protect the data (AGENTS.md §22).
 */

/**
 * The last word on wording: a check that names no message of its own gets the
 * catalogue's, never Zod's English ("Too big: expected string to have <=100
 * characters" reached the screen — BUG-11). Every field should still say what
 * is wrong with it; this is the floor, not the fix. It is set here because
 * every schema is built from these primitives, so it is in force wherever one
 * is parsed.
 */
z.config({ customError: () => VALIDATION_MESSAGES.invalid });

// A shape check, not a delivery check: something@something.something.
export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * A field that may be left out or left blank, stored as NULL. Missing, blank
 * and null are the same thing to a form, so they are the same thing here —
 * which also lets what one of these schemas produced be parsed by it again,
 * as it is when the client posts it and the server checks it (AGENTS.md §22).
 * `tidy` is how the text is normalised first; a plain trim by default.
 */
function optionalString(
  label: string,
  max: number,
  check?: { test: (value: string) => boolean; message: string },
  tidy: (text: string) => string = (text) => text.trim(),
) {
  return z.optional(z.union([z.string(), z.null()])).transform((text, ctx) => {
    const value = tidy(text ?? "");
    if (value === "") return null;
    if (value.length > max) {
      ctx.addIssue({ code: "custom", message: VALIDATION_MESSAGES.tooLong(label, max) });
      return z.NEVER;
    }
    if (check && !check.test(value)) {
      ctx.addIssue({ code: "custom", message: check.message });
      return z.NEVER;
    }
    return value;
  });
}

/**
 * Text a form must have, normalised by `tidy` and then bounded, each problem in
 * the field's own words. A blank field is missing, not too short.
 */
function requiredString(label: string, min: number, max: number, tidy: (text: string) => string) {
  return z.string({ error: VALIDATION_MESSAGES.required(label) }).transform((text, ctx) => {
    const value = tidy(text);
    const problem =
      value === ""
        ? VALIDATION_MESSAGES.required(label)
        : value.length < min
          ? VALIDATION_MESSAGES.tooShort(label, min)
          : value.length > max
            ? VALIDATION_MESSAGES.tooLong(label, max)
            : null;
    if (problem) {
      ctx.addIssue({ code: "custom", message: problem });
      return z.NEVER;
    }
    return value;
  });
}

/** One line a form must have — a name, a business name, a city (plan §139.7). */
export function requiredLine(label: string, { min = 1, max }: { min?: number; max: number }) {
  return requiredString(label, min, max, normaliseLine);
}

/** One line that may be left empty — a reference, an item note; blank is null. */
export function optionalLine(label: string, max: number) {
  return optionalString(label, max, undefined, normaliseLine);
}

/** Several lines a form must have — a business address. */
export function requiredLines(label: string, { min = 1, max }: { min?: number; max: number }) {
  return requiredString(label, min, max, normaliseLines);
}

/** Several lines that may be left empty — an address, notes; blank is null. */
export function optionalLines(label: string, max: number) {
  return optionalString(label, max, undefined, normaliseLines);
}

/** An email address that may be left empty; blank is null. */
export function optionalEmail(label: string, max = 254) {
  return optionalString(label, max, {
    test: (value) => EMAIL.test(value),
    message: VALIDATION_MESSAGES.email(label),
  });
}

/**
 * A mobile number, stored in one shape whichever way it was typed (plan §7).
 * The country code is added here: a baker types the ten digits they think of
 * as their number, and the account it has to match is keyed on +91 and those
 * digits — so anything that skips this cannot find the account at all.
 */
export function indianMobile(label = "Mobile number") {
  return z
    .string()
    .trim()
    .min(1, VALIDATION_MESSAGES.required(label))
    .transform((typed, ctx) => {
      const e164 = toE164India(typed);
      if (e164 === null) {
        ctx.addIssue({ code: "custom", message: VALIDATION_MESSAGES.phone });
        return z.NEVER;
      }
      return e164;
    });
}

/** An email address a form must have — trimmed and lower-cased, so it matches
 * the citext column it is stored in whatever way it was typed. */
export function requiredEmail(label: string, max = 254) {
  return z
    .string()
    .trim()
    .min(1, VALIDATION_MESSAGES.required(label))
    .max(max, VALIDATION_MESSAGES.tooLong(label, max))
    .refine((value) => EMAIL.test(value), VALIDATION_MESSAGES.email(label))
    .transform((value) => value.toLowerCase());
}

/**
 * A web link that may be left empty — a map pin, a receipt; blank is null.
 * Only `http:` and `https:`: `URL.canParse` also accepts `javascript:` and
 * `data:`, and a link like that would travel onto a shared bill, where nothing
 * stops it running (BUG-13).
 */
export function optionalUrl(label: string, max = 1000) {
  return optionalString(label, max, {
    test: isWebLink,
    message: VALIDATION_MESSAGES.url(label),
  });
}

function isWebLink(value: string): boolean {
  if (!URL.canParse(value)) return false;
  const { protocol } = new URL(value);
  return protocol === "https:" || protocol === "http:";
}

/**
 * An illustration from the library, or null for the default (plan
 * §139.11.10). Only keys the library has are accepted; the database checks
 * the shape alone, so a new illustration needs no migration.
 */
export function optionalIllustration(label: string) {
  return z.enum(ILLUSTRATION_KEYS, { error: VALIDATION_MESSAGES.chooseOne(label) }).nullable().optional();
}

/** An amount typed into a text field ("499.50"), parsed to whole paise. */
export function amountText(label: string) {
  // One problem at a time: a blank field is missing, not also malformed.
  return z
    .string()
    .trim()
    .transform((text, ctx) => {
      if (text === "") {
        ctx.addIssue({ code: "custom", message: VALIDATION_MESSAGES.required(label) });
        return z.NEVER;
      }
      if (!/^\d+(\.\d{1,2})?$/.test(text)) {
        ctx.addIssue({ code: "custom", message: VALIDATION_MESSAGES.amount(label) });
        return z.NEVER;
      }
      return Number(text);
    });
}

/**
 * An amount typed in rupees ("499.50", "₹1,500"), stored as whole paise. The
 * digits are read as written rather than multiplied as a float, so nothing is
 * ever a paisa out (AGENTS.md §13), and it is bounded so it fits its column
 * (BUG-12). This is what every money field in a form uses.
 */
export function paiseText(label: string, max = MAX_AMOUNT_PAISE) {
  return z
    .string({ error: VALIDATION_MESSAGES.required(label) })
    .trim()
    .transform((text, ctx) => {
      // Straight from the digits: never through a float.
      const paise = text === "" ? null : parseRupees(text);
      const problem =
        text === ""
          ? VALIDATION_MESSAGES.required(label)
          : paise === null
            ? VALIDATION_MESSAGES.amount(label)
            : paise > max
              ? VALIDATION_MESSAGES.tooLarge(label, formatPaise(max))
              : null;
      if (problem || paise === null) {
        ctx.addIssue({ code: "custom", message: problem ?? VALIDATION_MESSAGES.amount(label) });
        return z.NEVER;
      }
      return paise;
    });
}

/**
 * An amount that has already been parsed to whole paise — what a route
 * receives. Bounded like the field it came from (BUG-12).
 */
export function paiseAmount(label: string, { allowZero = false, max = MAX_AMOUNT_PAISE } = {}) {
  const amount = z
    .number({ error: VALIDATION_MESSAGES.amount(label) })
    .int(VALIDATION_MESSAGES.wholeNumber(label))
    .max(max, VALIDATION_MESSAGES.tooLarge(label, formatPaise(max)));
  return allowZero
    ? amount.min(0, VALIDATION_MESSAGES.notNegative(label))
    : amount.positive(VALIDATION_MESSAGES.moreThanZero(label));
}

/**
 * How many of a thing an order line is for: a whole number from 1 to 9,999.
 * An emptied number field arrives as NaN, and says so in words (BUG-11).
 */
export function quantity(label = "Quantity") {
  return z
    .number({
      error: (issue) =>
        issue.input === undefined || Number.isNaN(issue.input)
          ? VALIDATION_MESSAGES.required(label)
          : VALIDATION_MESSAGES.wholeNumber(label),
    })
    .int(VALIDATION_MESSAGES.wholeNumber(label))
    .min(1, VALIDATION_MESSAGES.moreThanZero(label))
    .max(MAX_QUANTITY, VALIDATION_MESSAGES.tooLarge(label, MAX_QUANTITY.toLocaleString("en-IN")));
}

/** A number that may be left empty ("2.5" kg); blank is null. */
export function optionalNumberText(label: string) {
  return z
    .string()
    .trim()
    .transform((text, ctx) => {
      if (text === "") return null;
      if (!/^-?\d+(\.\d+)?$/.test(text)) {
        ctx.addIssue({ code: "custom", message: VALIDATION_MESSAGES.number(label) });
        return z.NEVER;
      }
      return Number(text);
    });
}

/**
 * A whole number typed into a text field ("12", "1,500"), parsed to a number
 * and bounded either way by `max`, so it fits its column (BUG-12).
 */
export function wholeNumberText(label: string, max = MAX_QUANTITY) {
  return z
    .string({ error: VALIDATION_MESSAGES.required(label) })
    .trim()
    .transform((text, ctx) => {
      const digits = text.replace(/[\s,]/g, "");
      const problem =
        digits === ""
          ? VALIDATION_MESSAGES.required(label)
          : !/^-?\d+$/.test(digits)
            ? VALIDATION_MESSAGES.wholeNumber(label)
            : Math.abs(Number(digits)) > max
              ? VALIDATION_MESSAGES.tooLarge(label, max.toLocaleString("en-IN"))
              : null;
      if (problem) {
        ctx.addIssue({ code: "custom", message: problem });
        return z.NEVER;
      }
      return Number(digits);
    });
}

/** A whole number above 0 that must be given ("3" boxes). */
export function positiveWholeText(label: string, max = MAX_QUANTITY) {
  return wholeNumberText(label, max).pipe(
    z.number().refine((value) => value > 0, VALIDATION_MESSAGES.moreThanZero(label)),
  );
}

/** The first message from a failed parse — what a single field shows. */
export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? VALIDATION_MESSAGES.invalid;
}
