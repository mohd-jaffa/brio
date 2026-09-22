import { accountConfirmationTemplate } from "@/lib/mail/templates/account-confirmation";
import { passwordResetTemplate } from "@/lib/mail/templates/password-reset";
import { type MailProvider } from "@/lib/mail/mail.provider";

interface MailServiceOptions {
  provider: MailProvider;
  from: string;
}

interface SendAccountConfirmationInput {
  to: string;
  name: string;
  confirmationUrl: string;
}

interface SendPasswordResetInput {
  to: string;
  name: string;
  temporaryPassword: string;
}

export class MailService {
  private readonly provider: MailProvider;
  private readonly from: string;

  constructor(options: MailServiceOptions) {
    this.provider = options.provider;
    this.from = options.from;
  }

  async sendAccountConfirmation(input: SendAccountConfirmationInput) {
    const content = accountConfirmationTemplate(input);

    await this.provider.send({
      from: this.from,
      to: input.to,
      ...content,
    });
  }

  async sendPasswordResetTemporaryPassword(input: SendPasswordResetInput) {
    const content = passwordResetTemplate(input);

    await this.provider.send({
      from: this.from,
      to: input.to,
      ...content,
    });
  }
}
