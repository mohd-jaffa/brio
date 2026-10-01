import { MAIL_TEXT } from "@/constants/messages";
import { EMAIL_CHANGE_LINK_HOURS } from "@/constants/limits";

import { emailHtml, emailText, type EmailParts } from "./layout";

interface EmailChangeTemplateInput {
  appUrl: string;
  name: string;
  confirmationUrl: string;
}

/**
 * Sent to a new address an owner asked to use, to confirm it is theirs; until
 * then the account keeps the one it has (plan §139.11.2).
 */
export function emailChangeTemplate(input: EmailChangeTemplateInput) {
  const text = MAIL_TEXT.emailChange;
  const parts: EmailParts = {
    appUrl: input.appUrl,
    subject: text.subject,
    preheader: text.preheader,
    heading: text.heading,
    paragraphs: [MAIL_TEXT.greeting(input.name), text.body],
    action: { label: text.action, url: input.confirmationUrl, fallback: MAIL_TEXT.linkFallback },
    note: text.expires(EMAIL_CHANGE_LINK_HOURS),
    footnote: text.footnote,
  };
  return { subject: text.subject, text: emailText(parts), html: emailHtml(parts) };
}
