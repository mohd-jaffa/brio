import { z } from "zod";

import { VALIDATION_MESSAGES } from "@/constants/messages";
import { rupeesToPaise } from "@/lib/money";

/**
 * The building blocks the entity schemas in ./schemas are made of. Every
 * message comes from VALIDATION_MESSAGES (src/constants/messages.ts) and names
 * its field, so a baker sees one wording whichever side catches the mistake.
 *
 * Client validation is for the person filling the form. The server parses the
 * same schema again, and the database's CHECK constraints are what actually
 * protect the data (AGENTS.md §22).
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// A shape check, not a delivery check: something@something.something.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * A field that may be left out or left blank, stored as NULL. Missing, blank
 * and null are the same thing to a form, so they are the same thing here —
 * which also lets what one of these schemas produced be parsed by it again,
 * as it is when the client posts it and the server checks it (AGENTS.md §22).
 */
function optionalString(
  label: string,
  max: number,
  check?: { test: (value: string) => boolean; message: string },
) {
  return z.optional(z.union([z.string(), z.null()])).transform((text, ctx) => {
    const value = (text ?? "").trim();
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

/** Free text that may be left empty: trimmed, and blank stored as null. */
export function optionalText(max = 1000, label = "This field") {
  return optionalString(label, max);
}

/** An email address that may be left empty; blank is null. */
export function optionalEmail(label: string, max = 254) {
  return optionalString(label, max, {
    test: (value) => EMAIL.test(value),
    message: VALIDATION_MESSAGES.email(label),
  });
}

/** A link that may be left empty — a Google Maps pin, a receipt; blank is null. */
export function optionalUrl(label: string, max = 1000) {
  return optionalString(label, max, {
    test: (value) => URL.canParse(value),
    message: VALIDATION_MESSAGES.url(label),
  });
}

/** A reference to another record that may be left unset; blank is null. */
export function optionalUuid(label: string) {
  return optionalString(label, 36, {
    test: (value) => UUID.test(value),
    message: VALIDATION_MESSAGES.invalid,
  });
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
 * An amount typed in rupees ("499.50"), stored as whole paise. The digits are
 * read as written rather than multiplied as a float, so nothing is ever a
 * paisa out (AGENTS.md §13). This is what every money field in a form uses.
 */
export function paiseText(label: string) {
  return z
    .string()
    .trim()
    .transform((text, ctx) => {
      const problem =
        text === ""
          ? VALIDATION_MESSAGES.required(label)
          : !/^\d+(\.\d{1,2})?$/.test(text)
            ? VALIDATION_MESSAGES.amount(label)
            : null;
      if (problem) {
        ctx.addIssue({ code: "custom", message: problem });
        return z.NEVER;
      }
      // Straight from the digits: never through a float.
      return rupeesToPaise(text);
    });
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

/** A whole number typed into a text field ("12"), parsed to a number. */
export function wholeNumberText(label: string) {
  return z
    .string()
    .trim()
    .transform((text, ctx) => {
      const problem =
        text === ""
          ? VALIDATION_MESSAGES.required(label)
          : !/^-?\d+$/.test(text)
            ? VALIDATION_MESSAGES.wholeNumber(label)
            : null;
      if (problem) {
        ctx.addIssue({ code: "custom", message: problem });
        return z.NEVER;
      }
      return Number(text);
    });
}

/** A whole number above 0 that must be given ("3" boxes). */
export function positiveWholeText(label: string) {
  return wholeNumberText(label).pipe(
    z.number().refine((value) => value > 0, VALIDATION_MESSAGES.moreThanZero(label)),
  );
}

/** The first message from a failed parse — what a single field shows. */
export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? VALIDATION_MESSAGES.invalid;
}
