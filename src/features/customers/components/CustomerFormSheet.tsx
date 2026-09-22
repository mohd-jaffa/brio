"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { FormSheet } from "@/components/ui/form-sheet";
import { TextAreaField, TextField } from "@/components/ui/text-field";
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
    phone: customer.phone,
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

  const { submit, submitting, error } = useApiMutation<CreateCustomerPayload, Customer>(
    (values) =>
      initialData
        ? CustomersClient.updateCustomer(initialData.id, values)
        : CustomersClient.createCustomer(values),
    {
      revalidate: [apiRoutes.customers.list],
      onSuccess: () => {
        onSuccess();
        onClose();
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
      error={error}
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
        placeholder="e.g. +91 9876543210"
        error={errors.phone?.message}
        {...register("phone")}
      />
      <TextField
        label="Email"
        type="email"
        placeholder="meena@example.com"
        error={errors.email?.message}
        {...register("email")}
      />
      <TextAreaField
        label="Address"
        placeholder="Delivery address..."
        error={errors.address?.message}
        {...register("address")}
      />
      <TextField
        label="Google Maps Link"
        type="url"
        placeholder="https://maps.app.goo.gl/..."
        error={errors.googleMapsLink?.message}
        {...register("googleMapsLink")}
      />
      <TextAreaField
        label="Notes"
        placeholder="Preferences, allergies..."
        error={errors.notes?.message}
        {...register("notes")}
      />
    </FormSheet>
  );
}
