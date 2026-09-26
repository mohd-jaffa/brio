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

/** How often the bell asks again how many notifications wait (plan §139.10). */
export const NOTIFICATION_REFRESH_MS = 60_000;

/**
 * The most the bell counts before it says "9+": two characters keep the badge
 * a small circle on the icon. Its name still says exactly how many.
 */
export const NOTIFICATION_BADGE_MAX = 9;

/**
 * The hour of the business's day from which an order due soon, or overdue,
 * is told (0023): its morning, never the middle of the night.
 */
export const DUE_NOTICE_FROM_HOUR = 8;

/** An expense category's name: a tile's label, not a sentence (`0020_expense_categories`). */
export const MAX_EXPENSE_CATEGORY_NAME = 40;

/** What a list's search box may send. */
export const MAX_SEARCH_LENGTH = 100;

/**
 * How much of each list Home shows before **View all** (plan §139.10): it is a
 * glance at what needs doing, and the lists behind it are complete.
 */
export const HOME_LIST_LIMITS = {
  due: 10,
  lowStock: 5,
  topProducts: 5,
  recentCustomers: 5,
} as const;

/** The fewest days Home's sales chart shows, so today alone is still a trend. */
export const HOME_MIN_TREND_DAYS = 7;

/**
 * A customer's segment (plan §139.10): Regular once they have placed this
 * many orders, cancelled ones not counted; New while they were added within
 * this many days. Regular wins when both hold.
 */
export const REGULAR_MIN_ORDERS = 3;
export const NEW_CUSTOMER_DAYS = 30;

/**
 * The most rows the API answers in one read (`max_rows` in
 * supabase/config.toml, and Supabase's default): a longer read stops there
 * without saying so. `readAll` reads past it, a window at a time.
 */
export const API_MAX_ROWS = 1000;

/** How many of the period's expenses Expenses' Overview shows as recent (plan §139.10). */
export const RECENT_EXPENSES = 5;

/**
 * How long a changed profile detail stays as it is: the owner's name, sign-in
 * number and email, and the business's name (the user, 2026-09-26;
 * `profile_change_interval()` in 0021_profile_changes.sql).
 */
export const PROFILE_CHANGE_DAYS = 30;

/** How long the link that confirms a new email address works. */
export const EMAIL_CHANGE_LINK_HOURS = 48;
