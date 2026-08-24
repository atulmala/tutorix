import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailService } from './email/email.service';
import {
  CommunicationDispatcher,
  CommunicationEmitInput,
} from './communication.dispatcher';
import { CommunicationRuleEntity } from './entities/communication-rule.entity';
import { CommunicationAudience } from './enums/communication-audience.enum';
import { CommunicationEvent } from './enums/communication-event.enum';

@Injectable()
export class CommunicationService {
  constructor(
    private readonly dispatcher: CommunicationDispatcher,
    private readonly emailService: EmailService,
    @InjectRepository(CommunicationRuleEntity)
    private readonly ruleRepository: Repository<CommunicationRuleEntity>,
  ) {}

  async emit(input: CommunicationEmitInput): Promise<void> {
    await this.dispatcher.dispatch(input);
  }

  returnsOtpInApiResponse(): boolean {
    return this.emailService.returnsOtpInApiResponse();
  }

  /**
   * Signup requires a phone OTP step when the Mobile verification rule is enabled.
   * A missing rule defaults to false so users are not blocked on SMS.
   */
  async isMobileVerificationRequired(): Promise<boolean> {
    const rule = await this.ruleRepository.findOne({
      where: {
        event: CommunicationEvent.MOBILE_VERIFICATION,
        audience: CommunicationAudience.ACTOR,
        deleted: false,
      },
    });
    return rule?.enabled ?? false;
  }
}
