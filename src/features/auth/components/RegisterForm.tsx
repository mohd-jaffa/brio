"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, Building2, Lock, Mail, Quote, Smartphone, Store, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { useForm, type FieldErrors } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { useResponse } from "@/components/ui/response-card";
import { TextAreaField, TextField } from "@/components/ui/text-field";
import { UI_TEXT } from "@/constants/messages";
import { AUTH_ROUTES } from "@/constants/routes";
import { ApiError } from "@/lib/api/client";
import { useApiMutation } from "@/lib/query/useApiMutation";
import { registerSchema, type RegisterInput, type RegisterPayload } from "@/lib/validation";

import { AuthClient, type RegisteredAccount } from "../api.client";
import { PasswordField } from "./PasswordField";

const EMPTY: RegisterInput = {
  name: "",
  phone: "",
  email: "",
  password: "",
  confirmPassword: "",
  businessName: "",
  tagline: "",
  city: "",
  address: "",
};

/** Which fields each step asks for (plan §139.10): you, then your business. */
const STEPS = [
  { title: UI_TEXT.auth.stepYou, fields: ["name", "phone", "email", "password", "confirmPassword"] },
  { title: UI_TEXT.auth.stepBusiness, fields: ["businessName", "tagline", "city", "address"] },
] as const satisfies ReadonlyArray<{ title: string; fields: ReadonlyArray<keyof RegisterInput> }>;

/** A refusal about a field on the first step sends the person back to it. */
const TAKEN = { AUTH_PHONE_ALREADY_EXISTS: "phone", AUTH_EMAIL_ALREADY_EXISTS: "email" } as const;

/**
 * Creating an account (plan §7, §139.11.2), in two short steps sent as one
 * request, so a half-finished sign-up never creates an account. Each step is
 * checked before the next is shown; the server checks the whole of it again.
 * Registration deliberately does not sign anyone in: a confirmation email is
 * on its way, and the next step is to sign in with the number and password
 * chosen here.
 *
 * Both steps stay mounted and the other is hidden, so nothing typed is lost
 * going back and forth — and no field is registered twice.
 */
