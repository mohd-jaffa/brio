import { AppScreen } from "@/components/nav/AppScreen";
import { routeQuery } from "@/features/auth/session.server";
import { getDashboard } from "@/features/dashboard/api";
import { Home } from "@/features/dashboard/components/Home";
import { apiRoutes } from "@/lib/query/keys";
import { dashboardQuerySchema } from "@/lib/validation";

export default function HomePage() {
  return (
    <AppScreen
      queries={{
        [apiRoutes.dashboard]: (tenant) => getDashboard(tenant, routeQuery(apiRoutes.dashboard, dashboardQuerySchema)),
      }}
    >
      <Home />
    </AppScreen>
  );
}
