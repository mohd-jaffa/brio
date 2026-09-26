"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { ProductTile } from "@/components/ui/product-tile";
import { StatusPill } from "@/components/ui/status-pill";
import { UI_TEXT } from "@/constants/messages";
import { formatPaise } from "@/lib/format/currency";
import { dayKey } from "@/lib/dates/calendar";
import { formatDayMonth, formatTime } from "@/lib/format/date";

import type { OrderListItem } from "../types";
import { itemsLine, listStatusPill } from "../view";

const CELL = "px-4 py-3";

/**
 * Orders as a desktop lists them (plan §139.10): Order, Due, Customer,
 * Items, Amount and Status, a row to an order — when it is due beside which
 * it is, since that is what the list is read for. The number is the link, so
 * the keyboard reaches each order once; a click anywhere on the row follows it.
 */
export function OrdersTable({ orders, now }: { orders: readonly OrderListItem[]; now?: Date }) {
  const router = useRouter();
  const text = UI_TEXT.ordersScreen;
  const columns = text.columns;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
      <table className="w-full table-fixed text-sm">
        <caption className="sr-only">{text.title}</caption>
        <colgroup>
          <col className="w-[6.5rem]" />
          <col className="w-[6.5rem]" />
          <col className="w-[11rem]" />
          <col />
          <col className="w-[7.5rem]" />
          <col className="w-[9rem]" />
        </colgroup>
        <thead className="border-b border-border text-left text-xs font-medium text-text-muted">
          <tr>
            <th scope="col" className={CELL}>{columns.order}</th>
            <th scope="col" className={CELL}>{columns.due}</th>
            <th scope="col" className={CELL}>{columns.customer}</th>
            <th scope="col" className={CELL}>{columns.items}</th>
            <th scope="col" className={`${CELL} text-right`}>{columns.amount}</th>
            <th scope="col" className={CELL}>{columns.status}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {orders.map((order) => {
            const href = `/orders/${order.id}`;
            const pill = listStatusPill(order, now);
            return (
              <tr
                key={order.id}
                onClick={() => router.push(href)}
                className="cursor-pointer transition-colors hover:bg-surface-hover"
              >
                <td className={CELL}>
                  <Link href={href} className="rounded font-semibold text-text">
                    {order.orderNumber}
                  </Link>
                </td>
                <td className={CELL}>
                  <span className="block text-text">{formatDayMonth(dayKey(order.dueAt))}</span>
                  <span className="block text-xs text-text-muted">{formatTime(order.dueAt)}</span>
                </td>
                <td className={`${CELL} truncate text-text`}>{order.customer?.name ?? UI_TEXT.orders.guest}</td>
                <td className={CELL}>
                  <span className="flex min-w-0 items-center gap-3">
                    <ProductTile iconKey={order.firstItem?.iconKey} size="md" />
                    <span className="truncate text-text">{itemsLine(order)}</span>
                  </span>
                </td>
                <td className={`${CELL} text-right tabular-nums`}>
                  <span className="block font-semibold text-text">{formatPaise(order.total)}</span>
                  {order.balanceDue > 0 && (
                    <span className="block text-xs text-text-muted">
                      {UI_TEXT.orderList.toPay(formatPaise(order.balanceDue))}
                    </span>
                  )}
                </td>
                <td className={CELL}>
                  <StatusPill label={pill.label} tone={pill.tone} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
