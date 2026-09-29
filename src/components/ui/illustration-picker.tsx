"use client";

import {
  ILLUSTRATION_GROUP_LABELS,
  ILLUSTRATION_GROUPS,
  ILLUSTRATIONS,
  illustrationOr,
  type IllustrationKey,
} from "@/constants/illustrations";
import { UI_TEXT } from "@/constants/messages";
import { useSheetChoice } from "@/hooks/useSheetChoice";

import { cn } from "./cn";
import { Illustration } from "./illustration";
import { Sheet } from "./sheet";

// In the order they are drawn: group by group, as the arrow keys walk them.
const KEYS = ILLUSTRATION_GROUPS.flatMap((group) =>
  (Object.keys(ILLUSTRATIONS) as IllustrationKey[]).filter((key) => ILLUSTRATIONS[key].group === group),
);

/**
 * The illustration library to choose from (plan §139.11.10): for a product,
 * and for an expense category. The groups come in the library's order, the
 * defaults first; each picture is a choice named by its label ("Rose
 * bouquet"), and the one in use is marked. A bottom sheet on a phone and a
 * dialog from 768 px; choosing closes it. The keyboard enters at the picture
 * in use and walks the library with the arrow keys, choosing with Enter
 * (`useSheetChoice`). Nothing is uploaded — only the key is kept.
 */
export function IllustrationPicker({
  open,
  onClose,
  value,
  fallback,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  /** The key in use; none, or one the library no longer has, means `fallback`. */
  value: string | null | undefined;
  fallback: IllustrationKey;
  onPick: (key: IllustrationKey) => void;
}) {
  const text = UI_TEXT.illustrationPicker;
  const current = illustrationOr(value, fallback);
  const choice = useSheetChoice(KEYS, current, open);

  return (
    <Sheet open={open} onClose={onClose} title={text.title}>
      <div role="radiogroup" aria-label={text.title} onKeyDown={choice.onKeyDown} className="space-y-5 pb-2">
        {ILLUSTRATION_GROUPS.map((group) => (
          <section key={group} aria-label={ILLUSTRATION_GROUP_LABELS[group]} className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              {ILLUSTRATION_GROUP_LABELS[group]}
            </h3>
            <ul role="list" className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {KEYS.filter((key) => ILLUSTRATIONS[key].group === group).map((key) => {
                const checked = choice.checked(key);
                return (
                  <li key={key}>
                    <button
                      ref={choice.register(key)}
                      type="button"
                      role="radio"
                      aria-checked={checked}
                      tabIndex={choice.tabIndex(key)}
                      onClick={() => {
                        onPick(key);
                        onClose();
                      }}
                      className={cn(
                        "flex aspect-square w-full items-center justify-center rounded-2xl bg-sunken p-2 transition-colors hover:bg-surface-hover",
                        checked && "ring-2 ring-primary ring-offset-2 ring-offset-surface",
                      )}
                    >
                      <Illustration name={key} fallback={fallback} size={64} labelled className="size-full" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </Sheet>
  );
}
