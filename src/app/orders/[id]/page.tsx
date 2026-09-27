import { AppScreen } from "@/components/nav/AppScreen";
import { OrderDetail } from "@/features/orders/components/OrderDetail";
import { getOrderById } from "@/features/orders/queries";
import { findPaymentsByOrderId } from "@/features/payments/api";
import { apiRoutes } from "@/lib/query/keys";

/** One order (plan §139.10). */
export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <AppScreen
      queries={{
        [apiRoutes.orders.detail(id)]: (tenant) => getOrderById(tenant, id),
        [apiRoutes.orders.payments(id)]: (tenant) => findPaymentsByOrderId(tenant, id),
      }}
    >
      <OrderDetail id={id} />
    </AppScreen>
  );
}
