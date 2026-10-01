import nodemailer, { type Transporter } from "nodemailer";
import { getServerEnv, type ServerEnv } from "@/lib/env/server";
import { MailService } from "@/lib/mail/mail.service";
import { type MailMessage, type MailProvider } from "@/lib/mail/mail.provider";
import { externalServiceError } from "@/lib/errors";

interface NodemailerProviderOptions {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  password?: string;
}

export class NodemailerProvider implements MailProvider {
  private readonly transporter: Transporter;

  constructor(options: NodemailerProviderOptions) {
    this.transporter = nodemailer.createTransport({
      host: options.host,
      port: options.port,
      secure: options.secure,
      auth:
        options.user && options.password
          ? {
              user: options.user,
              pass: options.password,
            }
          : undefined,
    });
  }

  async send(message: MailMessage) {
    await this.transporter.sendMail(message);
  }
}

export function createConfiguredMailService(env: ServerEnv = getServerEnv()) {
  if (!env.SMTP_HOST || !env.SMTP_FROM) {
    throw externalServiceError("MAIL_PROVIDER_NOT_CONFIGURED");
  }

  return new MailService({
    from: env.SMTP_FROM,
    appUrl: env.NEXT_PUBLIC_APP_URL,
    provider: new NodemailerProvider({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT ?? 587,
      secure: env.SMTP_SECURE ?? false,
      user: env.SMTP_USER,
      password: env.SMTP_PASSWORD,
    }),
  });
}
