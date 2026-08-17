import { Injectable, Logger } from '@nestjs/common';
import { SendSmsInput, SendSmsResult } from './sms.types';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  async send(input: SendSmsInput): Promise<SendSmsResult> {
    this.logger.log(
      `SMS (console) to=${input.to} userId=${input.userId ?? 'n/a'}`,
    );
    if (process.env.NODE_ENV !== 'production') {
      this.logger.debug(input.body);
    }
    return { success: true, messageId: null };
  }
}
