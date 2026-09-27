import { AppScreen } from "@/components/nav/AppScreen";
import { GuestSales } from "@/features/customers/components/GuestSales";

/** Guest sales: its period is kept on the device, so its figures are read there. */
export default function GuestSalesPage() {
  return (
    <AppScreen>
      <GuestSales />
    </AppScreen>
  );
}
