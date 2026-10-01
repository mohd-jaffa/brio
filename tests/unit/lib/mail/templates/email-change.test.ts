import { describe, expect, it } from "vitest";

import { EMAIL_CHANGE_LINK_HOURS } from "@/constants/limits";
import { MAIL_TEXT } from "@/constants/messages";
import { emailChangeTemplate } from "@/lib/mail/templates/email-change";

describe("emailChangeTemplate", () => {
  it("asks to confirm the new address, says how long the link lasts, and is not a welcome", () => {
    const mail = emailChangeTemplate({
      appUrl: "https://brio.test",
      name: "Priya",
      confirmationUrl: "https://brio.test/confirm-email#change=abc",
    });
    expect(mail.subject).toBe(MAIL_TEXT.emailChange.subject);
    expect(mail.text).toContain("Hi Priya,");
    expect(mail.text).toContain(MAIL_TEXT.emailChange.body);
    expect(mail.text).toContain(`The link works for ${EMAIL_CHANGE_LINK_HOURS} hours.`);
    expect(mail.text).not.toContain(MAIL_TEXT.confirmation.body);
    expect(mail.html).toContain('href="https://brio.test/confirm-email#change=abc"');
    expect(mail.html).toContain(MAIL_TEXT.emailChange.heading);
  });
});
