"use client";

import { Button } from "@/components/ui/button";
import { ScreenNotice } from "@/components/ui/screen-notice";
import { SkeletonRows } from "@/components/ui/skeleton";
import { UI_TEXT } from "@/constants/messages";
import { errorMessage } from "@/lib/errors/errorMessage";

import { useBusiness } from "../hooks/useBusiness";
import { BusinessDetailsForm } from "./BusinessDetailsForm";

/** The Business details screen's body: the form once the profile is here. */
export function BusinessDetails() {
  const business = useBusiness();

  if (business.data) return <BusinessDetailsForm business={business.data} />;

  if (business.error) {
    return (
      <section className="space-y-4">
        <ScreenNotice>{errorMessage(business.error, "BUSINESS_LOAD_FAILED")}</ScreenNotice>
        <Button
          label={UI_TEXT.actions.retry}
          variant="secondary"
          loading={business.isValidating}
          onClick={() => business.mutate()}
        />
      </section>
    );
  }

  return (
    <section aria-busy="true">
      <SkeletonRows />
    </section>
  );
}
