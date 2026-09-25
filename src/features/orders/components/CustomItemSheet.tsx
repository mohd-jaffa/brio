"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { FormSheet } from "@/components/ui/form-sheet";
import { TextField } from "@/components/ui/text-field";
import { UI_TEXT } from "@/constants/messages";
import { customItemFormSchema, type CustomItemFormPayload, type CustomItemFormValues } from "@/lib/validation";

const EMPTY: CustomItemFormValues = {
  name: "",
  description: "",
  unitPrice: "",
};

/**
 * A special request the catalogue does not cover (plan §139.11.7): its name,
 * a description if one is needed — printed under it on the bill — and the
 * price of one. The quantity starts at 1 and is set with the stepper like any
 * other line. It moves no stock.
 */
export function CustomItemSheet({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (item: CustomItemFormPayload) => void;
}) {
  // Kept out of the React Compiler, as every sheet with a reset form is:
  // reset() empties the field registry, and the compiler memoises the
  // register() calls that refill it (R1.9).
  "use no memo";
  const text = UI_TEXT.newOrder;
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CustomItemFormValues, unknown, CustomItemFormPayload>({
    resolver: zodResolver(customItemFormSchema),
    defaultValues: EMPTY,
  });

  // Emptied as it closes rather than as it opens, so an opening can never
  // clear what is already being typed.
  const close = () => {
    reset(EMPTY);
    onClose();
  };

  return (
    <FormSheet
      open={open}
      title={text.customItemTitle}
      onClose={close}
      onSubmit={handleSubmit((item) => {
        onAdd(item);
        close();
      })}
      submitLabel={text.customItem}
    >
      <TextField
        label={text.customItemName}
        required
        placeholder={text.customItemNamePlaceholder}
        error={errors.name?.message}
        {...register("name")}
      />
      <TextField
        label={text.customItemDescription}
        optional
        hint={text.customItemDescriptionHint}
        error={errors.description?.message}
        {...register("description")}
      />
      <TextField
        label={text.customItemAmount}
        required
        inputMode="decimal"
        hint={text.customItemAmountHint}
        error={errors.unitPrice?.message}
        {...register("unitPrice")}
      />
    </FormSheet>
  );
}
