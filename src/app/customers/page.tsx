import { AppScreen } from "@/components/nav/AppScreen";
import { routeQuery } from "@/features/auth/session.server";
import { listCustomers } from "@/features/customers/api";
import { Customers } from "@/features/customers/components/Customers";
import { apiRoutes } from "@/lib/query/keys";
import { customerListQuerySchema } from "@/lib/validation";

export default function CustomersPage() {
  return (
    <AppScreen
      pages={{
        [apiRoutes.customers.list]: (tenant) =>
          listCustomers(tenant, routeQuery(apiRoutes.customers.list, customerListQuerySchema)),
      }}
    >
      <Customers />
    </AppScreen>
  );
}
