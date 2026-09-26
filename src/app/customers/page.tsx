import { AppShell } from "@/components/nav/AppShell";
import { Customers } from "@/features/customers/components/Customers";

export default function CustomersPage() {
  return (
    <AppShell>
      <Customers />
    </AppShell>
  );
}
