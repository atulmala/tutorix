import { CommunicationAudience } from './enums/communication-audience.enum';
import { CommunicationChannel } from './enums/communication-channel.enum';
import { CommunicationEvent } from './enums/communication-event.enum';

export type ChannelFlags = {
  email: boolean;
  sms: boolean;
  push: boolean;
  whatsapp: boolean;
};

export type CatalogEntry = {
  event: CommunicationEvent;
  audience: CommunicationAudience;
  mandatory: boolean;
  defaultChannels: ChannelFlags;
  allowedVariables: string[];
  offsetMinutes?: number;
  label: string;
};

const OTP_VARS = ['firstName', 'otp', 'expiryMinutes'];
const WALLET_VARS = ['firstName', 'amountInr', 'balanceInr'];
const CLASS_VARS = ['tutorName', 'studentName', 'offeringName', 'classTime'];
const REMINDER_VARS = [...CLASS_VARS, 'minutesUntil'];

export const COMMUNICATION_CATALOG: CatalogEntry[] = [
  {
    event: CommunicationEvent.EMAIL_VERIFICATION,
    audience: CommunicationAudience.ACTOR,
    mandatory: true,
    defaultChannels: { email: true, sms: false, push: false, whatsapp: false },
    allowedVariables: OTP_VARS,
    label: 'Email verification',
  },
  {
    event: CommunicationEvent.MOBILE_VERIFICATION,
    audience: CommunicationAudience.ACTOR,
    mandatory: true,
    defaultChannels: { email: false, sms: true, push: false, whatsapp: false },
    allowedVariables: OTP_VARS,
    label: 'Mobile verification',
  },
  {
    event: CommunicationEvent.WALLET_TOP_UP,
    audience: CommunicationAudience.ACTOR,
    mandatory: false,
    defaultChannels: { email: true, sms: false, push: true, whatsapp: false },
    allowedVariables: WALLET_VARS,
    label: 'Wallet top-up',
  },
  {
    event: CommunicationEvent.CLASS_BOOKED,
    audience: CommunicationAudience.STUDENT,
    mandatory: false,
    defaultChannels: { email: true, sms: false, push: true, whatsapp: false },
    allowedVariables: CLASS_VARS,
    label: 'Class booked (student)',
  },
  {
    event: CommunicationEvent.CLASS_BOOKED,
    audience: CommunicationAudience.TUTOR,
    mandatory: false,
    defaultChannels: { email: true, sms: false, push: true, whatsapp: false },
    allowedVariables: CLASS_VARS,
    label: 'Class booked (tutor)',
  },
  {
    event: CommunicationEvent.CLASS_STARTING_SOON,
    audience: CommunicationAudience.STUDENT,
    mandatory: false,
    defaultChannels: { email: false, sms: false, push: true, whatsapp: false },
    allowedVariables: REMINDER_VARS,
    offsetMinutes: 15,
    label: 'Class starting soon (student)',
  },
  {
    event: CommunicationEvent.CLASS_STARTING_SOON,
    audience: CommunicationAudience.TUTOR,
    mandatory: false,
    defaultChannels: { email: false, sms: false, push: true, whatsapp: false },
    allowedVariables: REMINDER_VARS,
    offsetMinutes: 15,
    label: 'Class starting soon (tutor)',
  },
];

export const ALL_CHANNELS: CommunicationChannel[] = [
  CommunicationChannel.EMAIL,
  CommunicationChannel.SMS,
  CommunicationChannel.PUSH,
  CommunicationChannel.WHATSAPP,
];

export function channelFolder(channel: CommunicationChannel): string {
  switch (channel) {
    case CommunicationChannel.EMAIL:
      return 'email';
    case CommunicationChannel.SMS:
      return 'sms';
    case CommunicationChannel.PUSH:
      return 'notification';
    case CommunicationChannel.WHATSAPP:
      return 'whatsapp';
  }
}

export function channelExtension(channel: CommunicationChannel): 'html' | 'txt' {
  return channel === CommunicationChannel.EMAIL ? 'html' : 'txt';
}

export function defaultTemplatePath(
  event: CommunicationEvent,
  audience: CommunicationAudience,
  channel: CommunicationChannel,
): string {
  return `${channelFolder(channel)}/${event}.${audience}.${channelExtension(channel)}`;
}

export function findCatalogEntry(
  event: CommunicationEvent,
  audience: CommunicationAudience,
): CatalogEntry | undefined {
  return COMMUNICATION_CATALOG.find(
    (entry) => entry.event === event && entry.audience === audience,
  );
}

export function samplePayload(event: CommunicationEvent): Record<string, string> {
  switch (event) {
    case CommunicationEvent.EMAIL_VERIFICATION:
    case CommunicationEvent.MOBILE_VERIFICATION:
      return { firstName: 'Ada', otp: '123456', expiryMinutes: '30' };
    case CommunicationEvent.WALLET_TOP_UP:
      return { firstName: 'Ada', amountInr: '500', balanceInr: '1500' };
    case CommunicationEvent.CLASS_BOOKED:
      return {
        tutorName: 'Priya Sharma',
        studentName: 'Ada Lovelace',
        offeringName: 'Class 10 Maths',
        classTime: 'Mon 18 Aug, 5:00 PM',
      };
    case CommunicationEvent.CLASS_STARTING_SOON:
      return {
        tutorName: 'Priya Sharma',
        studentName: 'Ada Lovelace',
        offeringName: 'Class 10 Maths',
        classTime: 'Mon 18 Aug, 5:00 PM',
        minutesUntil: '15',
      };
  }
}

export function enabledChannelsFromRule(rule: {
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  whatsappEnabled: boolean;
}): CommunicationChannel[] {
  const channels: CommunicationChannel[] = [];
  if (rule.emailEnabled) channels.push(CommunicationChannel.EMAIL);
  if (rule.smsEnabled) channels.push(CommunicationChannel.SMS);
  if (rule.pushEnabled) channels.push(CommunicationChannel.PUSH);
  if (rule.whatsappEnabled) channels.push(CommunicationChannel.WHATSAPP);
  return channels;
}
   