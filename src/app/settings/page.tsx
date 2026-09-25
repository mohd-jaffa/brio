"use client";

import { Store } from "lucide-react";

import { AppShell } from "@/components/nav/AppShell";
import { Medallion } from "@/components/ui/medallion";
import { PageHeader } from "@/components/ui/page-header";
import { Row, RowList } from "@/components/ui/row";
import { UI_TEXT } from "@/constants/messages";
import { AccountSummary } from "@/features/auth/components/AccountSummary";

/**
 * Settings. The business's name, catch phrase, address and logo are edited on
 * Business details (R2.6, R2.7); this screen points there. Appearance, About
 * and the rest of the plan's Settings arrive with R5.11.
 */
export default function SettingsPage() {
  return (
    <AppShell>
      <PageHeader title="Settings" subtitle="Manage your business profile and preferences" />

      <RowList>
        <Row
          href="/business"
          leading={<Medallion icon={Store} size="sm" />}
          title={UI_TEXT.business.settingsRow}
          subtitle={UI_TEXT.business.settingsRowHint}
        />
      </RowList>

      <AccountSummary />
    </AppShell>
  );
}
