import { UserRole } from '../../auth/enums/user-role.enum';
import { EmailPurpose } from './enums/email-purpose.enum';

export type EmailProviderKind = 'ses' | 'console';

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
  purpose: EmailPurpose;
  userId?: number | null;
  recipientName?: string | null;
  recipientRole?: UserRole | null;
  tags?: Record<string, string>;
};

export type SendEmailResult = {
  messageId: string | null;
};

export interface EmailProvider {
  send(input: SendEmailInput): Promise<SendEmailResult>;
}

export type EmailStatus = {
  provider: EmailProviderKind;
  fromEmail: string | null;
  fromName: string;
  region: string;
  configured: boolean;
};
