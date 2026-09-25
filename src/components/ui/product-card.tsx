import { Plus } from "lucide-react";

import { ProductTile } from "./product-tile";

/**
 * A product in a grid — the order screen's items (plan §139.5): its
 * illustration across the card, its name, its price and a + to add it.
 */
export function ProductCard({
  name,
  price,
  iconKey,
  addLabel,
  onAdd,
  disabled = false,
}: {
  name: string;
  /** Already formatted: "₹1,250". */
  price: string;
  iconKey?: string | null;
  /** The +'s name for a screen reader: "Add Chocolate truffle cake". */
  addLabel: string;
  onAdd: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col rounded-2xl border border-border bg-surface p-2 shadow-card">
      <ProductTile iconKey={iconKey} size="fill" />
      <p className="mt-2 line-clamp-2 min-h-10 px-1 text-sm font-medium leading-5 text-text">{name}</p>
      <div className="mt-1 flex items-center justify-between gap-2 pb-0.5 pl-1">
        <span className="text-sm font-semibold tabular-nums text-text">{price}</span>
        <button
          type="button"
          aria-label={addLabel}
          onClick={onAdd}
          disabled={disabled}
          className="hit-area inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-text transition-colors hover:bg-primary-hover active:scale-95 disabled:opacity-50"
        >
          <Plus size={16} strokeWidth={2.25} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
