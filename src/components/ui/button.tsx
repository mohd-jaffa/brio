"use client";

import Link from "next/link";
import { Loader2, type LucideIcon } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "./cn";

/**
 * Every button in the app. Each screen used to restate the same dozen
 * utilities for its primary action, and they had drifted — different padding,
 * different pressed state, some without a 44px touch target. One declaration
 * here means one look, and accessibility that cannot be forgotten (AGENTS.md §21).
 */
export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "action";
export type ButtonSize = "md" | "sm" | "lg";
export type ButtonShape = "rounded" | "pill";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-text hover:bg-primary-hover shadow-md",
  secondary: "bg-primary/10 text-primary-strong hover:bg-primary/20",
  ghost: "bg-surface border border-border text-text-muted hover:text-text hover:bg-surface-hover",
  danger: "bg-danger-bg text-danger border border-danger/20 hover:bg-danger/10",
  // The one dark control on the authentication screens (plan §137).
  action: "bg-action text-action-text hover:bg-action-hover shadow-elevated",
};

const SIZES: Record<ButtonSize, string> = {
  md: "px-4 py-2.5 text-sm",
  sm: "px-3 py-2 text-xs",
  lg: "px-6 py-4 text-base",
};

const SHAPES: Record<ButtonShape, string> = {
  rounded: "rounded-xl",
  pill: "rounded-full",
};

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> {
  label?: string;
  children?: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  shape?: ButtonShape;
  icon?: LucideIcon;
  /** Puts the icon after the label, the way a "go on" action reads. */
  iconPosition?: "start" | "end";
  /** Shows a spinner and refuses further presses. */
  loading?: boolean;
  fullWidth?: boolean;
}

export function Button({
  label,
  children,
  variant = "primary",
  size = "md",
  shape = "rounded",
  icon: Icon,
  iconPosition = "start",
  loading = false,
  fullWidth = false,
  disabled,
  type = "button",
  onClick,
  ...rest
}: ButtonProps) {
  const mark = loading ? (
    <Loader2 size={18} className="animate-spin" aria-hidden="true" />
  ) : (
    Icon && <Icon size={18} strokeWidth={2.5} aria-hidden="true" />
  );

  return (
    <button
      type={type}
      disabled={disabled}
      // Busy is not disabled: a disabled button drops focus, so the response
      // card that follows would have nothing to give it back to (R1.10). It
      // stays focusable, says it is busy, and ignores a press — a submit
      // included — until the work is done.
      aria-disabled={loading || undefined}
      aria-busy={loading || undefined}
      onClick={(event) => {
        if (loading) {
          event.preventDefault();
          return;
        }
        onClick?.(event);
      }}
      className={cn(
        "touch-target inline-flex items-center justify-center gap-2 font-bold transition",
        "active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none",
        "aria-disabled:cursor-progress aria-disabled:opacity-70",
        VARIANTS[variant],
        SIZES[size],
        SHAPES[shape],
        fullWidth && "w-full",
      )}
      {...rest}
    >
      {iconPosition === "start" && mark}
      {children ?? label}
      {iconPosition === "end" && mark}
    </button>
  );
}

/**
 * A link that looks like a button — "Create Order", "Add Your First Customer",
 * or Call and WhatsApp on an order. It stays an anchor, so it can be opened in
 * a new tab and read as a link. A place in the app goes through the router;
 * anything else — `tel:`, a chat, a map — is a plain anchor, and `newTab`
 * opens it beside the app without handing it the app's window.
 */
export function LinkButton({
  href,
  label,
  accessibleName,
  newTab = false,
  variant = "primary",
  size = "md",
  shape = "rounded",
  fullWidth = false,
  icon: Icon,
}: {
  href: string;
  label: string;
  /** A fuller name for a screen reader, which must begin with `label`: "Call Meena Gupta". */
  accessibleName?: string;
  newTab?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
  shape?: ButtonShape;
  fullWidth?: boolean;
  icon?: LucideIcon;
}) {
  const props = {
    href,
    "aria-label": accessibleName,
    className: cn(
      "touch-target inline-flex items-center justify-center gap-2 font-bold transition active:scale-[0.98]",
      VARIANTS[variant],
      SIZES[size],
      SHAPES[shape],
      fullWidth && "w-full",
    ),
    ...(newTab && { target: "_blank", rel: "noopener noreferrer" }),
  };
  const body = (
    <>
      {Icon && <Icon size={18} strokeWidth={2.5} aria-hidden="true" />}
      {label}
    </>
  );
  return href.startsWith("/") ? <Link {...props}>{body}</Link> : <a {...props}>{body}</a>;
}

/** A square, label-less action beside a row — edit, open, remove. */
export function IconButton({
  icon: Icon,
  label,
  onClick,
  tone = "ghost",
}: {
  icon: LucideIcon;
  /** Never optional: the icon alone says nothing to a screen reader. */
  label: string;
  onClick: () => void;
  tone?: "ghost" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "touch-target flex items-center justify-center rounded-full border transition active:scale-95",
        tone === "danger"
          ? "border-danger/20 bg-danger-bg text-danger hover:bg-danger/10"
          : "border-border bg-background text-text-muted hover:bg-surface-hover hover:text-text",
      )}
    >
      <Icon size={16} strokeWidth={2.5} aria-hidden="true" />
    </button>
  );
}
