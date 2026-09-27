import { AppScreen } from "@/components/nav/AppScreen";
import { Analytics } from "@/features/analytics/components/Analytics";

/** Analytics: its period is kept on the device, so its figures are read there. */
export default function AnalyticsPage() {
  return (
    <AppScreen>
      <Analytics />
    </AppScreen>
  );
}
