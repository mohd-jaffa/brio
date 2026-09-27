import { Suspense } from "react";

import { AppScreen } from "@/components/nav/AppScreen";
import { SkeletonRows } from "@/components/ui/skeleton";
import { EditOrder } from "@/features/orders/components/EditOrder";
import { getOrderById } from "@/features/orders/queries";
import { getAllProducts } from "@/features/products/api";
import { apiRoutes } from "@/lib/query/keys";

/** Changing an open order (plan §139.11.13). The step is in the address, read under Suspense. */
export default async function EditOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <AppScreen
      queries={{
        [apiRoutes.orders.detail(id)]: (tenant) => getOrderById(tenant, id),
        [apiRoutes.products.list]: getAllProducts,
      }}
    >
      <Suspense fallback={<SkeletonRows rows={3} height="h-32" />}>
        <EditOrder id={id} />
      </Suspense>
    </AppScreen>
  );
}
