"use client";

import { Bell } from "lucide-react";

import { Medallion } from "@/components/ui/medallion";
import { useResponse } from "@/components/ui/response-card";
import { Row, RowList } from "@/components/ui/row";
import { SectionHeading } from "@/components/ui/section-heading";
import { UI_TEXT } from "@/constants/messages";
import { isAndroidApp, useReminderPermission } from "@/lib/native";

const text = UI_TEXT.settings;

/**
 * Settings' Notifications (plan §139.10; R8.6): order reminders, and the
 * device's permission for them — Android's in the Android app, the browser's
 * in the web app. Off, the row asks; refused, it says where to turn them on,
 * since only those settings can. Shown only where reminders can work: not in
 * a browser without push, nor on an iPhone before Brio is on its Home Screen.
 */
export function ReminderSettings() {
  const respond = useResponse();
  const { permission, ask } = useReminderPermission();
  if (permission === undefined || permission === "UNSUPPORTED") return null;
  const where = isAndroidApp() ? "android" : "web";

  const turnOn = async () => {
    try {
      if ((await ask()) === "ON") respond.success({ title: text.remindersOn, message: text.remindersOnBody });
    } catch (failure) {
      respond.failure(failure, { title: text.remindersNotOn });
    }
  };

  return (
    <section aria-labelledby="settings-notifications" className="space-y-3">
      <SectionHeading id="settings-notifications" title={text.notifications} />
      <RowList>
        <Row
          leading={<Medallion icon={Bell} size="sm" tone={permission === "ON" ? "primary" : "neutral"} />}
          title={text.reminders}
          subtitle={permission === "BLOCKED" ? text.remindersBlocked[where] : text.remindersHint[permission]}
          trailing={text.remindersState[permission]}
          // Why reminders are off is the point of the row: it wraps rather than lose its end.
          wrap
          onClick={permission === "OFF" ? () => void turnOn() : undefined}
        />
      </RowList>
      <p className="text-xs text-text-muted">{text.remindersNote[where]}</p>
    </section>
  );
}
