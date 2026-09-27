import { AppScreen } from "@/components/nav/AppScreen";
import { Expenses } from "@/features/expenses/components/Expenses";

/** Expenses: its period is kept on the device, so its figures are read there. */
export default function ExpensesPage() {
  return (
    <AppScreen>
      <Expenses />
    </AppScreen>
  );
}
