import { AppScreen } from "@/components/nav/AppScreen";
import { routeQuery } from "@/features/auth/session.server";
import { Orders } from "@/features/orders/components/Orders";
import { countOrders, listOrders } from "@/features/orders/list";
import { apiRoutes } from "@/lib/query/keys";
import { orderCountsQuerySchema, orderListQuerySchema } from "@/lib/validation";

export default function OrdersPage() {
  return (
    <AppScreen
      pages={{
        [apiRoutes.orders.list]: (tenant) =>
          listOrders(tenant, routeQuery(apiRoutes.orders.list, orderListQuerySchema)),
      }}
      queries={{
        [apiRoutes.orders.counts]: (tenant) =>
          countOrders(tenant, routeQuery(apiRoutes.orders.counts, orderCountsQuerySchema)),
      }}
    >
      <Orders />
    </AppScreen>
  );
}
