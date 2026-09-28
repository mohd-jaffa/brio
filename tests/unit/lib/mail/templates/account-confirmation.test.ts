import { describe, expect, it } from "vitest";

import { accountConfirmationTemplate } from "@/lib/mail/templates/account-confirmation";

describe("accountConfirmationTemplate", () => {
  it("names the app, greets the owner and carries the link, in text and in HTML", () => {
    const mail = accountConfirmationTemplate({ name: "Priya", confirmationUrl: "https://brio.test/confirm?t=1" });
    expect(mail.subject).toBe("Confirm your Brio account");
    expect(mail.text).toContain("Hi Priya,");
    expect(mail.text).toContain("Your Brio account has been created successfully.");
    expect(mail.text).toContain("https://brio.test/confirm?t=1");
    expect(mail.html).toContain('<a href="https://brio.test/confirm?t=1">');
    expect(mail.html).toContain("Your Brio account");
  });
});
