import { AppShell } from "@/components/nav/AppShell";
import { Expenses } from "@/features/expenses/components/Expenses";

export default function ExpensesPage() {
  return (
    <AppShell>
      <Expenses />
    </AppShell>
  );
}
