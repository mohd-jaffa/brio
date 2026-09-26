import { AppShell } from "@/components/nav/AppShell";
import { Home } from "@/features/dashboard/components/Home";

export default function HomePage() {
  return (
    <AppShell>
      <Home />
    </AppShell>
  );
}
