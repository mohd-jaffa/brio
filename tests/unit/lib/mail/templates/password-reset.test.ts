import { describe, expect, it } from "vitest";

import { MAIL_TEXT } from "@/constants/messages";
import { passwordResetTemplate } from "@/lib/mail/templates/password-reset";

describe("passwordResetTemplate", () => {
  it("gives the temporary password set apart, and the way to sign in with it", () => {
    const mail = passwordResetTemplate({
      appUrl: "https://brio.test/",
      name: "Priya",
      temporaryPassword: "Tmp-4821-xy",
    });
    expect(mail.subject).toBe("Your Brio temporary password");
    expect(mail.text).toContain("Hi Priya,");
    expect(mail.text).toContain(`${MAIL_TEXT.passwordReset.label}: Tmp-4821-xy`);
    expect(mail.text).toContain(`${MAIL_TEXT.passwordReset.action}: https://brio.test/login`);
    expect(mail.html).toContain(">Tmp-4821-xy</p>");
    expect(mail.html).toContain('href="https://brio.test/login"');
  });
});
