"use client";

import { Download } from "lucide-react";
import { useState } from "react";

import { lazySheet } from "@/components/ui/lazy-sheet";
import { Medallion } from "@/components/ui/medallion";
import { Row, RowList } from "@/components/ui/row";
import { UI_TEXT } from "@/constants/messages";
import { useInstallApp } from "@/hooks/useInstallApp";

import { SIDEBAR_LABEL_CLASSES, sidebarItemClasses } from "./navStyles";

/** Kept out of the screen's first download, and fetched once it is idle (`lazySheet`). */
const InstallAppSheet = lazySheet(
  () => import("./InstallAppSheet").then((module) => module.InstallAppSheet),
  (props) => props.open,
);

const text = UI_TEXT.install;

/**
 * **Install app**, among the other places (plan §139.19 R7.3; the user,
 * 2026-09-27): a row of its own in More on a phone, and the sidebar's last place on a
 * tablet and a desktop. It opens the steps for this device. Inside the
 * installed app it is not there at all, nor before the browser has said how
 * the app was opened.
 */
export function InstallApp({ variant }: { variant: "row" | "sidebar" }) {
  const { offered } = useInstallApp();
  const [open, setOpen] = useState(false);
  if (!offered) return null;

  return (
    <>
      {variant === "row" ? (
        <RowList>
          <Row
            leading={<Medallion icon={Download} size="sm" />}
            title={text.menu}
            subtitle={text.hint}
            onClick={() => setOpen(true)}
          />
        </RowList>
      ) : (
        <button
          type="button"
          aria-haspopup="dialog"
          onClick={() => setOpen(true)}
          className={sidebarItemClasses(false)}
        >
          <Download size={20} strokeWidth={1.75} className="shrink-0" aria-hidden="true" />
          <span className={SIDEBAR_LABEL_CLASSES}>{text.menu}</span>
        </button>
      )}
      <InstallAppSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}
