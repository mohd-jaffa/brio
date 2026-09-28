import { UI_TEXT } from "@/constants/messages";

interface PasswordResetTemplateInput {
  name: string;
  temporaryPassword: string;
}

export function passwordResetTemplate(input: PasswordResetTemplateInput) {
  const subject = `Your ${UI_TEXT.appName} temporary password`;
  const text = [
    `Hi ${input.name},`,
    "",
    "Your temporary password is:",
    input.temporaryPassword,
    "",
    "Please log in and change your password immediately.",
  ].join("\n");

  const html = `
    <p>Hi ${input.name},</p>
    <p>Your temporary password is:</p>
    <p><strong>${input.temporaryPassword}</strong></p>
    <p>Please log in and change your password immediately.</p>
  `;

  return { subject, text, html };
}
