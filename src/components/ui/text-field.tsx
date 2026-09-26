"use client";

import { forwardRef, useId } from "react";
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

import { UI_TEXT } from "@/constants/messages";

import { cn } from "./cn";
import { FieldError } from "./field-error";

/**
 * The form controls, as one set. Every sheet in the app used to repeat the
 * same label, the same input classes and the same error paragraph — and they
 * had drifted: some labels were not tied to their input, and no error was
 * announced. Here the label, the control and its message are wired together
 * once, and react-hook-form's `register()` spreads straight onto them.
 */
const CONTROL_CLASSES =
  "w-full rounded-xl border border-border bg-sunken px-4 py-3 text-sm font-medium outline-none transition " +
  "placeholder:text-text-muted focus:border-primary focus:ring-1 focus:ring-primary " +
  "aria-[invalid=true]:border-danger aria-[invalid=true]:focus:ring-danger";

/**
 * Labels are sentence case, as the references set them everywhere (plan
 * §139.5): the small capitals the app used before are gone.
 */
const LABEL_CLASSES = "mb-2 block text-sm font-medium text-text";

interface FieldShell {
  label: string;
  error?: string;
  /** Marks the field required, both visually and to assistive technology. */
  required?: boolean;
  /** Says "(Optional)" after the label, as the references do. */
  optional?: boolean;
  hint?: string;
}

/** A hint is read with its field; an error takes its place, on screen and when read. */
function useFieldIds(error?: string, hint?: string) {
  const id = useId();
  return {
    id,
    errorId: error ? `${id}-error` : undefined,
    hintId: hint && !error ? `${id}-hint` : undefined,
  };
}

function FieldHint({ id, hint }: { id?: string; hint?: string }) {
  return id ? (
    <p id={id} className="mt-1.5 text-xs text-text-muted">
      {hint}
    </p>
  ) : null;
}

function Label({
  htmlFor,
  label,
  required,
  optional,
}: {
  htmlFor: string;
  label: string;
  required?: boolean;
  optional?: boolean;
}) {
  return (
    <label htmlFor={htmlFor} className={LABEL_CLASSES}>
      {label}
      {required && (
        <span className="text-danger" aria-hidden="true">
          {" *"}
        </span>
      )}
      {optional && <span className="font-normal text-text-muted">{` ${UI_TEXT.fields.optional}`}</span>}
    </label>
  );
}

export const TextField = forwardRef<
  HTMLInputElement,
  FieldShell & {
    /** A control that sits inside the field — the reveal button on a password. */
    trailing?: ReactNode;
    /** A mark that sits inside the field before the text — an icon naming the field. */
    leading?: ReactNode;
    /** Fixed text before what is typed — "+91" on a mobile number. Read out with the field. */
    prefix?: string;
  } & Omit<InputHTMLAttributes<HTMLInputElement>, "className" | "id" | "prefix">
>(function TextField({ label, error, required, optional, hint, trailing, leading, prefix, ...rest }, ref) {
  const { id, errorId, hintId } = useFieldIds(error, hint);
  const prefixId = prefix ? `${id}-prefix` : undefined;
  const describedBy = [prefixId, hintId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div>
      <Label htmlFor={id} label={label} required={required} optional={optional} />
      <div className="relative">
        {leading && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-text-muted"
          >
            {leading}
          </span>
        )}
        {prefix && (
          <span
            id={prefixId}
            className={cn(
              "pointer-events-none absolute inset-y-2 flex items-center border-r border-border pr-3 text-sm font-medium text-text",
              leading ? "left-12" : "left-4",
            )}
          >
            {prefix}
          </span>
        )}
        <input
          id={id}
          ref={ref}
          aria-required={required || undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            CONTROL_CLASSES,
            Boolean(leading) && "pl-12",
            Boolean(prefix) && (leading ? "pl-[5.75rem]" : "pl-16"),
            Boolean(trailing) && "pr-12",
          )}
          {...rest}
        />
        {trailing && (
          <span className="absolute inset-y-0 right-1.5 flex items-center">{trailing}</span>
        )}
      </div>
      <FieldHint id={hintId} hint={hint} />
      <FieldError id={errorId} message={error} />
    </div>
  );
});

export const TextAreaField = forwardRef<
  HTMLTextAreaElement,
  FieldShell & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className" | "id">
>(function TextAreaField({ label, error, required, optional, hint, rows = 3, ...rest }, ref) {
  const { id, errorId, hintId } = useFieldIds(error, hint);
  return (
    <div>
      <Label htmlFor={id} label={label} required={required} optional={optional} />
      <textarea
        id={id}
        ref={ref}
        rows={rows}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={hintId ?? errorId}
        className={cn(CONTROL_CLASSES, "min-h-20")}
        {...rest}
      />
      <FieldHint id={hintId} hint={hint} />
      <FieldError id={errorId} message={error} />
    </div>
  );
});

export interface SelectOption {
  value: string;
  label: string;
}

export const SelectField = forwardRef<
  HTMLSelectElement,
  FieldShell & { options: readonly SelectOption[]; placeholder?: string } & Omit<
      SelectHTMLAttributes<HTMLSelectElement>,
      "className" | "id"
    >
>(function SelectField({ label, error, required, optional, hint, options, placeholder, ...rest }, ref) {
  const { id, errorId, hintId } = useFieldIds(error, hint);
  return (
    <div>
      <Label htmlFor={id} label={label} required={required} optional={optional} />
      <select
        id={id}
        ref={ref}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={hintId ?? errorId}
        className={CONTROL_CLASSES}
        {...rest}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <FieldHint id={hintId} hint={hint} />
      <FieldError id={errorId} message={error} />
    </div>
  );
});

/** Options built from one of the constant lists and its label map (src/constants/statuses.ts). */
export function optionsFrom<T extends string>(
  values: readonly T[],
  labels: Record<T, string>,
): SelectOption[] {
  return values.map((value) => ({ value, label: labels[value] }));
}

/** Options for a list that has no separate label map — the value is the label. */
export function optionsOf(values: readonly string[]): SelectOption[] {
  return values.map((value) => ({ value, label: value }));
}
