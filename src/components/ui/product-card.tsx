"use client";

import { Minus, Plus } from "lucide-react";
import { useRef } from "react";

import { useArrived } from "@/hooks/useArrived";

import { cn } from "./cn";
import { ProductTile } from "./product-tile";
import { RollingNumber } from "./rolling-number";

const STEP = "hit-area inline-flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors active:scale-95";

/**
 * A product in a grid — the order screen's items (plan §139.5): its
 * illustration across the card, its name, its price and a + to add it. Once
 * some are in the order the + grows into − count + (the user, 2026-09-26), so
 * one can come off without leaving the grid; the last one off takes it out.
 * The + stays the same button throughout, so focus never jumps.
 */
export function ProductCard({
  name,
  price,
  iconKey,
  addLabel,
  onAdd,
  quantity = 0,
  quantityLabel,
  removeLabel,
  onRemove,
  disabled = false,
}: {
  name: string;
  /** Already formatted: "₹1,250". */
  price: string;
  iconKey?: string | null;
  /** The +'s name for a screen reader: "Add Chocolate truffle cake". */
  addLabel: string;
  onAdd: () => void;
  /** How many are in the order already. */
  quantity?: number;
  /** That count in words, for a screen reader: "2 in the order". */
  quantityLabel?: string;
  /** The −'s name: "Remove one Chocolate truffle cake". */
  removeLabel?: string;
  /** Without it the card only adds. */
  onRemove?: () => void;
  disabled?: boolean;
}) {
  const inOrder = quantity > 0 && onRemove !== undefined;
  // The − and the count come in with the first one added, not when the screen opens with some.
  const arrived = useArrived(inOrder);
  const add = useRef<HTMLButtonElement>(null);

  const removeOne = () => {
    // The − goes with the last one: focus waits on the + instead of falling to the page.
    if (quantity === 1) add.current?.focus();
    onRemove?.();
  };

  return (
    <div className="@container flex min-w-0 flex-col rounded-2xl border border-border bg-surface p-2 shadow-card">
      <ProductTile iconKey={iconKey} size="fill" />
      <p className="mt-2 line-clamp-2 min-h-10 px-1 text-sm font-medium leading-5 text-text">{name}</p>
      {/* A card too narrow for the price and − count + on one line gives the
          price a line of its own — in the order or not, so adding one never
          moves the grid. */}
      <div className="mt-1 flex flex-wrap items-center justify-between gap-x-1.5 gap-y-1.5 pb-0.5 pl-1">
        <span className="basis-full text-sm font-semibold tabular-nums text-text @[8.5rem]:basis-auto">{price}</span>
        <div
          className={cn(
            "ml-auto inline-flex items-center rounded-lg text-primary-text",
            inOrder && "bg-primary",
            // It grows out of the +, which sits at its right.
            arrived && "origin-right animate-pop",
          )}
        >
          {inOrder && (
            <button
              type="button"
              aria-label={removeLabel}
              onClick={removeOne}
              className={cn(STEP, "hover:bg-primary-hover")}
            >
              <Minus size={16} strokeWidth={2.25} aria-hidden="true" />
            </button>
          )}
          {inOrder && (
            // At least the room that keeps the − and the +'s 44 px halos apart.
            <span aria-hidden="true" className="min-w-3 text-center text-sm font-semibold tabular-nums">
              <RollingNumber value={quantity} />
            </span>
          )}
          <button
            ref={add}
            type="button"
            aria-label={addLabel}
            onClick={onAdd}
            disabled={disabled}
            className={cn(STEP, "bg-primary hover:bg-primary-hover disabled:opacity-50")}
          >
            <Plus size={16} strokeWidth={2.25} aria-hidden="true" />
          </button>
        </div>
        {quantity > 0 && quantityLabel && <span className="sr-only">{quantityLabel}</span>}
      </div>
    </div>
  );
}
