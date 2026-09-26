import { AppShell } from "@/components/nav/AppShell";
import { Inventory } from "@/features/inventory/components/Inventory";

export default function InventoryPage() {
  return (
    <AppShell>
      <Inventory />
    </AppShell>
  );
}
