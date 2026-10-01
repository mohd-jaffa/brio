import { describe, expect, it } from "vitest";

import { MAIL_TEXT } from "@/constants/messages";
import { accountConfirmationTemplate } from "@/lib/mail/templates/account-confirmation";

describe("accountConfirmationTemplate", () => {
  it("greets the owner and carries the confirmation link, as a button and in words, in text and HTML", () => {
    const mail = accountConfirmationTemplate({
      appUrl: "https://brio.test",
      name: "Priya",
      confirmationUrl: "https://brio.test/confirm?t=1",
    });
    expect(mail.subject).toBe("Confirm your Brio account");
    expect(mail.text).toContain("Hi Priya,");
    expect(mail.text).toContain(MAIL_TEXT.confirmation.body);
    expect(mail.text).toContain(`${MAIL_TEXT.confirmation.action}: https://brio.test/confirm?t=1`);
    expect(mail.html).toContain('href="https://brio.test/confirm?t=1"');
    expect(mail.html).toContain(MAIL_TEXT.linkFallback);
    expect(mail.html).toContain(MAIL_TEXT.confirmation.heading);
    expect(mail.html).toContain('src="https://brio.test/email/wordmark.png"');
  });
});
