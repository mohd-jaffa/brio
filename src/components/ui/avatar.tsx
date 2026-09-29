import { CHART_COLORS } from "./charts/units";
import { cn } from "./cn";

const SIZES = {
  sm: "size-9 text-xs",
  md: "size-11 text-sm",
  lg: "size-16 text-lg",
} as const;

const graphemes = new Intl.Segmenter(undefined, { granularity: "grapheme" });
const firstGrapheme = (word: string) => graphemes.segment(word)[Symbol.iterator]().next().value?.segment ?? "";

/**
 * Up to two initials: the first letters of the first and last words, so
 * "Priya Menon" is "PM" and "Asha" is "A". Whole letters, not code units, so
 * a name written in Devanagari or with an emoji keeps its first character.
 */
export function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  const picked = words.length === 1 ? [words[0]] : [words[0], words[words.length - 1]];
  return picked.map(firstGrapheme).join("").toLocaleUpperCase();
}

/** The same name always lands on the same tint (FNV-1a over its letters). */
export function tintIndex(name: string, tints = CHART_COLORS.length) {
  let hash = 0x811c9dc5;
  for (const char of name.trim().toLowerCase()) {
    hash ^= char.codePointAt(0)!;
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) % tints;
}

/**
 * A person as their initials on a tint picked from their name, within the
 * theme's chart palette (plan §139.5). The tint is the palette colour at 20 %
 * over the surface and the letters are 40 % of it into the text colour: the
 * lightest pair measures 5.38 : 1. Decorative, since the name is always
 * written beside it.
 */
export function Avatar({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const colour = CHART_COLORS[tintIndex(name)];
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold",
        SIZES[size],
        className,
      )}
      style={{
        background: `color-mix(in oklab, ${colour} 20%, var(--color-surface))`,
        color: `color-mix(in oklab, ${colour} 40%, var(--color-text))`,
      }}
    >
      {initials(name)}
    </span>
  );
}
