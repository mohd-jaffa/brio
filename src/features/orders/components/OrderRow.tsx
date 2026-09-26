import { ProductTile } from "@/components/ui/product-tile";
import { Row } from "@/components/ui/row";
import { StatusPill } from "@/components/ui/status-pill";
import { UI_TEXT } from "@/constants/messages";
import { dayKey } from "@/lib/dates/calendar";
import { formatPaise } from "@/lib/format/currency";
import { formatDayMonth } from "@/lib/format/date";

import type { OrderListItem } from "../types";
import { itemsLine, listStatusPill } from "../view";

/**
 * An order as a phone lists it (plan §139.10): the first item's illustration;
 * the number and who it is for — or Guest; the first item and how many more;
 * when it is due, with what is still to pay (IMP-07); the amount and the
 * status pill at the end. The whole row opens the order. On a customer's own
 * screen the name is left off.
 */
export function OrderRow({
  order,
  now,
  showCustomer = true,
}: {
  order: OrderListItem;
  now?: Date;
  /** Off on a customer's own screen, where every order is theirs. */
  showCustomer?: boolean;
}) {
  const text = UI_TEXT.orderList;
  const pill = listStatusPill(order, now);
  const meta = [
    text.due(formatDayMonth(dayKey(order.dueAt))),
    ...(order.balanceDue > 0 ? [text.toPay(formatPaise(order.balanceDue))] : []),
  ].join(" · ");

  return (
    <Row
      href={`/orders/${order.id}`}
      leading={<ProductTile iconKey={order.firstItem?.iconKey} />}
      title={showCustomer ? `${order.orderNumber} · ${order.customer?.name ?? UI_TEXT.orders.guest}` : order.orderNumber}
      subtitle={itemsLine(order)}
      meta={meta}
      trailing={
        <>
          <span className="tabular-nums">{formatPaise(order.total)}</span>
          <StatusPill label={pill.label} tone={pill.tone} />
        </>
      }
    />
  );
}
