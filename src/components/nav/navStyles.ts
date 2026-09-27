import { cn } from "../ui/cn";

/**
 * One place in the sidebar, and on the tablet's rail (plan §139.5): an icon
 * and its label, tinted while current. Shared by the links and by Install
 * app, so every place looks the same.
 */
export function sidebarItemClasses(active: boolean) {
  return cn(
    "group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
    "md:max-lg:size-12 md:max-lg:justify-center md:max-lg:px-0",
    active
      ? "bg-primary-soft font-semibold text-primary"
      : "font-medium text-text-muted hover:bg-surface-hover hover:text-text",
  );
}

/** On the rail the label is a tooltip — still the place's name. */
export const SIDEBAR_LABEL_CLASSES = cn(
  "md:max-lg:pointer-events-none md:max-lg:absolute md:max-lg:left-full md:max-lg:ml-3 md:max-lg:whitespace-nowrap",
  "md:max-lg:rounded-lg md:max-lg:bg-action md:max-lg:px-2.5 md:max-lg:py-1.5 md:max-lg:text-xs md:max-lg:font-medium md:max-lg:text-action-text md:max-lg:shadow-elevated",
  "md:max-lg:opacity-0 md:max-lg:transition-opacity md:max-lg:group-hover:opacity-100 md:max-lg:group-focus-visible:opacity-100",
);
