"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { FormSheet } from "@/components/ui/form-sheet";
import { useResponse } from "@/components/ui/response-card";
import { TextAreaField, TextField } from "@/components/ui/text-field";
import { UI_TEXT } from "@/constants/messages";
import { formatPhoneDigits } from "@/lib/phone";
import { apiRoutes } from "@/lib/query/keys";
import { useApiMutation } from "@/lib/query/useApiMutation";
import {
  createCustomerSchema,
  type CreateCustomerInput,
  type CreateCustomerPayload,
} from "@/lib/validation";

import { CustomersClient } from "../api.client";
import type { Customer } from "../types";

const EMPTY: CreateCustomerInput = {
  name: "",
  phone: "",
  email: "",
  address: "",
  googleMapsLink: "",
  notes: "",
};

/** The form fields a customer is filled in from — the record the sheet starts with, or a blank one. */
function valuesOf(customer?: Customer): CreateCustomerInput {
  if (!customer) return EMPTY;
  return {
    name: customer.name,
    // The field carries +91 itself, so it shows only the ten digits.
    phone: formatPhoneDigits(customer.phone),
    email: customer.email ?? "",
    address: customer.address ?? "",
    googleMapsLink: customer.googleMapsLink ?? "",
    notes: customer.notes ?? "",
  };
}

export function CustomerFormSheet({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Customer;
}) {
  // Kept out of the React Compiler. The sheet stays mounted and resets its form
  // each time it opens; reset() empties react-hook-form's field registry, which
  // only a fresh register() call refills, and the compiler memoises those
  // calls — so nothing typed after opening reached the form (R1.9).
  "use no memo";
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateCustomerInput, unknown, CreateCustomerPayload>({
    resolver: zodResolver(createCustomerSchema),
    defaultValues: EMPTY,
  });

  // The sheet is kept mounted between openings, so its fields are refilled each
  // time rather than keeping whatever was typed for the record before.
  useEffect(() => {
    if (isOpen) reset(valuesOf(initialData));
  }, [isOpen, initialData, reset]);

  const respond = useResponse();
  const { submit, submitting } = useApiMutation<CreateCustomerPayload, Customer>(
    (values) =>
      initialData
        ? CustomersClient.updateCustomer(initialData.id, values)
        : CustomersClient.createCustomer(values),
    {
      revalidate: [apiRoutes.customers.list],
      onSuccess: () => {
        onSuccess();
        onClose();
        respond.success({ title: UI_TEXT.outcomes.customerSaved });
      },
      // A refusal is a card over the sheet, which stays open to be put right.
      onError: (failure) =>
        respond.failure(failure, { title: UI_TEXT.outcomes.customerNotSaved, fallback: "SAVE_FAILED" }),
    },
  );

  return (
    <FormSheet
      open={isOpen}
      title={initialData ? "Edit Customer" : "New Customer"}
      onClose={onClose}
      onSubmit={handleSubmit((values) => submit(values))}
      submitLabel="Save Customer"
      submitting={submitting}
    >
      <TextField
        label="Full Name"
        required
        placeholder="e.g. Meena Gupta"
        error={errors.name?.message}
        {...register("name")}
      />
      <TextField
        label="Phone Number"
        required
        type="tel"
        inputMode="tel"
        placeholder="98765 43210"
        prefix={UI_TEXT.fields.phonePrefix}
        error={errors.phone?.message}
        {...register("phone")}
      />
      <TextField
        label="Email"
        optional
        type="email"
        placeholder="meena@example.com"
        error={errors.email?.message}
        {...register("email")}
      />
      <TextAreaField
        label="Address"
        optional
        placeholder="Delivery address..."
        error={errors.address?.message}
        {...register("address")}
      />
      <TextField
        label="Google Maps Link"
        optional
        type="url"
        placeholder="https://maps.app.goo.gl/..."
        error={errors.googleMapsLink?.message}
        {...register("googleMapsLink")}
      />
      <TextAreaField
        label="Notes"
        optional
        placeholder="Preferences, allergies..."
        error={errors.notes?.message}
        {...register("notes")}
      />
    </FormSheet>
  );
}
