"use client";

import { ArrowRight, MoreHorizontal, Undo2, XCircle } from "lucide-react";
import { useState } from "react";

import { Button, IconButton } from "@/components/ui/button";
import { useResponse } from "@/components/ui/response-card";
import { Sheet } from "@/components/ui/sheet";
import { UI_TEXT } from "@/constants/messages";
import { orderStatusLabel, type OrderStatus } from "@/constants/statuses";

import { isFinal, movesBack, nextStatuses } from "../lifecycle";
import type { Order } from "../types";

/**
 * Where an order goes next (plan §139.10, §139.11.8): **one next-step button**
 * — Pending → Preparing → Ready → … — and **Change status** beside it, which
 * offers every other status the order can take: further on in one step
 * (straight to Delivered), back to an earlier one when it was moved by
 * mistake, and Cancel last.
 *
 * Delivered or Completed, and Cancelled, cannot be undone — stock follows
 * them, and the order is final — so either asks through a confirm card first,
 * wherever it is chosen. A finished order has nowhere to go, and shows nothing.
 */
export function StatusActions({
  order,
  moving,
  onMove,
}: {
  order: Order;
  /** A move is on its way: the button waits, and a second tap does nothing. */
  moving: boolean;
  onMove: (status: OrderStatus) => void;
}) {
  const text = UI_TEXT.orderDetail;
  const respond = useResponse();
  const [menuOpen, setMenuOpen] = useState(false);

  const moves = nextStatuses(order.status, order.delivery.type);
  if (moves.length === 0) return null;
  const [next, ...others] = moves;
  const label = (status: OrderStatus) => orderStatusLabel(status, order.delivery.type);

  /** Asks before a move that cannot be undone; true to go ahead. */
  const sure = (status: OrderStatus) =>
    status === "CANCELLED"
      ? respond.confirm({
          title: UI_TEXT.orders.cancelTitle(order.orderNumber),
          message: UI_TEXT.orders.cancelBody,
          confirmLabel: UI_TEXT.orders.cancelConfirm,
          cancelLabel: UI_TEXT.outcomes.keepOrder,
          tone: "danger",
        })
      : respond.confirm({
          title: text.finalTitle(order.orderNumber, label(status)),
          message: text.finalBody,
          confirmLabel: text.moveTo(label(status)),
          cancelLabel: text.notYet,
        });

  const move = async (status: OrderStatus) => {
    setMenuOpen(false);
    if (isFinal(status) && !(await sure(status))) return;
    onMove(status);
  };

  return (
    <div className="flex items-center gap-2">
      <div className="min-w-0 flex-1">
        {/* Never Cancel: the table always offers a way forward before it (§139.11.8). */}
        <Button
          label={text.moveTo(label(next))}
          icon={ArrowRight}
          iconPosition="end"
          variant="action"
          fullWidth
          loading={moving}
          onClick={() => void move(next)}
        />
      </div>
      {/* Never empty: an open order can always be cancelled. */}
      <IconButton icon={MoreHorizontal} label={text.moreMoves} onClick={() => setMenuOpen(true)} />
      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} title={text.movesTitle}>
        <ul className="space-y-2 pb-2">
          {others.map((status) => (
            <li key={status}>
              {status === "CANCELLED" ? (
                <Button
                  label={UI_TEXT.orders.cancelConfirm}
                  icon={XCircle}
                  variant="danger"
                  fullWidth
                  onClick={() => void move(status)}
                />
              ) : movesBack(order.status, status) ? (
                <Button
                  label={text.moveBack(label(status))}
                  icon={Undo2}
                  variant="ghost"
                  fullWidth
                  onClick={() => void move(status)}
                />
              ) : (
                <Button
                  label={text.moveTo(label(status))}
                  variant="ghost"
                  fullWidth
                  onClick={() => void move(status)}
                />
              )}
            </li>
          ))}
        </ul>
      </Sheet>
    </div>
  );
}
