import { Injectable, Logger } from '@nestjs/common';
import { SendWhatsAppInput, SendWhatsAppResult } from './whatsapp.types';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  async send(input: SendWhatsAppInput): Promise<SendWhatsAppResult> {
    this.logger.log(
      `WhatsApp (console) to=${input.to} userId=${input.userId ?? 'n/a'}`,
    );
    if (process.env.NODE_ENV !== 'production') {
      this.logger.debug(input.body);
    }
    return { success: true, messageId: null };
  }
}
