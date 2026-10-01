import { accountConfirmationTemplate } from "@/lib/mail/templates/account-confirmation";
import { emailChangeTemplate } from "@/lib/mail/templates/email-change";
import { passwordResetTemplate } from "@/lib/mail/templates/password-reset";
import { type MailProvider } from "@/lib/mail/mail.provider";

interface MailServiceOptions {
  provider: MailProvider;
  from: string;
  /** The app's address: where an email's marks are, and its links lead. */
  appUrl: string;
}

interface SendConfirmationInput {
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
  private readonly appUrl: string;

  constructor(options: MailServiceOptions) {
    this.provider = options.provider;
    this.from = options.from;
    this.appUrl = options.appUrl;
  }

  async sendAccountConfirmation(input: SendConfirmationInput) {
    const content = accountConfirmationTemplate({ ...input, appUrl: this.appUrl });

    await this.provider.send({
      from: this.from,
      to: input.to,
      ...content,
    });
  }

  /** A new address an owner asked to use, to confirm it is theirs. */
  async sendEmailChange(input: SendConfirmationInput) {
    const content = emailChangeTemplate({ ...input, appUrl: this.appUrl });

    await this.provider.send({
      from: this.from,
      to: input.to,
      ...content,
    });
  }

  async sendPasswordResetTemporaryPassword(input: SendPasswordResetInput) {
    const content = passwordResetTemplate({ ...input, appUrl: this.appUrl });

    await this.provider.send({
      from: this.from,
      to: input.to,
      ...content,
    });
  }
}
