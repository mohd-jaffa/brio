"use client";

import useSWRInfinite from "swr/infinite";

import { fetcher } from "@/lib/api/client";
import type { Page } from "@/lib/api/pagination";

import { withQuery } from "./keys";

/**
 * A paged list from the API (plan §133.9 I4): the first page, and the next
 * each time **Show more** is pressed. It answers in the shape `ListScreen`
 * reads, with the pages already joined.
 *
 * A new `key` — another search, another tab — starts again from its first
 * page, while the rows of the last one stay on screen until it arrives, so a
 * list being searched does not flash empty with every letter. Every page shown
 * is read again whenever the list is refreshed, so a change to one row cannot
 * leave a stale copy of it further down.
 */
export function useApiPages<T>(key: string | null) {
  const { data, error, isLoading, isValidating, mutate, size, setSize } = useSWRInfinite<Page<T>>(
    (index, previous: Page<T> | null) => {
      if (key === null) return null;
      if (index === 0) return key;
      return previous?.nextCursor ? withQuery(key, { cursor: previous.nextCursor }) : null;
    },
    fetcher,
    { revalidateAll: true, keepPreviousData: true },
  );

  const hasMore = Boolean(data?.[data.length - 1]?.nextCursor);
  return {
    data: data?.flatMap((page) => page.items),
    error,
    isLoading,
    isValidating,
    mutate,
    hasMore,
    // Asked for a page that has not come yet — and there is one to come.
    loadingMore: hasMore && data !== undefined && data.length < size,
    loadMore: () => {
      if (hasMore) void setSize(size + 1);
    },
  };
}
