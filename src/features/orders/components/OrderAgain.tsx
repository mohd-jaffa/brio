"use client";

import { RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useResponse } from "@/components/ui/response-card";
import { UI_TEXT } from "@/constants/messages";
import { useAuth } from "@/features/auth/AuthProvider";
import type { Customer } from "@/features/customers/types";
import type { Product } from "@/features/products/types";
import { apiRoutes } from "@/lib/query/keys";
import { useApiQuery } from "@/lib/query/useApiQuery";

import { customerForDraft, itemCount, repeatOrder, type DraftCustomer } from "../draft";
import { useOrderDraft } from "../hooks/useOrderDraft";
import type { Order } from "../types";

/**
 * **Order again** (IMP-03): the order being built starts over from this one —
 * its items and notes, its customer, how and where it was handed over — and
 * the order screen opens on it. An order already being built is replaced
 * only once the owner says so; anything no longer on sale is left out, and
 * the card says how much.
 */
export function OrderAgain({ order, customer }: { order: Order; customer?: Customer }) {
  const text = UI_TEXT.orderDetail;
  const router = useRouter();
  const respond = useResponse();
  const { profile } = useAuth();
  const { draft, update, clear } = useOrderDraft(profile?.id ?? null);
  const products = useApiQuery<Product[]>(apiRoutes.products.list);

  // Who it was for, once known: a Guest at once, a saved customer when read.
  const who: DraftCustomer | null =
    order.customerId === null ? { kind: "GUEST" } : customer ? customerForDraft(customer) : null;
  const catalogue = products.data;

  // It can start once the draft, the customer and the catalogue are all known.
  const start =
    draft !== null && who !== null && catalogue !== undefined
      ? async () => {
          if (itemCount(draft) > 0) {
            const replace = await respond.confirm({
              title: text.replaceTitle,
              message: text.replaceBody,
              confirmLabel: text.replaceConfirm,
              cancelLabel: text.keepBuilding,
            });
            if (!replace) return;
          }
          const onSale = new Set(catalogue.filter((product) => product.isActive).map((product) => product.id));
          const again = repeatOrder(order, who, onSale);
          clear();
          update(() => again.draft);
          if (again.left > 0) respond.info({ title: text.leftOutTitle, message: text.leftOut(again.left) });
          router.push("/orders/new");
        }
      : null;

  return (
    <Button
      label={text.orderAgain}
      aria-label={text.orderAgainName(order.orderNumber)}
      icon={RotateCcw}
      variant="secondary"
      size="sm"
      disabled={!start}
      onClick={start ? () => void start() : undefined}
    />
  );
}
