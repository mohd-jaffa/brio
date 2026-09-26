/**
 * The largest values a form or a route accepts (plan §139.7, BUG-12). Money and
 * quantities are stored in `integer` columns, which end at 2,147,483,647 — in
 * paise, about ₹2.1 crore. A value past that used to reach the database and
 * come back as a 500; these keep every field, and every order's total, well
 * inside it, and let the person be told the limit instead.
 */

/** One money field: ₹10,00,000. */
export const MAX_AMOUNT_PAISE = 100_000_000;

/** What one order may come to: ₹1,00,00,000. */
export const MAX_ORDER_TOTAL_PAISE = 1_000_000_000;

/** One line of an order. */
export const MAX_QUANTITY = 9_999;

/** One stock movement — large, because a product may be counted in grams. */
export const MAX_STOCK_MOVEMENT = 1_000_000;

/**
 * How many rows a list asks for at a time (plan §133.9 I4): enough to fill a
 * phone twice over, and **Show more** brings the next as many.
 */
export const PAGE_SIZE = 20;

/** How far into a list a page may start — far past any list a business keeps. */
export const MAX_PAGE_START = 100_000;

/** What a list's search box may send. */
export const MAX_SEARCH_LENGTH = 100;
