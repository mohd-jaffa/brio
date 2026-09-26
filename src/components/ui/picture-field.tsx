"use client";

import { useState } from "react";

import { ILLUSTRATIONS, illustrationOr, type IllustrationKey } from "@/constants/illustrations";
import { UI_TEXT } from "@/constants/messages";

import { Button } from "./button";
import { IllustrationPicker } from "./illustration-picker";
import { ProductTile } from "./product-tile";

/**
 * A form's **Picture** field (plan §139.11.10): the illustration in use, its
 * name, and **Change**, which opens the library to choose another. For a
 * product, and for an expense category; nothing is uploaded — only the key
 * is kept. None, or a key the library no longer has, shows `fallback`.
 */
export function PictureField({
  value,
  fallback,
  onChange,
}: {
  value: string | null | undefined;
  fallback: IllustrationKey;
  onChange: (key: IllustrationKey) => void;
}) {
  const text = UI_TEXT.illustrationPicker;
  const [picking, setPicking] = useState(false);
  const icon = illustrationOr(value, fallback);

  return (
    <div>
      <p className="mb-2 block text-sm font-medium text-text">{text.label}</p>
      <div className="flex items-center gap-3">
        <ProductTile iconKey={icon} size="lg" fallback={fallback} />
        <span className="min-w-0 flex-1 truncate text-sm text-text">{ILLUSTRATIONS[icon].label}</span>
        <Button
          label={text.change}
          aria-label={text.changeName(ILLUSTRATIONS[icon].label)}
          variant="secondary"
          size="sm"
          onClick={() => setPicking(true)}
        />
      </div>
      <IllustrationPicker
        open={picking}
        onClose={() => setPicking(false)}
        value={icon}
        fallback={fallback}
        onPick={onChange}
      />
    </div>
  );
}
