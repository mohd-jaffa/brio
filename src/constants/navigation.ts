import {
  BarChart3,
  Cake,
  CircleDollarSign,
  Home,
  Menu,
  Package,
  ReceiptText,
  Settings,
  ShoppingBag,
  Users,
  type LucideIcon,
} from "lucide-react";

/**
 * Where the app can be navigated to (plan §9). One list, so the phone's bottom
 * bar, the More sheet and the desktop sidebar cannot drift apart — they had,
 * each keeping its own copy of the labels and hrefs.
 */
export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
}

export const PRIMARY_NAV: readonly NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: Home, href: "/" },
  { id: "orders", label: "Orders", icon: ShoppingBag, href: "/orders" },
  { id: "customers", label: "Customers", icon: Users, href: "/customers" },
];

/** What lives behind "More" on a phone, and below the primary items on a desktop. */
export const SECONDARY_NAV: readonly NavItem[] = [
  { id: "products", label: "Products", icon: Cake, href: "/products" },
  { id: "inventory", label: "Inventory", icon: Package, href: "/inventory" },
  { id: "expenses", label: "Expenses", icon: CircleDollarSign, href: "/expenses" },
  { id: "analytics", label: "Analytics", icon: BarChart3, href: "/analytics" },
  { id: "receipts", label: "Receipts", icon: ReceiptText, href: "/receipts" },
  { id: "settings", label: "Settings", icon: Settings, href: "/settings" },
];

/** The sidebar, from tablet up: everything, in order. */
export const SIDEBAR_NAV: readonly NavItem[] = [...PRIMARY_NAV, ...SECONDARY_NAV];

/** The bottom bar on a phone: three destinations and the way to the rest. */
export const MORE_NAV_ITEM: NavItem = { id: "more", label: "More", icon: Menu, href: "#more" };
export const BOTTOM_NAV: readonly NavItem[] = [...PRIMARY_NAV, MORE_NAV_ITEM];

/** Whether a path is the one a nav item points at. "/" only matches itself. */
export function isActivePath(href: string, pathname: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
