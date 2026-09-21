interface AccountConfirmationTemplateInput {
  name: string;
  confirmationUrl: string;
}

export function accountConfirmationTemplate(input: AccountConfirmationTemplateInput) {
  const subject = "Confirm your Ovenly account";
  const text = [
    `Hi ${input.name},`,
    "",
    "Your Ovenly account has been created successfully.",
    "Please confirm your email address using this secure link:",
    input.confirmationUrl,
    "",
    "If you did not create this account, you can ignore this email.",
  ].join("\n");

  const html = `
    <p>Hi ${input.name},</p>
    <p>Your Ovenly account has been created successfully.</p>
    <p><a href="${input.confirmationUrl}">Confirm your email address</a></p>
    <p>If you did not create this account, you can ignore this email.</p>
  `;

  return { subject, text, html };
}
