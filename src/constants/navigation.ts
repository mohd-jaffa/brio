import {
  BarChart3,
  CircleDollarSign,
  ClipboardList,
  Cookie,
  Home,
  Menu,
  Package,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";

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

const HOME: NavItem = { id: "home", label: "Home", icon: Home, href: "/" };
const ORDERS: NavItem = { id: "orders", label: "Orders", icon: ClipboardList, href: "/orders" };
const PRODUCTS: NavItem = { id: "products", label: "Products", icon: Cookie, href: "/products" };
const CUSTOMERS: NavItem = { id: "customers", label: "Customers", icon: Users, href: "/customers" };
const ANALYTICS: NavItem = { id: "analytics", label: "Analytics", icon: BarChart3, href: "/analytics" };
const EXPENSES: NavItem = { id: "expenses", label: "Expenses", icon: CircleDollarSign, href: "/expenses" };
const INVENTORY: NavItem = { id: "inventory", label: "Inventory", icon: Package, href: "/inventory" };
const SETTINGS: NavItem = { id: "settings", label: "Settings", icon: Settings, href: "/settings" };

/**
 * The sidebar and the rail, in the plan's three groups: the daily work, the
 * numbers, and the rest. Notifications and Business details join the last
 * group with their screens (R5.10, R2.6).
 */
export const NAV_GROUPS: readonly (readonly NavItem[])[] = [
  [HOME, ORDERS, PRODUCTS, CUSTOMERS],
  [ANALYTICS, EXPENSES],
  [INVENTORY, SETTINGS],
];

/** Every destination, in order. */
export const ALL_NAV: readonly NavItem[] = NAV_GROUPS.flat();

/** The phone's bottom bar: the four daily destinations and the way to the rest. */
export const MORE_NAV_ITEM: NavItem = { id: "more", label: "More", icon: Menu, href: "#more" };
export const BOTTOM_NAV: readonly NavItem[] = [HOME, ORDERS, PRODUCTS, CUSTOMERS, MORE_NAV_ITEM];

/** What lives behind More on a phone: everything the bottom bar does not hold. */
export const MORE_NAV: readonly NavItem[] = ALL_NAV.filter((item) => !BOTTOM_NAV.includes(item));

/** Whether a path is the one a nav item points at. "/" only matches itself. */
export function isActivePath(href: string, pathname: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
