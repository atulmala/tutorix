import { BadRequestException } from '@nestjs/common';
import { CommunicationDispatcher } from './communication.dispatcher';
import { CommunicationAudience } from './enums/communication-audience.enum';
import { CommunicationEvent } from './enums/communication-event.enum';
import { EmailPurpose } from './email/enums/email-purpose.enum';

describe('CommunicationDispatcher', () => {
  const user = {
    id: 9,
    email: 'user@example.com',
    mobileCountryCode: '+91',
    mobileNumber: '9876543210',
    firstName: 'Ada',
    lastName: 'Lovelace',
    role: 'STUDENT',
  };

  function createDispatcher(overrides?: {
    rule?: Record<string, unknown> | null;
    template?: { templatePath: string } | null;
  }) {
    const ruleRepository = {
      findOne: jest.fn().mockResolvedValue(
        overrides && 'rule' in overrides
          ? overrides.rule
          : {
              enabled: true,
              mandatory: true,
              emailEnabled: true,
              smsEnabled: false,
              pushEnabled: false,
              whatsappEnabled: false,
              onScreenEnabled: false,
            },
      ),
    };
    const templateRepository = {
      findOne: jest.fn().mockResolvedValue(
        overrides?.template ?? {
          templatePath: 'email/EMAIL_VERIFICATION.ACTOR.html',
        },
      ),
    };
    const sendRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((row) => row),
      save: jest.fn(async (row) => row),
    };
    const inAppMessageRepository = {
      create: jest.fn((row) => row),
      save: jest.fn(async (row) => ({ ...row, id: 1 })),
    };
    const userRepository = {
      findOne: jest.fn().mockResolvedValue(user),
    };
    const templateStore = {
      read: jest.fn().mockReturnValue({
        attributes: { subject: 'Code', text: 'Your code is {{otp}}' },
        body: '<p>{{firstName}} {{otp}}</p>',
        raw: '',
      }),
    };
    const emailService = {
      send: jest.fn().mockResolvedValue({ messageId: 'm-1' }),
      getProviderKind: jest.fn().mockReturnValue('console'),
    };
    const notificationService = {
      send: jest.fn().mockResolvedValue({ success: true, messageId: null }),
      getProviderKind: jest.fn().mockReturnValue('console'),
    };
    const smsService = { send: jest.fn().mockResolvedValue({ success: true }) };
    const whatsAppService = {
      send: jest.fn().mockResolvedValue({ success: true }),
    };

    const dispatcher = new CommunicationDispatcher(
      ruleRepository as never,
      templateRepository as never,
      sendRepository as never,
      inAppMessageRepository as never,
      userRepository as never,
      templateStore as never,
      emailService as never,
      notificationService as never,
      smsService as never,
      whatsAppService as never,
    );

    return {
      dispatcher,
      emailService,
      smsService,
      notificationService,
      sendRepository,
      inAppMessageRepository,
    };
  }

  it('uses catalog default channels when the rule row is missing', async () => {
    const { dispatcher, notificationService, emailService } = createDispatcher({
      rule: null,
    });
    await dispatcher.dispatch({
      event: CommunicationEvent.WALLET_TOP_UP,
      userId: 9,
      payload: { firstName: 'Ada', amountInr: '100', balanceInr: '200' },
    });
    expect(notificationService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 9,
        data: expect.objectContaining({ event: CommunicationEvent.WALLET_TOP_UP }),
      }),
    );
    expect(emailService.send).toHaveBeenCalled();
  });

  it('skips when the rule is disabled', async () => {
    const { dispatcher, emailService } = createDispatcher({
      rule: {
        enabled: false,
        mandatory: false,
        emailEnabled: true,
        smsEnabled: false,
        pushEnabled: false,
        whatsappEnabled: false,
        onScreenEnabled: false,
      },
    });
    await dispatcher.dispatch({
      event: CommunicationEvent.EMAIL_VERIFICATION,
      userId: 9,
      payload: { firstName: 'Ada', otp: '123456' },
    });
    expect(emailService.send).not.toHaveBeenCalled();
  });

  it('throws when a mandatory event has no channels', async () => {
    const { dispatcher } = createDispatcher({
      rule: {
        enabled: true,
        mandatory: true,
        emailEnabled: false,
        smsEnabled: false,
        pushEnabled: false,
        whatsappEnabled: false,
        onScreenEnabled: false,
      },
    });
    await expect(
      dispatcher.dispatch({
        event: CommunicationEvent.EMAIL_VERIFICATION,
        userId: 9,
        payload: { otp: '111111' },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('sends email with escaped HTML and EMAIL_OTP purpose', async () => {
    const { dispatcher, emailService } = createDispatcher();
    await dispatcher.dispatch({
      event: CommunicationEvent.EMAIL_VERIFICATION,
      audience: CommunicationAudience.ACTOR,
      userId: 9,
      payload: { firstName: '<Ada>', otp: '123456' },
    });
    expect(emailService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@example.com',
        purpose: EmailPurpose.EMAIL_OTP,
        html: '<p>&lt;Ada&gt; 123456</p>',
      }),
    );
  });

  it('persists an in-app message for ON_SCREEN', async () => {
    const { dispatcher, inAppMessageRepository, emailService } = createDispatcher({
      rule: {
        enabled: true,
        mandatory: false,
        emailEnabled: false,
        smsEnabled: false,
        pushEnabled: false,
        whatsappEnabled: false,
        onScreenEnabled: true,
      },
      template: { templatePath: 'on-screen/DOCUMENTS_ALL_UPLOADED.ACTOR.txt' },
    });
    await dispatcher.dispatch({
      event: CommunicationEvent.DOCUMENTS_ALL_UPLOADED,
      userId: 9,
      payload: { firstName: 'Ada' },
    });
    expect(emailService.send).not.toHaveBeenCalled();
    expect(inAppMessageRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 9,
        event: CommunicationEvent.DOCUMENTS_ALL_UPLOADED,
      }),
    );
  });

  it('does not call SMS when that channel is off', async () => {
    const { dispatcher, smsService } = createDispatcher();
    await dispatcher.dispatch({
      event: CommunicationEvent.EMAIL_VERIFICATION,
      userId: 9,
      payload: { otp: '123456' },
    });
    expect(smsService.send).not.toHaveBeenCalled();
  });
});
