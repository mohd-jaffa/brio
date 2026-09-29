"use client";

import { Check, Loader2 } from "lucide-react";
import { useState } from "react";

import { cn } from "@/components/ui/cn";
import { ProfileAvatar } from "@/components/ui/profile-avatar";
import { useResponse } from "@/components/ui/response-card";
import { Sheet } from "@/components/ui/sheet";
import { AVATAR_GROUP_LABELS, AVATAR_GROUPS, AVATAR_KEYS, AVATARS, avatarOr, type AvatarKey } from "@/constants/avatars";
import { UI_TEXT } from "@/constants/messages";
import { useSheetChoice } from "@/hooks/useSheetChoice";
import { useApiMutation } from "@/lib/query/useApiMutation";
import type { ChangeAvatarPayload } from "@/lib/validation";

import { AuthClient } from "../api.client";
import { useAuth } from "../AuthProvider";
import type { AuthProfile } from "../types";

const text = UI_TEXT.settings;

// In the order they are drawn: group by group, as the arrow keys walk them.
const ORDER = AVATAR_GROUPS.flatMap((group) => AVATAR_KEYS.filter((key) => AVATARS[key].group === group));

/**
 * The owner's profile picture, chosen from those that ship with the app — the
 * animals (the user, 2026-09-27) and the people (2026-09-28), each group under
 * its heading — opened by tapping the picture on Settings. Each is a choice
 * named by what it shows, and the one in use is marked. Tapping another
 * saves it there and then: the sheet closes on a response card, or stays open
 * on a failure's. Tapping the one in use just closes it. The keyboard enters
 * at the one in use and walks them with the arrow keys, saving with Enter
 * (`useSheetChoice`). A bottom sheet on a phone and a dialog from 768 px.
 */
export function AvatarSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { profile, reload } = useAuth();
  const respond = useResponse();
  const [saving, setSaving] = useState<AvatarKey | null>(null);
  const { submit, submitting } = useApiMutation<ChangeAvatarPayload, AuthProfile>(AuthClient.changeAvatar, {
    onSuccess: async () => {
      await reload();
      onClose();
      respond.success({ title: UI_TEXT.outcomes.pictureChanged });
    },
    onError: (failure) =>
      respond.failure(failure, { title: UI_TEXT.outcomes.pictureNotChanged, fallback: "SAVE_FAILED" }),
  });

  const current = avatarOr(profile?.avatar);
  const choice = useSheetChoice(ORDER, current, open);
  const pick = (key: AvatarKey) => {
    if (submitting) return;
    if (key === current) {
      onClose();
      return;
    }
    setSaving(key);
    void submit({ avatar: key });
  };

  return (
    <Sheet open={open} onClose={onClose} title={text.pictureTitle}>
      <p className="-mt-1 mb-4 text-sm text-text-muted">{text.pictureHint}</p>
      <div
        role="radiogroup"
        aria-label={text.pictureTitle}
        aria-busy={submitting || undefined}
        onKeyDown={choice.onKeyDown}
        className="space-y-5 pb-2"
      >
        {AVATAR_GROUPS.map((group) => (
          <section key={group} aria-label={AVATAR_GROUP_LABELS[group]} className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">{AVATAR_GROUP_LABELS[group]}</h3>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3">
              {AVATAR_KEYS.filter((key) => AVATARS[key].group === group).map((key) => (
                <Choice
                  key={key}
                  avatar={key}
                  ref={choice.register(key)}
                  tabIndex={choice.tabIndex(key)}
                  checked={choice.checked(key)}
                  busy={submitting && saving === key}
                  onPick={pick}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </Sheet>
  );
}

/** One picture to choose: named by what it shows, marked when in use, busy while it is saved. */
function Choice({
  avatar: key,
  ref,
  tabIndex,
  checked,
  busy,
  onPick,
}: {
  avatar: AvatarKey;
  ref: (node: HTMLElement | null) => void;
  tabIndex: number;
  checked: boolean;
  busy: boolean;
  onPick: (key: AvatarKey) => void;
}) {
  return (
    <button
      ref={ref}
      type="button"
      role="radio"
      aria-checked={checked}
      tabIndex={tabIndex}
      onClick={() => onPick(key)}
      className="flex flex-col items-center gap-2 rounded-2xl px-1 py-3 transition-colors hover:bg-surface-hover"
    >
      <span className="relative">
        <ProfileAvatar
          avatar={key}
          size="lg"
          className={cn(checked && "ring-2 ring-primary ring-offset-2 ring-offset-surface")}
        />
        {checked && (
          <span
            aria-hidden="true"
            className="absolute -bottom-0.5 -right-0.5 flex size-6 items-center justify-center rounded-full border-2 border-surface bg-primary text-primary-text"
          >
            <Check size={14} strokeWidth={2.5} />
          </span>
        )}
        {busy && (
          <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center rounded-full bg-surface/60">
            <Loader2 size={24} className="animate-spin text-primary" />
          </span>
        )}
      </span>
      <span className={cn("text-xs text-text", checked ? "font-semibold" : "font-medium")}>{AVATARS[key].label}</span>
    </button>
  );
}
