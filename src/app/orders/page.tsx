import { AppShell } from "@/components/nav/AppShell";
import { Orders } from "@/features/orders/components/Orders";

export default function OrdersPage() {
  return (
    <AppShell>
      <Orders />
    </AppShell>
  );
}
