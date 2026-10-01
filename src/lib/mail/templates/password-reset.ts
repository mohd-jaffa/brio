import { MAIL_TEXT } from "@/constants/messages";
import { AUTH_ROUTES } from "@/constants/routes";

import { emailHtml, emailText, type EmailParts } from "./layout";

interface PasswordResetTemplateInput {
  appUrl: string;
  name: string;
  temporaryPassword: string;
}

/**
 * The temporary password (plan §94), set apart to copy, and the way to sign
 * in with it; the app then asks for a new one.
 */
export function passwordResetTemplate(input: PasswordResetTemplateInput) {
  const text = MAIL_TEXT.passwordReset;
  const parts: EmailParts = {
    appUrl: input.appUrl,
    subject: text.subject,
    preheader: text.preheader,
    heading: text.heading,
    paragraphs: [MAIL_TEXT.greeting(input.name), text.body],
    code: { label: text.label, value: input.temporaryPassword },
    action: { label: text.action, url: `${input.appUrl.replace(/\/+$/, "")}${AUTH_ROUTES.signIn}` },
    footnote: text.footnote,
  };
  return { subject: text.subject, text: emailText(parts), html: emailHtml(parts) };
}
