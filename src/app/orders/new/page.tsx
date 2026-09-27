import { Suspense } from "react";

import { AppScreen } from "@/components/nav/AppScreen";
import { SkeletonRows } from "@/components/ui/skeleton";
import { NewOrder } from "@/features/orders/components/NewOrder";
import { getAllProducts } from "@/features/products/api";
import { apiRoutes } from "@/lib/query/keys";

/** Creating an order (plan §139.10). The step is in the address, read under Suspense. */
export default function NewOrderPage() {
  return (
    <AppScreen queries={{ [apiRoutes.products.list]: getAllProducts }}>
      <Suspense fallback={<SkeletonRows rows={3} height="h-32" />}>
        <NewOrder />
      </Suspense>
    </AppScreen>
  );
}
