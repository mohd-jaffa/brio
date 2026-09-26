"use client";

import type { ReactElement, ReactNode } from "react";

import { UI_TEXT, type ErrorMessageCode } from "@/constants/messages";
import { useListMotion } from "@/hooks/useListMotion";
import { errorMessage } from "@/lib/errors/errorMessage";

import { Button } from "./button";
import { cn } from "./cn";
import { ScreenNotice } from "./screen-notice";
import { SkeletonRows } from "./skeleton";

/**
 * One list screen, every state of it. Each of the six list screens had written
 * the same five branches by hand — placeholder rows while it loads, the
 * failure and a way to try again, the empty state, the rows, and the line for
 * "nothing matches what you typed" — and they had drifted apart in wording and
 * in which states they bothered with.
 *
 * What a list needs to know about its query is exactly what SWR returns, so a
 * screen passes its `useSWR` result straight in. A paged one (`useApiPages`)
 * also gets **Show more** under its rows while another page follows.
 */
export interface ListQuery {
  isLoading: boolean;
  error?: unknown;
  mutate?: () => unknown;
  isValidating?: boolean;
  /** A paged list (`useApiPages`): whether another page follows, and how to ask for it. */
  hasMore?: boolean;
  loadingMore?: boolean;
  loadMore?: () => void;
}

/**
 * A screen, or a part of one, that could not load (AGENTS.md §21): why, in
 * the app's words, and **Try again**. It stays on the screen rather than on a
 * response card, because the screen has nothing else to show.
 */
export function LoadFailed({ query, loadFailed }: { query: ListQuery; loadFailed: ErrorMessageCode }) {
  return (
    <section className="space-y-4">
      <ScreenNotice>{errorMessage(query.error, loadFailed)}</ScreenNotice>
      {query.mutate && (
        <Button
          label={UI_TEXT.actions.retry}
          variant="secondary"
          loading={query.isValidating}
          onClick={() => query.mutate?.()}
        />
      )}
    </section>
  );
}

/**
 * Each item as a card of its own in the list's grid — or, with `renderList`
 * instead, the screen draws the whole list itself: hairline rows on a phone,
 * a table on a desktop.
 */
type ListBody<T> =
  | { keyOf: (item: T) => string; renderItem: (item: T) => ReactElement; renderList?: never }
  | { renderList: (items: readonly T[]) => ReactNode; keyOf?: never; renderItem?: never };

function Cards<T>({
  items,
  keyOf,
  renderItem,
  columns,
}: {
  items: readonly T[];
  keyOf: (item: T) => string;
  renderItem: (item: T) => ReactElement;
  columns: 1 | 2;
}) {
  // The cards keep their places as the list changes, as a RowList's rows do.
  const list = useListMotion<HTMLUListElement>();
  return (
    <ul
      ref={list}
      role="list"
      className={cn("relative grid gap-3 md:gap-4", columns === 2 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1")}
    >
      {items.map((item) => (
        <li key={keyOf(item)}>{renderItem(item)}</li>
      ))}
    </ul>
  );
}

function Items<T>({ items, body, columns }: { items: readonly T[]; body: ListBody<T>; columns: 1 | 2 }) {
  if (body.renderList) return body.renderList(items);
  return <Cards items={items} keyOf={body.keyOf} renderItem={body.renderItem} columns={columns} />;
}

export function ListScreen<T>({
  query,
  loadFailed,
  data,
  empty,
  noMatches,
  columns = 1,
  children,
  ...body
}: ListBody<T> & {
  query: ListQuery;
  /** The message shown when loading fails and the failure carries none of its own. */
  loadFailed: ErrorMessageCode;
  /** undefined until the first load has an answer; already filtered by the screen. */
  data: readonly T[] | undefined;
  /** Shown when the bakery has none of these yet — usually an EmptyState. */
  empty: ReactNode;
  /** Shown when there are some, but none match the current search. */
  noMatches?: string;
  columns?: 1 | 2;
  /** Anything below the rows. */
  children?: ReactNode;
}) {
  const failed = query.error != null && data === undefined;

  if (query.isLoading && data === undefined) {
    return (
      <section aria-busy="true">
        <SkeletonRows />
      </section>
    );
  }

  if (failed) return <LoadFailed query={query} loadFailed={loadFailed} />;

  if (!data || data.length === 0) {
    return <section>{noMatches ? <p className="py-10 text-center text-sm font-medium text-text-muted">{noMatches}</p> : empty}</section>;
  }

  return (
    <section>
      <Items items={data} body={body as ListBody<T>} columns={columns} />
      {query.hasMore && query.loadMore && (
        <div className="mt-4 flex justify-center">
          <Button
            label={UI_TEXT.actions.showMore}
            variant="secondary"
            loading={query.loadingMore}
            onClick={query.loadMore}
          />
        </div>
      )}
      {children}
    </section>
  );
}
