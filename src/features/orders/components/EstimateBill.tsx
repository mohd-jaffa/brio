"use client";

import { Share2 } from "lucide-react";
import { useId, useMemo } from "react";

import { Button } from "@/components/ui/button";
import { ScreenNotice } from "@/components/ui/screen-notice";
import { UI_TEXT } from "@/constants/messages";
import { useBusiness } from "@/features/business/hooks/useBusiness";
import { estimateBill } from "@/features/receipts/bill";
import { BillSheet } from "@/features/receipts/components/BillSheet";
import { useBillShare } from "@/features/receipts/hooks/useBillShare";
import { publicAppUrl } from "@/lib/env/public";
import { errorMessage } from "@/lib/errors/errorMessage";

import type { OrderEstimate } from "../estimate";

/**
 * The bill before the order is placed (plan §139.11.5): the server's estimate
 * of the draft — no number, dated now, payment as chosen so far — with
 * **Share** and **Place order**. Nothing about it is stored. Stock that is
 * short is said above it, and the order cannot be placed from here until the
 * draft changes — which the foot says too, beside the button it holds back.
 */
export function EstimateBill({
  open,
  estimate,
  onClose,
  onPlace,
  placing,
}: {
  open: boolean;
  /** Absent while the server prices the draft. */
  estimate?: OrderEstimate;
  onClose: () => void;
  onPlace: () => void;
  placing: boolean;
}) {
  const business = useBusiness();
  const bill = useMemo(
    () =>
      open && estimate && business.data
        ? estimateBill({ estimate, business: business.data, appUrl: publicAppUrl() })
        : undefined,
    [open, estimate, business.data],
  );
  const sharing = useBillShare(bill);
  const short = estimate?.shortfalls ?? [];
  const whyNot = useId();

  const notice = business.error ? (
    <ScreenNotice>{errorMessage(business.error, "BUSINESS_LOAD_FAILED")}</ScreenNotice>
  ) : short.length > 0 ? (
    <ScreenNotice>
      {short.map(({ name, available }) => UI_TEXT.newOrder.onlyLeft(name, available)).join(" ")}
    </ScreenNotice>
  ) : undefined;

  return (
    <BillSheet
      open={open}
      onClose={onClose}
      title={UI_TEXT.bill.estimateTitle}
      bill={bill}
      notice={notice}
      actions={
        <>
          {short.length > 0 && (
            <p id={whyNot} className="basis-full! text-xs font-medium text-danger">
              {UI_TEXT.newOrder.shortStock}
            </p>
          )}
          <Button
            label={UI_TEXT.bill.share}
            icon={Share2}
            variant="secondary"
            disabled={!bill}
            loading={sharing.sharing}
            onClick={() => void sharing.share()}
          />
          <Button
            label={UI_TEXT.newOrder.placeOrder}
            variant="action"
            disabled={!bill || short.length > 0}
            aria-describedby={short.length > 0 ? whyNot : undefined}
            loading={placing}
            onClick={onPlace}
          />
        </>
      }
    />
  );
}
