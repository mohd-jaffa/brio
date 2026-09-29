import * as z from "zod";
import { internalError } from "@/lib/errors";

const optionalString = z.preprocess((value) => (value === "" ? undefined : value), z.string().trim().min(1).optional());

const optionalPort = z.preprocess(
  (value) => (value === "" || value === undefined ? undefined : Number(value)),
  z.number().int().min(1).max(65535).optional(),
);

const optionalBoolean = z.preprocess((value) => {
  if (value === "" || value === undefined) return undefined;
  if (value === "true" || value === true) return true;
  if (value === "false" || value === false) return false;
  return value;
}, z.boolean().optional());

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

  // Web push (R8.6): the app's VAPID key pair, and who the push services may
  // write to about it (a mailto: or https: address; SUPPORT_EMAIL otherwise).
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: optionalString,
  VAPID_PRIVATE_KEY: optionalString,
  VAPID_SUBJECT: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z
      .string()
      .trim()
      .regex(/^(mailto:|https:\/\/)\S+$/)
      .optional(),
  ),
  // What the database's scheduler sends to `POST /api/cron/due-orders`.
  CRON_SECRET: z.preprocess((value) => (value === "" ? undefined : value), z.string().trim().min(32).optional()),

  // App Links (R8.5): the SHA-256 fingerprints of the keys the Android app is
  // signed with, comma-separated — Play's app signing key, and the upload key
  // for a build installed by hand. None, and the site vouches for no app.
  ANDROID_CERT_FINGERPRINTS: z.preprocess(
    (value) =>
      typeof value === "string"
        ? value
            .split(",")
            .map((part) => part.trim().toUpperCase())
            .filter(Boolean)
        : value,
    z.array(z.string().regex(/^([0-9A-F]{2}:){31}[0-9A-F]{2}$/)).default([]),
  ),
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

/** The app's web push keys and subject (R8.6), or null while any is missing: web push is then off. */
export function webPushKeys(
  env: ServerEnv = getServerEnv(),
): { publicKey: string; privateKey: string; subject: string } | null {
  const subject = env.VAPID_SUBJECT ?? (supportEmail(env) ? `mailto:${supportEmail(env)}` : undefined);
  if (!env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY || !subject) return null;
  return { publicKey: env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY, subject };
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
