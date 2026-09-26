import type { Theme } from "@/lib/theme/themes";

/**
 * The bill's colours for the image and the PDF, which cannot read the page's
 * CSS: the paper and ink both themes share, and each theme's primary for the
 * header rule and the total. The same values as the tokens in globals.css —
 * `--color-paper`, `--color-ink`, `--color-ink-muted`, `--color-paper-rule`
 * and `--color-primary` — and its test fails if they part.
 */
export const BILL_PAPER = {
  paper: "#ffffff",
  ink: "#231a15",
  muted: "#5f534b",
  rule: "#e6ded6",
} as const;

export const BILL_ACCENT: Record<Theme, string> = {
  golden: "#7a4a25",
  peach: "#a94a26",
};

export type BillColor = keyof typeof BILL_PAPER | "accent";

export function billColor(color: BillColor, theme: Theme): string {
  return color === "accent" ? BILL_ACCENT[theme] : BILL_PAPER[color];
}
