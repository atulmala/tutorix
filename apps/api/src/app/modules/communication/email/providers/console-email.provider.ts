import { Logger } from '@nestjs/common';
import { EmailProvider, SendEmailInput, SendEmailResult } from '../email.types';

export class ConsoleEmailProvider implements EmailProvider {
  private readonly logger = new Logger('ConsoleEmailProvider');

  async send(input: SendEmailInput): Promise<SendEmailResult> {
    this.logger.log(`Email (console) to=${input.to} subject=${input.subject}`);
    if (process.env.NODE_ENV !== 'production') {
      this.logger.debug(input.text);
    }
    return { messageId: null };
  }
}