export function RegisterForm() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const headings = useRef<Array<HTMLHeadingElement | null>>([]);
  const moved = useRef(false);
  const ids = [useId(), useId()];

  const {
    register,
    handleSubmit,
    trigger,
    setError,
    formState: { errors },
  } = useForm<RegisterInput, unknown, RegisterPayload>({
    resolver: zodResolver(registerSchema),
    defaultValues: EMPTY,
  });

  // A new step is announced by moving to its heading — but not on arrival.
  useEffect(() => {
    if (moved.current) headings.current[step]?.focus();
  }, [step]);

  const goTo = (next: number) => {
    moved.current = true;
    setStep(next);
  };

  const respond = useResponse();
  const { submit, submitting } = useApiMutation<RegisterPayload, RegisteredAccount>(AuthClient.register, {
    onSuccess: () => {
      // The card outlives the move: the provider sits above every route.
      respond.success({ title: UI_TEXT.outcomes.accountCreated, message: UI_TEXT.auth.accountCreated });
      router.replace(AUTH_ROUTES.signIn);
    },
    onError: (failure) => {
      const field = failure instanceof ApiError && failure.code in TAKEN ? TAKEN[failure.code as keyof typeof TAKEN] : null;
      if (field) {
        setError(field, { message: failure instanceof ApiError ? failure.message : undefined });
        goTo(0);
      }
      respond.failure(failure, { title: UI_TEXT.outcomes.accountNotCreated, fallback: "AUTH_REGISTRATION_FAILED" });
    },
  });

  const next = async () => {
    if (await trigger([...STEPS[0].fields], { shouldFocus: true })) goTo(1);
  };

  // Anything wrong on the first step, found only at the end, is shown there.
  const onInvalid = (invalid: FieldErrors<RegisterInput>) => {
    if (STEPS[0].fields.some((field) => field in invalid)) goTo(0);
  };

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(event) => {
        // Enter on the first step means Next, not Create account.
        if (step === 0) {
          event.preventDefault();
          void next();
          return;
        }
        void handleSubmit((values) => submit(values), onInvalid)(event);
      }}
    >
      <div className="space-y-2">
        <p aria-live="polite" className="text-xs font-semibold uppercase tracking-wider text-text-muted">
          {UI_TEXT.auth.stepOf(step + 1, STEPS.length)}
        </p>
        <div aria-hidden="true" className="flex gap-1.5">
          {STEPS.map((_, index) => (
            <span key={index} className={cn("h-1 flex-1 rounded-full", index <= step ? "bg-primary" : "bg-border")} />
          ))}
        </div>
      </div>

      {STEPS.map(({ title }, index) => (
        <fieldset key={title} hidden={step !== index} aria-labelledby={ids[index]} className="space-y-4">
          <h2
            id={ids[index]}
            ref={(element) => {
              headings.current[index] = element;
            }}
            tabIndex={-1}
            className="font-heading text-xl font-medium text-text outline-none"
          >
            {title}
          </h2>

          {index === 0 ? (
            <>
              <TextField
                label={UI_TEXT.auth.nameLabel}
                autoComplete="name"
                placeholder={UI_TEXT.auth.namePlaceholder}
                required
                leading={<User size={18} strokeWidth={1.8} />}
                error={errors.name?.message}
                {...register("name")}
              />
              <TextField
                label={UI_TEXT.auth.phoneLabel}
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                placeholder={UI_TEXT.fields.phonePlaceholder}
                hint={UI_TEXT.auth.phoneSignInHint}
                required
                leading={<Smartphone size={18} strokeWidth={1.8} />}
                prefix={UI_TEXT.fields.phonePrefix}
                error={errors.phone?.message}
                {...register("phone")}
              />
              <TextField
                label={UI_TEXT.auth.emailLabel}
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder={UI_TEXT.auth.emailPlaceholder}
                hint={UI_TEXT.auth.emailHint}
                required
                leading={<Mail size={18} strokeWidth={1.8} />}
                error={errors.email?.message}
                {...register("email")}
              />
              <PasswordField
                label={UI_TEXT.auth.passwordLabel}
                autoComplete="new-password"
                placeholder={UI_TEXT.auth.newPasswordPlaceholder}
                hint={UI_TEXT.auth.passwordHint}
                required
                leading={<Lock size={18} strokeWidth={1.8} />}
                error={errors.password?.message}
                {...register("password")}
              />
              <PasswordField
                label={UI_TEXT.auth.confirmPasswordLabel}
                autoComplete="new-password"
                placeholder={UI_TEXT.auth.confirmPasswordPlaceholder}
                required
                leading={<Lock size={18} strokeWidth={1.8} />}
                error={errors.confirmPassword?.message}
                {...register("confirmPassword")}
              />
              <Button
                variant="action"
                size="lg"
                shape="pill"
                fullWidth
                icon={ArrowRight}
                iconPosition="end"
                label={UI_TEXT.auth.next}
                onClick={() => void next()}
              />
            </>
          ) : (
            <>
              <TextField
                label={UI_TEXT.auth.businessNameLabel}
                autoComplete="organization"
                placeholder={UI_TEXT.auth.businessNamePlaceholder}
                required
                leading={<Store size={18} strokeWidth={1.8} />}
                error={errors.businessName?.message}
                {...register("businessName")}
              />
              <TextField
                label={UI_TEXT.business.tagline}
                optional
                placeholder={UI_TEXT.business.taglinePlaceholder}
                leading={<Quote size={18} strokeWidth={1.8} />}
                error={errors.tagline?.message}
                {...register("tagline")}
              />
              <TextField
                label={UI_TEXT.business.city}
                autoComplete="address-level2"
                placeholder={UI_TEXT.auth.cityPlaceholder}
                required
                leading={<Building2 size={18} strokeWidth={1.8} />}
                error={errors.city?.message}
                {...register("city")}
              />
              <TextAreaField
                label={UI_TEXT.business.address}
                autoComplete="street-address"
                placeholder={UI_TEXT.auth.addressPlaceholder}
                required
                error={errors.address?.message}
                {...register("address")}
              />
              <div className="flex flex-col-reverse gap-3 sm:flex-row">
                <Button
                  variant="secondary"
                  size="lg"
                  shape="pill"
                  icon={ArrowLeft}
                  label={UI_TEXT.auth.back}
                  onClick={() => goTo(0)}
                />
                <div className="flex-1">
                  <Button
                    type="submit"
                    variant="action"
                    size="lg"
                    shape="pill"
                    fullWidth
                    loading={submitting}
                    icon={ArrowRight}
                    iconPosition="end"
                    label={submitting ? UI_TEXT.auth.creatingAccount : UI_TEXT.auth.createAccount}
                  />
                </div>
              </div>
            </>
          )}
        </fieldset>
      ))}
    </form>
  );
}
