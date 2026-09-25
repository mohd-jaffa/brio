"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { FormSheet } from "@/components/ui/form-sheet";
import { useResponse } from "@/components/ui/response-card";
import { TextAreaField, TextField } from "@/components/ui/text-field";
import { UI_TEXT } from "@/constants/messages";
import { useOpeningKey } from "@/hooks/useOpeningKey";
import { ApiError } from "@/lib/api/client";
import { formatPhoneDigits } from "@/lib/phone";
import { apiRoutes } from "@/lib/query/keys";
import { useApiMutation } from "@/lib/query/useApiMutation";
import { createCustomerSchema, type CreateCustomerInput, type CreateCustomerPayload } from "@/lib/validation";

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

/** Who already has the number, when that is why the customer was not saved. */
function phoneHolder(failure: unknown): { customerId: string; name: string; requestId?: string } | null {
  if (!(failure instanceof ApiError) || failure.code !== "CUSTOMER_PHONE_ALREADY_EXISTS") return null;
  const details = failure.details as { customerId?: unknown; name?: unknown } | undefined;
  return typeof details?.customerId === "string" && typeof details.name === "string"
    ? { customerId: details.customerId, name: details.name, requestId: failure.requestId }
    : null;
}

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

function CustomerForm({
  isOpen,
  onClose,
  onSuccess,
  onUseExisting,
  initialData,
}: {
  isOpen: boolean;
  onClose: () => void;
  /** Gets the customer as saved — the order screen selects them (§139.11.4). */
  onSuccess: (customer: Customer) => void;
  /**
   * Offered when the number already belongs to a customer: **Use that
   * customer** hands their id here (plan §139.6). Without it, the refusal is
   * shown as it is.
   */
  onUseExisting?: (customerId: string) => void;
  initialData?: Customer;
}) {
  // Kept out of the React Compiler, as every react-hook-form sheet is (R1.9).
  "use no memo";
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateCustomerInput, unknown, CreateCustomerPayload>({
    resolver: zodResolver(createCustomerSchema),
    defaultValues: valuesOf(initialData),
  });


  const respond = useResponse();
  const { submit, submitting } = useApiMutation<CreateCustomerPayload, Customer>(
    (values) =>
      initialData ? CustomersClient.updateCustomer(initialData.id, values) : CustomersClient.createCustomer(values),
    {
      revalidate: [apiRoutes.customers.list],
      onSuccess: (customer) => {
        onSuccess(customer);
        onClose();
        respond.success({ title: UI_TEXT.outcomes.customerSaved });
      },
      // A refusal is a card over the sheet, which stays open to be put right.
      onError: (failure) => {
        const holder = phoneHolder(failure);
        if (holder && onUseExisting) {
          respond.error({
            title: UI_TEXT.outcomes.customerNotSaved,
            message: UI_TEXT.outcomes.phoneTakenBy(holder.name),
            requestId: holder.requestId,
            primary: {
              label: UI_TEXT.outcomes.useThatCustomer,
              onClick: () => {
                onUseExisting(holder.customerId);
                onClose();
              },
            },
            secondary: { label: UI_TEXT.outcomes.edit },
          });
          return;
        }
        respond.failure(failure, { title: UI_TEXT.outcomes.customerNotSaved, fallback: "SAVE_FAILED" });
      },
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
        inputMode="numeric"
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
        label={UI_TEXT.fields.mapLink}
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

/**
 * A fresh form for each opening (src/hooks/useOpeningKey.ts), filled from the
 * record the moment it shows. It used to reset itself in an effect as it
 * opened, which wiped what was already typed when the effect landed late.
 */
export function CustomerFormSheet(props: Parameters<typeof CustomerForm>[0]) {
  const opening = useOpeningKey(props.isOpen);
  return <CustomerForm key={opening} {...props} />;
}
