import { AppScreen } from "@/components/nav/AppScreen";
import { Settings } from "@/features/auth/components/Settings";

/** Settings (plan §139.10, R5.11). */
export default function SettingsPage() {
  return (
    <AppScreen>
      <Settings />
    </AppScreen>
  );
}
