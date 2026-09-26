"use client";

import { useEffect, useRef, useState } from "react";

import { useResponse } from "@/components/ui/response-card";
import { UI_TEXT } from "@/constants/messages";
import { share } from "@/lib/native";
import { toTheme } from "@/lib/theme/themes";

import { billShareText } from "../document";
import { billImage } from "../image";
import type { Bill } from "../types";

/** The theme the page is drawn in now (the attribute on <html>, ThemeProvider). */
const pageTheme = () => toTheme(document.documentElement.getAttribute("data-theme"));

/**
 * **Share** on a bill (plan §139.11.6, IMP-02): the bill as a PNG with a line
 * of text, through the share sheet — WhatsApp shows it inline — or, where a
 * browser cannot share files, downloaded with the text copied. The image is
 * drawn as soon as the bill is there, so a tap hands it over at once: Safari
 * refuses a share that starts long after the tap.
 */
export function useBillShare(bill: Bill | undefined) {
  const respond = useResponse();
  const [sharing, setSharing] = useState(false);
  const drawn = useRef<{ bill: Bill; file: Promise<File> } | null>(null);

  useEffect(() => {
    if (!bill) return;
    const file = billImage(bill, pageTheme());
    // A failure is reported when Share is pressed, not before.
    file.catch(() => undefined);
    drawn.current = { bill, file };
  }, [bill]);

  const run = async (current: Bill) => {
    setSharing(true);
    try {
      const file = await (drawn.current?.bill === current ? drawn.current.file : billImage(current, pageTheme()));
      const outcome = await share(file, billShareText(current));
      if (outcome === "SHARED") respond.success({ title: UI_TEXT.bill.shared });
      if (outcome === "SAVED" || outcome === "SAVED_AND_COPIED") {
        respond.success({
          title: UI_TEXT.bill.saved,
          message: outcome === "SAVED" ? UI_TEXT.bill.savedTo(file.name) : UI_TEXT.bill.savedAndCopied(file.name),
        });
      }
    } catch (failure) {
      // Drawn again next time: the fonts may load now.
      drawn.current = null;
      respond.failure(failure, { title: UI_TEXT.bill.notShared, fallback: "BILL_SHARE_FAILED" });
    } finally {
      setSharing(false);
    }
  };

  return { share: () => (bill ? run(bill) : Promise.resolve()), sharing };
}
