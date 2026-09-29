import * as z from "zod";
import { internalError } from "@/lib/errors";

const optionalString = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().trim().min(1).optional(),
);

const optionalPort = z.preprocess(
  (value) => (value === "" || value === undefined ? undefined : Number(value)),
  z.number().int().min(1).max(65535).optional(),
);

const optionalBoolean = z.preprocess(
  (value) => {
    if (value === "" || value === undefined) return undefined;
    if (value === "true" || value === true) return true;
    if (value === "false" || value === false) return false;
    return value;
  },
  z.boolean().optional(),
);

const serverEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  SMTP_HOST: optionalString,
  SMTP_PORT: optionalPort,
  SMTP_USER: optionalString,
  SMTP_PASSWORD: optionalString,
  SMTP_FROM: optionalString,
  SMTP_SECURE: optionalBoolean,

  // The address people write to about their account and their data; the
  // privacy policy names it (R8.10).
  SUPPORT_EMAIL: z.preprocess((value) => (value === "" ? undefined : value), z.string().trim().email().optional()),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function getServerEnv(source: NodeJS.ProcessEnv = process.env): ServerEnv {
  // Operators read these, not customers: keep Zod's own detail here, ahead of
  // the app-wide catalogue wording set in src/lib/validation/primitives.ts.
  const parsed = serverEnvSchema.safeParse(source, { error: (issue) => z.config().localeError?.(issue) });

  if (!parsed.success) {
    throw internalError(
      "CONFIG_INVALID",
      parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    );
  }

  return parsed.data;
}

/**
 * The address the privacy policy gives for questions about data (R8.10):
 * `SUPPORT_EMAIL`, else the address Brio's emails are sent from, which is a
 * mailbox that can be written back to. Null when neither is set.
 */
export function supportEmail(env: ServerEnv = getServerEnv()): string | null {
  if (env.SUPPORT_EMAIL) return env.SUPPORT_EMAIL;
  const from = env.SMTP_FROM?.match(/<([^>]+)>/)?.[1] ?? env.SMTP_FROM;
  return from?.includes("@") ? from.trim() : null;
}
