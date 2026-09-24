/**
 * The illustration library (plan §139.11.10): app-owned art a user picks for a
 * product or an expense category. Not an upload — the art ships with the app,
 * and only the key is ever stored (AGENTS.md §16).
 *
 * A key is stored in the database, so it is permanent: never renamed, never
 * reused. Retiring one needs a migration that moves its users to another key.
 * The images themselves are mapped in src/assets/illustrations, kept apart so
 * server code — validation, routes — can use the keys without loading images.
 */

export const ILLUSTRATION_GROUPS = ["basics", "bakes", "gifts", "food"] as const;
export type IllustrationGroup = (typeof ILLUSTRATION_GROUPS)[number];

export const ILLUSTRATION_GROUP_LABELS: Record<IllustrationGroup, string> = {
  basics: "Basics",
  bakes: "Bakes and sweets",
  gifts: "Gifts and flowers",
  food: "Food",
};

/** In the order the picker shows them: the defaults first, then by group. */
export const ILLUSTRATIONS = {
  "default-product": { label: "Price tag", group: "basics" },
  "default-expense": { label: "Receipt", group: "basics" },
  "gold-coins": { label: "Gold coins", group: "basics" },
  "shopping-bags": { label: "Shopping bags", group: "basics" },
  "delivery-scooter": { label: "Delivery scooter", group: "basics" },
  "delivery-ninja": { label: "Delivery courier", group: "basics" },
  "donut": { label: "Donut", group: "bakes" },
  "cupcake": { label: "Cupcake", group: "bakes" },
  "choco-chip-muffin": { label: "Chocolate chip muffin", group: "bakes" },
  "chocolate-cake-slice": { label: "Chocolate cake slice", group: "bakes" },
  "strawberry-cake-slice": { label: "Strawberry cake slice", group: "bakes" },
  "strawberry-cake": { label: "Strawberry cake", group: "bakes" },
  "glazed-cake": { label: "Glazed cake", group: "bakes" },
  "pudding": { label: "Pudding", group: "bakes" },
  "cake-squares": { label: "Cake squares", group: "bakes" },
  "cookie-cup": { label: "Cookie in a cup", group: "bakes" },
  "chocolate-bar": { label: "Chocolate bar", group: "bakes" },
  "choco-sponge-bar": { label: "Chocolate sponge bar", group: "bakes" },
  "gift-box": { label: "Gift box", group: "gifts" },
  "gift-box-pink": { label: "Pink gift box", group: "gifts" },
  "heart-gift-box": { label: "Heart gift box", group: "gifts" },
  "teddy-bear": { label: "Teddy bear", group: "gifts" },
  "rose-bouquet": { label: "Rose bouquet", group: "gifts" },
  "rose-bunch": { label: "Bunch of roses", group: "gifts" },
  "heart-balloons": { label: "Heart balloons", group: "gifts" },
  "chick-gift": { label: "Chick with a gift", group: "gifts" },
  "fried-chicken": { label: "Fried chicken", group: "food" },
  "taco": { label: "Taco", group: "food" },
} as const satisfies Record<string, { label: string; group: IllustrationGroup }>;

export type IllustrationKey = keyof typeof ILLUSTRATIONS;

export const ILLUSTRATION_KEYS = Object.keys(ILLUSTRATIONS) as [IllustrationKey, ...IllustrationKey[]];

export const DEFAULT_PRODUCT_ILLUSTRATION: IllustrationKey = "default-product";
export const DEFAULT_EXPENSE_ILLUSTRATION: IllustrationKey = "default-expense";

export function isIllustrationKey(value: string | null | undefined): value is IllustrationKey {
  return value != null && Object.prototype.hasOwnProperty.call(ILLUSTRATIONS, value);
}

/** A stored key the library no longer has — or none at all — shows the default. */
export function illustrationOr(value: string | null | undefined, fallback: IllustrationKey): IllustrationKey {
  return isIllustrationKey(value) ? value : fallback;
}
