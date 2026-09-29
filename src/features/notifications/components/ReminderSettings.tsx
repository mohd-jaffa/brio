"use client";

import { Bell } from "lucide-react";

import { Medallion } from "@/components/ui/medallion";
import { useResponse } from "@/components/ui/response-card";
import { Row, RowList } from "@/components/ui/row";
import { SectionHeading } from "@/components/ui/section-heading";
import { UI_TEXT } from "@/constants/messages";
import { useReminderPermission } from "@/lib/native";

const text = UI_TEXT.settings;

/**
 * Settings' Notifications (plan §139.10; R8.6): the Android app's order
 * reminders, and Android's permission for them. Off, the row asks Android;
 * refused there, it says where to turn them on, since only Android's settings
 * can. Shown in the Android app only: a browser has nothing to turn on.
 */
export function ReminderSettings() {
  const respond = useResponse();
  const { permission, ask } = useReminderPermission();
  if (permission === undefined || permission === "UNSUPPORTED") return null;

  const turnOn = async () => {
    if ((await ask()) === "ON") respond.success({ title: text.remindersOn, message: text.remindersOnBody });
  };

  return (
    <section aria-labelledby="settings-notifications" className="space-y-3">
      <SectionHeading id="settings-notifications" title={text.notifications} />
      <RowList>
        <Row
          leading={<Medallion icon={Bell} size="sm" tone={permission === "ON" ? "primary" : "neutral"} />}
          title={text.reminders}
          subtitle={text.remindersHint[permission]}
          trailing={text.remindersState[permission]}
          onClick={permission === "OFF" ? () => void turnOn() : undefined}
        />
      </RowList>
      <p className="text-xs text-text-muted">{text.remindersNote}</p>
    </section>
  );
}
