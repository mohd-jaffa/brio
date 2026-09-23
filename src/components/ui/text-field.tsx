"use client";

import { forwardRef, useId } from "react";
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

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
  "w-full rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium outline-none transition-all " +
  "placeholder:text-text-muted/50 focus:border-primary focus:ring-1 focus:ring-primary " +
  "aria-[invalid=true]:border-danger aria-[invalid=true]:focus:ring-danger";

const LABEL_CLASSES = "mb-1.5 block text-xs font-bold uppercase tracking-wider text-text-muted";

interface FieldShell {
  label: string;
  error?: string;
  /** Marks the field required, both visually and to assistive technology. */
  required?: boolean;
  hint?: string;
}

function useFieldIds(error?: string) {
  const id = useId();
  return { id, errorId: error ? `${id}-error` : undefined };
}

function Label({ htmlFor, label, required }: { htmlFor: string; label: string; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className={LABEL_CLASSES}>
      {label}
      {required && (
        <span className="text-danger" aria-hidden="true">
          {" *"}
        </span>
      )}
    </label>
  );
}

export const TextField = forwardRef<
  HTMLInputElement,
  FieldShell & {
    /** A control that sits inside the field — the reveal button on a password. */
    trailing?: ReactNode;
  } & Omit<InputHTMLAttributes<HTMLInputElement>, "className" | "id">
>(function TextField({ label, error, required, hint, trailing, ...rest }, ref) {
  const { id, errorId } = useFieldIds(error);
  return (
    <div>
      <Label htmlFor={id} label={label} required={required} />
      <div className="relative">
        <input
          id={id}
          ref={ref}
          aria-required={required || undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          className={cn(CONTROL_CLASSES, Boolean(trailing) && "pr-12")}
          {...rest}
        />
        {trailing && (
          <span className="absolute inset-y-0 right-1.5 flex items-center">{trailing}</span>
        )}
      </div>
      {hint && !error && <p className="mt-1.5 text-xs text-text-muted">{hint}</p>}
      <FieldError id={errorId} message={error} />
    </div>
  );
});

export const TextAreaField = forwardRef<
  HTMLTextAreaElement,
  FieldShell & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className" | "id">
>(function TextAreaField({ label, error, required, hint, rows = 3, ...rest }, ref) {
  const { id, errorId } = useFieldIds(error);
  return (
    <div>
      <Label htmlFor={id} label={label} required={required} />
      <textarea
        id={id}
        ref={ref}
        rows={rows}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        className={cn(CONTROL_CLASSES, "min-h-20")}
        {...rest}
      />
      {hint && !error && <p className="mt-1.5 text-xs text-text-muted">{hint}</p>}
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
>(function SelectField({ label, error, required, hint, options, placeholder, ...rest }, ref) {
  const { id, errorId } = useFieldIds(error);
  return (
    <div>
      <Label htmlFor={id} label={label} required={required} />
      <select
        id={id}
        ref={ref}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
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
      {hint && !error && <p className="mt-1.5 text-xs text-text-muted">{hint}</p>}
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
