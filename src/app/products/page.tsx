import { AppScreen } from "@/components/nav/AppScreen";
import { Products } from "@/features/products/components/Products";
import { getAllProducts } from "@/features/products/api";
import { apiRoutes } from "@/lib/query/keys";

export default function ProductsPage() {
  return (
    <AppScreen queries={{ [apiRoutes.products.list]: getAllProducts }}>
      <Products />
    </AppScreen>
  );
}
