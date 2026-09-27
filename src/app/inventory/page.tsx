import { AppScreen } from "@/components/nav/AppScreen";
import { getInventoryBalances } from "@/features/inventory/api";
import { Inventory } from "@/features/inventory/components/Inventory";
import { getAllProducts } from "@/features/products/api";
import { apiRoutes } from "@/lib/query/keys";

export default function InventoryPage() {
  return (
    <AppScreen
      queries={{
        [apiRoutes.products.list]: getAllProducts,
        [apiRoutes.inventory.balances()]: (tenant) => getInventoryBalances(tenant, undefined),
      }}
    >
      <Inventory />
    </AppScreen>
  );
}
