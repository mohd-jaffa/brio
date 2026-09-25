"use client";

import { use } from "react";

import { AppShell } from "@/components/nav/AppShell";
import { OrderDetail } from "@/features/orders/components/OrderDetail";

/** One order (plan §139.10). */
export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <AppShell>
      <OrderDetail id={id} />
    </AppShell>
  );
}
