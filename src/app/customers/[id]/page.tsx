import { AppScreen } from "@/components/nav/AppScreen";
import { routeQuery } from "@/features/auth/session.server";
import { getCustomerById, getCustomerSummary } from "@/features/customers/api";
import { CustomerDetail } from "@/features/customers/components/CustomerDetail";
import { listOrders } from "@/features/orders/list";
import { apiRoutes, withQuery } from "@/lib/query/keys";
import { orderListQuerySchema } from "@/lib/validation";

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const orders = withQuery(apiRoutes.orders.list, { customer: id });
  return (
    <AppScreen
      queries={{
        [apiRoutes.customers.detail(id)]: (tenant) => getCustomerById(tenant, id),
        [apiRoutes.customers.summary(id)]: (tenant) => getCustomerSummary(tenant, id),
      }}
      pages={{ [orders]: (tenant) => listOrders(tenant, routeQuery(orders, orderListQuerySchema)) }}
    >
      <CustomerDetail id={id} />
    </AppScreen>
  );
}
