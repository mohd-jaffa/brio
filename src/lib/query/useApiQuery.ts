"use client";

import useSWR, { type SWRConfiguration } from "swr";

import { fetcher } from "@/lib/api/client";

/**
 * A read from the API. Everything a screen needs to draw its loading, failed
 * and empty states comes back in one object, shaped for ListScreen — the
 * screens used to call useSWR with the fetcher and the type spelled out each
 * time, which is how two of them ended up without a failure state at all.
 *
 * `key` may be null while what it depends on is still unknown (an id from the
 * route, a filter not yet chosen); SWR then waits rather than fetching.
 */
export function useApiQuery<T>(key: string | null, options?: SWRConfiguration<T>) {
  const { data, error, isLoading, isValidating, mutate } = useSWR<T>(key, fetcher, options);
  return { data, error, isLoading, isValidating, mutate };
}
