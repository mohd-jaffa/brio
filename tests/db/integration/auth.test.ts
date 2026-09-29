import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { login, register } from "@/features/auth/api";
import { createSupabaseAnonClient, createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/validation";
import {
  aMobileNumber,
  registerBusiness,
  registration,
  removeBusinesses,
  type TestBusiness,
} from "@tests/support/integration";

/**
 * Registering and signing in, against the database (plan §121 "Authentication";
 * AGENTS §9): what `POST /api/auth/register` and `/login` do, with the real
 * Supabase Auth and the real policies behind them.
 */
let owner: TestBusiness;

beforeAll(async () => {
  owner = await registerBusiness("Auth Bakes");
});

afterAll(removeBusinesses);

describe("registering", () => {
  it("makes the sign-in, the owner's profile and the business, joined up", async () => {
    const { data: profile, error } = await owner.tenant.supabase
      .from("profiles")
      .select("id, role, bakery_id, email")
      .single();
    expect(error).toBeNull();
    expect(profile).toEqual({ id: owner.userId, role: "USER", bakery_id: owner.bakeryId, email: owner.email });

    const { data: business } = await owner.tenant.supabase
      .from("bakeries")
      .select("id, business_name, owner_id")
      .single();
    expect(business).toEqual({ id: owner.bakeryId, business_name: "Auth Bakes", owner_id: owner.userId });
  });

  it("will not give a mobile number or an email to a second account", async () => {
    const admin = createSupabaseServiceRoleClient();
    await expect(register(admin, registration({ phone: owner.phone }))).rejects.toMatchObject({
      code: "AUTH_PHONE_ALREADY_EXISTS",
    });
    await expect(register(admin, registration({ email: owner.email }))).rejects.toMatchObject({
      code: "AUTH_EMAIL_ALREADY_EXISTS",
    });
  });
});

describe("signing in", () => {
  it("signs in by mobile number and password", async () => {
    const session = await login(
      createSupabaseAnonClient(),
      loginSchema.parse({ phone: owner.phone, password: owner.password }),
    );
    expect(session.profile).toMatchObject({ id: owner.userId, bakeryId: owner.bakeryId, role: "USER" });
    expect(session.accessToken).toEqual(expect.any(String));
  });

  it("gives one answer for a wrong password and for a number with no account", async () => {
    for (const credentials of [
      { phone: owner.phone, password: "not the password" },
      { phone: aMobileNumber(), password: owner.password },
    ]) {
      await expect(login(createSupabaseAnonClient(), loginSchema.parse(credentials))).rejects.toMatchObject({
        code: "AUTH_INVALID_CREDENTIALS",
      });
    }
  });

  it("lets an owner change nothing that decides what they may do: not their role, not their business", async () => {
    await owner.tenant.supabase.from("profiles").update({ role: "DEV" }).eq("id", owner.userId);
    await owner.tenant.supabase.from("profiles").update({ bakery_id: null }).eq("id", owner.userId);
    const { data } = await createSupabaseServiceRoleClient()
      .from("profiles")
      .select("role, bakery_id")
      .eq("id", owner.userId)
      .single();
    expect(data).toEqual({ role: "USER", bakery_id: owner.bakeryId });
  });
});
