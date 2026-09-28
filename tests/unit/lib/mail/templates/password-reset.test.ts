import { describe, expect, it } from "vitest";

import { passwordResetTemplate } from "@/lib/mail/templates/password-reset";

describe("passwordResetTemplate", () => {
  it("names the app and gives the temporary password, in text and in HTML", () => {
    const mail = passwordResetTemplate({ name: "Priya", temporaryPassword: "Tmp-4821-xy" });
    expect(mail.subject).toBe("Your Brio temporary password");
    expect(mail.text).toContain("Hi Priya,");
    expect(mail.text).toContain("Tmp-4821-xy");
    expect(mail.html).toContain("<strong>Tmp-4821-xy</strong>");
  });
});
