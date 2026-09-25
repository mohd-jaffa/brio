"use client";

import { apiRoutes } from "@/lib/query/keys";
import { useApiQuery } from "@/lib/query/useApiQuery";

import type { BusinessProfile } from "../types";

/**
 * The signed-in owner's business. Every screen's shell shows it, so it is read
 * once and kept: moving between screens draws it from the cache rather than
 * asking again, and an edit refreshes it by the same key.
 */
export function useBusiness() {
  return useApiQuery<BusinessProfile>(apiRoutes.business.profile, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  });
}
