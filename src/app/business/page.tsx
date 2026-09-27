import { AppScreen } from "@/components/nav/AppScreen";
import { PageHeader } from "@/components/ui/page-header";
import { UI_TEXT } from "@/constants/messages";
import { BusinessDetails } from "@/features/business/components/BusinessDetails";

export default function BusinessPage() {
  return (
    <AppScreen>
      <PageHeader title={UI_TEXT.business.title} subtitle={UI_TEXT.business.subtitle} />
      <BusinessDetails />
    </AppScreen>
  );
}
