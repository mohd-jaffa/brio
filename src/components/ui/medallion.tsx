import type { LucideIcon } from "lucide-react";

import { cn } from "./cn";

export type MedallionTone = "primary" | "neutral" | "success" | "warning" | "danger";

const TONES: Record<MedallionTone, string> = {
  primary: "bg-primary-soft text-primary",
  neutral: "bg-sunken text-text-muted",
  success: "bg-success-bg text-success",
  warning: "bg-warning-bg text-warning",
  danger: "bg-danger-bg text-danger",
};

const SIZES = {
  sm: { box: "size-9", icon: 18 },
  md: { box: "size-11", icon: 22 },
  lg: { box: "size-14", icon: 28 },
} as const;

/**
 * An icon set in a tinted circle, as the references draw them on stat tiles,
 * rows and the response card (plan §139.4: lucide at a 1.75 stroke).
 * Decorative: whatever it sits beside says what it means.
 */
export function Medallion({
  icon: Icon,
  tone = "primary",
  size = "md",
  className,
}: {
  icon: LucideIcon;
  tone?: MedallionTone;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full",
        TONES[tone],
        SIZES[size].box,
        className,
      )}
    >
      <Icon size={SIZES[size].icon} strokeWidth={1.75} />
    </span>
  );
}
