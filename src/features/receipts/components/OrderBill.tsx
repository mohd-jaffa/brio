"use client";

import { FileDown, Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useResponse } from "@/components/ui/response-card";
import { UI_TEXT } from "@/constants/messages";
import { apiRoutes } from "@/lib/query/keys";
import { useApiQuery } from "@/lib/query/useApiQuery";

import { useBillPdf } from "../hooks/useBillPdf";
import { useBillShare } from "../hooks/useBillShare";
import type { Bill } from "../types";
import { BillSheet } from "./BillSheet";

/**
 * A placed order's bill, read when it is opened (`GET /api/orders/{id}/bill`)
 * and never stored (AGENTS.md §15), with **Share** — where Print used to be
 * (the user, 2026-09-26) — and **Download PDF**. If it cannot be built, the
 * dialog closes and a response card says so.
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
  const shown = open ? bill.data : undefined;
  const sharing = useBillShare(shown);
  const pdf = useBillPdf(orderId, shown);

  return (
    <BillSheet
      open={open}
      onClose={onClose}
      title={UI_TEXT.bill.title(orderNumber)}
      bill={shown}
      actions={
        <>
          <Button
            label={UI_TEXT.bill.share}
            icon={Share2}
            disabled={!shown}
            loading={sharing.sharing}
            onClick={() => void sharing.share()}
          />
          <Button
            label={UI_TEXT.bill.downloadPdf}
            icon={FileDown}
            variant="secondary"
            disabled={!shown}
            loading={pdf.downloading}
            onClick={() => void pdf.download()}
          />
        </>
      }
    />
  );
}
