"use client";

import { Suspense } from "react";

import { AppShell } from "@/components/nav/AppShell";
import { SkeletonRows } from "@/components/ui/skeleton";
import { NewOrder } from "@/features/orders/components/NewOrder";

/** Creating an order (plan §139.10). The step is in the address, read under Suspense. */
export default function NewOrderPage() {
  return (
    <AppShell>
      <Suspense fallback={<SkeletonRows rows={3} height="h-32" />}>
        <NewOrder />
      </Suspense>
    </AppShell>
  );
}
