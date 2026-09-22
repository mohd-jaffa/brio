"use client";

import { Search } from "lucide-react";
import { useId } from "react";

/**
 * The search box above a list. It was copied into every list screen, each with
 * its own placeholder and no label; here the placeholder names the field for a
 * screen reader too, because a placeholder stops being a name the moment
 * something is typed.
 */
export function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const id = useId();
  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">
        {placeholder}
      </label>
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
        <Search size={18} strokeWidth={2.5} className="text-text-muted/60" aria-hidden="true" />
      </div>
      <input
        id={id}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-border bg-surface py-3.5 pl-11 pr-4 text-sm font-medium shadow-sm outline-none transition-all placeholder:text-text-muted/60 focus:border-primary focus:ring-1 focus:ring-primary"
      />
    </div>
  );
}
