import { Injectable } from '@nestjs/common';
import { EmailService } from './email/email.service';
import {
  CommunicationDispatcher,
  CommunicationEmitInput,
} from './communication.dispatcher';

@Injectable()
export class CommunicationService {
  constructor(
    private readonly dispatcher: CommunicationDispatcher,
    private readonly emailService: EmailService,
  ) {}

  async emit(input: CommunicationEmitInput): Promise<void> {
    await this.dispatcher.dispatch(input);
  }

  returnsOtpInApiResponse(): boolean {
    return this.emailService.returnsOtpInApiResponse();
  }
}
