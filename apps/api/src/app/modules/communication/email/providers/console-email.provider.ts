import { Logger } from '@nestjs/common';
import { EmailProvider, SendEmailInput, SendEmailResult } from '../email.types';

export class ConsoleEmailProvider implements EmailProvider {
  private readonly logger = new Logger('ConsoleEmailProvider');

  async send(input: SendEmailInput): Promise<SendEmailResult> {
    const attachmentNames = input.attachments?.map((file) => file.filename).join(', ');
    this.logger.log(
      `Email (console) to=${input.to} subject=${input.subject}${
        attachmentNames ? ` attachments=${attachmentNames}` : ''
      }`,
    );
    if (process.env.NODE_ENV !== 'production') {
      this.logger.debug(input.text);
    }
    return { messageId: null };
  }
}
