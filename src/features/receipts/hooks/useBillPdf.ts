"use client";

import { useState } from "react";

import { useResponse } from "@/components/ui/response-card";
import { UI_TEXT } from "@/constants/messages";
import { getFile } from "@/lib/api/client";
import { saveFile } from "@/lib/native";
import { apiRoutes } from "@/lib/query/keys";
import { toTheme } from "@/lib/theme/themes";

import { billFileName } from "../bill";
import type { Bill } from "../types";

/**
 * **Download PDF** on a placed order's bill (plan §139.11.6, §133.8 H1): made
 * by the server when it is asked for, in the page's theme, saved on the device
 * as `{order number} - {business name}.pdf`, and stored nowhere else.
 */
export function useBillPdf(orderId: string, bill: Bill | undefined) {
  const respond = useResponse();
  const [downloading, setDownloading] = useState(false);

  const download = async (current: Bill) => {
    setDownloading(true);
    try {
      const theme = toTheme(document.documentElement.getAttribute("data-theme"));
      const pdf = await getFile(`${apiRoutes.orders.billPdf(orderId)}?theme=${theme}`);
      const name = billFileName(current, "pdf");
      saveFile(pdf, name);
      respond.success({ title: UI_TEXT.bill.pdfSaved, message: UI_TEXT.bill.savedTo(name) });
    } catch (failure) {
      respond.failure(failure, { title: UI_TEXT.bill.pdfNotSaved, fallback: "BILL_PDF_FAILED" });
    } finally {
      setDownloading(false);
    }
  };

  return { download: () => (bill ? download(bill) : Promise.resolve()), downloading };
}
