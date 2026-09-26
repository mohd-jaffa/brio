import {
  BarChart3,
  CircleDollarSign,
  ClipboardList,
  Cookie,
  Home,
  Menu,
  Package,
  Settings,
  Store,
  Users,
  type LucideIcon,
} from "lucide-react";

import { UI_TEXT } from "./messages";

/**
 * Where the app can be navigated to (plan §139.5). One set of items, so the
 * phone's bottom bar, the More sheet, the tablet's rail and the desktop's
 * sidebar cannot drift apart — they had, each keeping its own copy.
 */
export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
}

const HOME: NavItem = { id: "home", label: UI_TEXT.nav.places.home, icon: Home, href: "/" };
const ORDERS: NavItem = { id: "orders", label: UI_TEXT.nav.places.orders, icon: ClipboardList, href: "/orders" };
const PRODUCTS: NavItem = { id: "products", label: UI_TEXT.nav.places.products, icon: Cookie, href: "/products" };
const CUSTOMERS: NavItem = { id: "customers", label: UI_TEXT.nav.places.customers, icon: Users, href: "/customers" };
const ANALYTICS: NavItem = { id: "analytics", label: UI_TEXT.nav.places.analytics, icon: BarChart3, href: "/analytics" };
const EXPENSES: NavItem = { id: "expenses", label: UI_TEXT.nav.places.expenses, icon: CircleDollarSign, href: "/expenses" };
const INVENTORY: NavItem = { id: "inventory", label: UI_TEXT.nav.places.inventory, icon: Package, href: "/inventory" };
const BUSINESS: NavItem = { id: "business", label: UI_TEXT.nav.places.business, icon: Store, href: "/business" };
const SETTINGS: NavItem = { id: "settings", label: UI_TEXT.nav.places.settings, icon: Settings, href: "/settings" };

/**
 * The sidebar and the rail, in the plan's three groups: the daily work, the
 * numbers, and the rest. Notifications joins the last group with its screen
 * (R5.10).
 */
export const NAV_GROUPS: readonly (readonly NavItem[])[] = [
  [HOME, ORDERS, PRODUCTS, CUSTOMERS],
  [ANALYTICS, EXPENSES],
  [INVENTORY, BUSINESS, SETTINGS],
];

/** Every destination, in order. */
export const ALL_NAV: readonly NavItem[] = NAV_GROUPS.flat();

/** The phone's bottom bar: the four daily destinations and the way to the rest. */
export const MORE_NAV_ITEM: NavItem = { id: "more", label: UI_TEXT.nav.places.more, icon: Menu, href: "#more" };
export const BOTTOM_NAV: readonly NavItem[] = [HOME, ORDERS, PRODUCTS, CUSTOMERS, MORE_NAV_ITEM];

/** What lives behind More on a phone: everything the bottom bar does not hold. */
export const MORE_NAV: readonly NavItem[] = ALL_NAV.filter((item) => !BOTTOM_NAV.includes(item));

/** Whether a path is the one a nav item points at. "/" only matches itself. */
export function isActivePath(href: string, pathname: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
