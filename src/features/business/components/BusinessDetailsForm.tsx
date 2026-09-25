"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useId } from "react";
import { useForm, useWatch } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { useResponse } from "@/components/ui/response-card";
import { TextAreaField, TextField } from "@/components/ui/text-field";
import { UI_TEXT } from "@/constants/messages";
import { formatPhoneDigits } from "@/lib/phone";
import { apiRoutes } from "@/lib/query/keys";
import { useApiMutation } from "@/lib/query/useApiMutation";
import {
  businessProfileSchema,
  type BusinessProfileInput,
  type BusinessProfilePayload,
} from "@/lib/validation";

import { BusinessClient } from "../api.client";
import type { BusinessProfile } from "../types";
import { BillHeaderPreview } from "./BillHeaderPreview";
import { LogoField } from "./LogoField";

/** The form's fields, filled from the saved profile. */
function valuesOf(business: BusinessProfile): BusinessProfileInput {
  return {
    name: business.name,
    tagline: business.tagline ?? "",
    city: business.city ?? "",
    address: business.address ?? "",
    // The field carries +91 itself, so it shows only the ten digits.
    phone: formatPhoneDigits(business.phone),
  };
}

/**
 * Business details (plan §139.10): the name, catch phrase, city, address and
 * business phone, the logo, and a live preview of the bill's header beside
 * them on a wide screen and beneath them on a phone.
 */
export function BusinessDetailsForm({ business }: { business: BusinessProfile }) {
  const formId = useId();
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<BusinessProfileInput, unknown, BusinessProfilePayload>({
    resolver: zodResolver(businessProfileSchema),
    defaultValues: valuesOf(business),
  });
  const typed = useWatch({ control });

  const respond = useResponse();
  const save = useApiMutation<BusinessProfilePayload, BusinessProfile>(BusinessClient.update, {
    revalidate: [apiRoutes.business.profile],
    onSuccess: () => respond.success({ title: UI_TEXT.outcomes.businessSaved }),
    onError: (failure) =>
      respond.failure(failure, { title: UI_TEXT.outcomes.businessNotSaved, fallback: "SAVE_FAILED" }),
  });

  const text = UI_TEXT.business;
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
      <div className="min-w-0 space-y-6">
        <form
          id={formId}
          aria-label={text.title}
          onSubmit={handleSubmit((values) => save.submit(values))}
          noValidate
          className="space-y-4 rounded-3xl border border-border bg-surface p-5 shadow-card md:p-6"
        >
          <TextField label={text.name} required autoComplete="organization" error={errors.name?.message} {...register("name")} />
          <TextField
            label={text.tagline}
            optional
            placeholder={text.taglinePlaceholder}
            error={errors.tagline?.message}
            {...register("tagline")}
          />
          <TextField label={text.city} required autoComplete="address-level2" error={errors.city?.message} {...register("city")} />
          <TextAreaField label={text.address} required autoComplete="street-address" error={errors.address?.message} {...register("address")} />
          <TextField
            label={text.phone}
            required
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            prefix={UI_TEXT.fields.phonePrefix}
            hint={text.phoneHint}
            error={errors.phone?.message}
            {...register("phone")}
          />
          <Button type="submit" label={text.save} loading={save.submitting} />
        </form>

        <LogoField logoUrl={business.logoUrl} />
      </div>

      <div className="lg:sticky lg:top-24">
        <BillHeaderPreview {...typed} logoUrl={business.logoUrl} />
      </div>
    </div>
  );
}
