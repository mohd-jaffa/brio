export interface MailMessage {
  from: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface MailProvider {
  send(message: MailMessage): Promise<void>;
}
