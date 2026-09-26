"use client";

import { useResponse } from "@/components/ui/response-card";
import { UI_TEXT } from "@/constants/messages";
import { apiRoutes } from "@/lib/query/keys";
import { useApiQuery } from "@/lib/query/useApiQuery";

import type { Bill } from "../types";
import { BillSheet } from "./BillSheet";

/**
 * A placed order's bill, read when it is opened (`GET /api/orders/{id}/bill`)
 * and never stored (AGENTS.md §15). If it cannot be built, the dialog closes
 * and a response card says so.
 */
export function OrderBill({
  orderId,
  orderNumber,
  open,
  onClose,
}: {
  orderId: string;
  orderNumber: string;
  open: boolean;
  onClose: () => void;
}) {
  const respond = useResponse();
  const bill = useApiQuery<Bill>(open ? apiRoutes.orders.bill(orderId) : null, {
    shouldRetryOnError: false,
    onError: (failure) => {
      onClose();
      respond.failure(failure, { title: UI_TEXT.orderDetail.billNotBuilt, fallback: "RECEIPT_LOAD_FAILED" });
    },
  });

  return <BillSheet open={open} onClose={onClose} title={UI_TEXT.bill.title(orderNumber)} bill={bill.data} />;
}
