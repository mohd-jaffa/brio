"use client";

import { useCallback, useSyncExternalStore } from "react";

import { newRequestKey } from "@/lib/api/request-key";
import { onUserItemsCleared, readUserItem, removeUserItem, writeUserItem } from "@/lib/storage/userStorage";

import { newDraft, readDraft, type OrderDraft } from "../draft";

/**
 * The order being built, kept on this device for the signed-in user until it
 * is placed or cleared (plan §110, §139.10): a refresh, a back navigation or a
 * trip to WhatsApp to read the order loses nothing. Signing out clears it.
 *
 * The idempotency key for placing it is kept beside it, so Place order after
 * a refresh — when the first attempt may have landed — still makes one order
 * (§133.3 C2).
 */
const DRAFT_ITEM = "order_draft";
const REQUEST_ITEM = "order_request";

const drafts = new Map<string, OrderDraft>();
// Kept in memory too, so a device that will not store it still sends a
// double tap with one key.
const requests = new Map<string, { body: string; key: string }>();
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

onUserItemsCleared(() => {
  drafts.clear();
  requests.clear();
  notify();
});

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The user's draft: kept in memory once read, so React sees one object until it changes. */
function draftOf(userId: string): OrderDraft {
  let draft = drafts.get(userId);
  if (!draft) {
    // A fresh draft is dated from now — when it is started, not when the
    // module loaded (BUG-28).
    draft = readDraft(readUserItem(userId, DRAFT_ITEM)) ?? newDraft();
    drafts.set(userId, draft);
  }
  return draft;
}

function put(userId: string, draft: OrderDraft) {
  drafts.set(userId, draft);
  writeUserItem(userId, DRAFT_ITEM, draft);
  notify();
}

export function useOrderDraft(userId: string | null) {
  // Nothing on the server, whose render cannot see this device's storage.
  const draft = useSyncExternalStore(
    subscribe,
    () => (userId ? draftOf(userId) : null),
    () => null,
  );

  const update = useCallback(
    (change: (draft: OrderDraft) => OrderDraft) => {
      if (userId) put(userId, change(draftOf(userId)));
    },
    [userId],
  );

  /** Starts again: a new draft, and a new key for whatever is placed next. */
  const clear = useCallback(() => {
    if (!userId) return;
    requests.delete(userId);
    removeUserItem(userId, REQUEST_ITEM);
    put(userId, newDraft());
  }, [userId]);

  /**
   * The key to place this request with: the one it was last sent with if it
   * is the same request, or a new one (src/lib/api/request-key.ts).
   */
  const keyFor = useCallback(
    (payload: unknown): string => {
      const body = JSON.stringify(payload);
      if (!userId) return newRequestKey();
      const last = requests.get(userId) ?? readUserItem<{ body: string; key: string }>(userId, REQUEST_ITEM);
      if (last?.body === body) return last.key;
      const request = { body, key: newRequestKey() };
      requests.set(userId, request);
      writeUserItem(userId, REQUEST_ITEM, request);
      return request.key;
    },
    [userId],
  );

  return { draft, update, clear, keyFor };
}
