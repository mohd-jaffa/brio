"use client";

import { useCallback, useLayoutEffect, useRef } from "react";

import { captureOrderAdd, playOrderAdd, type OrderAddTicket } from "../choreography";

/**
 * Holds each product + until React has drawn the new count and its destination,
 * then plays the handoff before the browser paints that committed layout.
 */
export function useOrderAddMotion(itemCount: number) {
  const pending = useRef<OrderAddTicket[]>([]);

  const capture = useCallback((productId: string, origin: HTMLElement) => {
    const ticket = captureOrderAdd(origin, productId);
    if (ticket) pending.current.push(ticket);
  }, []);

  useLayoutEffect(() => {
    const tickets = pending.current.splice(0);
    tickets.forEach(playOrderAdd);
  }, [itemCount]);

  return capture;
}
