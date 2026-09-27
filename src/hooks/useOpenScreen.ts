"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

import { startNavigation } from "@/lib/navigation/pending";

/**
 * Goes to another of the app's screens from code — a row tapped, an order
 * placed — as a link would: the shell shows the next screen's skeleton if it
 * is slow to arrive (`useNavigationPending`).
 */
export function useOpenScreen(): (href: string) => void {
  const router = useRouter();
  return useCallback(
    (href: string) => {
      startNavigation();
      router.push(href);
    },
    [router],
  );
}
