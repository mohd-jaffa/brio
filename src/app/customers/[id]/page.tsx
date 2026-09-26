import { AppShell } from "@/components/nav/AppShell";
import { CustomerDetail } from "@/features/customers/components/CustomerDetail";

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <AppShell>
      <CustomerDetail id={id} />
    </AppShell>
  );
}
