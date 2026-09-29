import { cn } from "@/components/ui/cn";
import { ProductTile } from "@/components/ui/product-tile";
import { Row } from "@/components/ui/row";
import { StatusPill } from "@/components/ui/status-pill";
import { UI_TEXT } from "@/constants/messages";
import { formatPaise } from "@/lib/format/currency";

import type { OrderListItem } from "../types";
import { dueWhen, itemsLine, listStatusPill } from "../view";

/**
 * An order as a phone lists it (plan §139.10): the first item's illustration;
 * the number and who it is for — or Guest; the first item and how many more;
 * when it is due — the day and the time, or how late it is, in the danger
 * tone — with what is still to pay (IMP-07); the amount and the status pill
 * at the end. The whole row opens the order. On a customer's own
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
  const pill = listStatusPill(order);
  const when = dueWhen(order, now);
  // Two facts, each kept whole: where the line is too short for both, it
  // breaks between them rather than cut what is owed.
  const meta = (
    <>
      <span className={cn("whitespace-nowrap", when.late && "font-semibold text-danger")}>{when.text}</span>
      {order.balanceDue > 0 && (
        <>
          {/* The "·" holds to the fact before it, so a second line never starts with it. */}
          {"\u00a0· "}
          <span className="whitespace-nowrap">{text.toPay(formatPaise(order.balanceDue))}</span>
        </>
      )}
    </>
  );

  return (
    <Row
      href={`/orders/${order.id}`}
      leading={<ProductTile iconKey={order.firstItem?.iconKey} />}
      title={
        showCustomer ? `${order.orderNumber} · ${order.customer?.name ?? UI_TEXT.orders.guest}` : order.orderNumber
      }
      subtitle={itemsLine(order)}
      meta={meta}
      wrapMeta
      trailing={
        <>
          <span className="tabular-nums">{formatPaise(order.total)}</span>
          <StatusPill label={pill.label} tone={pill.tone} />
        </>
      }
    />
  );
}
