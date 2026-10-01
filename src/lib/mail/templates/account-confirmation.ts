import { MAIL_TEXT } from "@/constants/messages";

import { emailHtml, emailText, type EmailParts } from "./layout";

interface AccountConfirmationTemplateInput {
  appUrl: string;
  name: string;
  confirmationUrl: string;
}

/** A new account's email, to confirm the address it was made with. */
export function accountConfirmationTemplate(input: AccountConfirmationTemplateInput) {
  const text = MAIL_TEXT.confirmation;
  const parts: EmailParts = {
    appUrl: input.appUrl,
    subject: text.subject,
    preheader: text.preheader,
    heading: text.heading,
    paragraphs: [MAIL_TEXT.greeting(input.name), text.body],
    action: { label: text.action, url: input.confirmationUrl, fallback: MAIL_TEXT.linkFallback },
    footnote: text.footnote,
  };
  return { subject: text.subject, text: emailText(parts), html: emailHtml(parts) };
}
