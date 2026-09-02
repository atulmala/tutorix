import { CommunicationAudience } from './enums/communication-audience.enum';
import { CommunicationChannel } from './enums/communication-channel.enum';
import { CommunicationEvent } from './enums/communication-event.enum';

export type ChannelFlags = {
  email: boolean;
  sms: boolean;
  push: boolean;
  whatsapp: boolean;
  onScreen: boolean;
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
const DOCS_UPLOADED_VARS = ['firstName'];
const DOCS_PASSED_VARS = ['firstName'];
const DOCS_FAILED_VARS = [
  'firstName',
  'failedCount',
  'failedDocumentsText',
  'failedDocumentsHtml',
];
const TUTOR_APPROVED_VARS = ['firstName'];
const TUTOR_APPLICATION_REVIEW_VARS = ['firstName'];

const NONE: ChannelFlags = {
  email: false,
  sms: false,
  push: false,
  whatsapp: false,
  onScreen: false,
};

export const COMMUNICATION_CATALOG: CatalogEntry[] = [
  {
    event: CommunicationEvent.EMAIL_VERIFICATION,
    audience: CommunicationAudience.ACTOR,
    mandatory: true,
    defaultChannels: { ...NONE, email: true },
    allowedVariables: OTP_VARS,
    label: 'Email verification',
  },
  {
    event: CommunicationEvent.MOBILE_VERIFICATION,
    audience: CommunicationAudience.ACTOR,
    mandatory: true,
    defaultChannels: { ...NONE, sms: true },
    allowedVariables: OTP_VARS,
    label: 'Mobile verification',
  },
  {
    event: CommunicationEvent.WALLET_TOP_UP,
    audience: CommunicationAudience.ACTOR,
    mandatory: false,
    defaultChannels: { ...NONE, email: true, push: true },
    allowedVariables: WALLET_VARS,
    label: 'Wallet top-up',
  },
  {
    event: CommunicationEvent.CLASS_BOOKED,
    audience: CommunicationAudience.STUDENT,
    mandatory: false,
    defaultChannels: { ...NONE, email: true, push: true },
    allowedVariables: CLASS_VARS,
    label: 'Class booked (student)',
  },
  {
    event: CommunicationEvent.CLASS_BOOKED,
    audience: CommunicationAudience.TUTOR,
    mandatory: false,
    defaultChannels: { ...NONE, email: true, push: true },
    allowedVariables: CLASS_VARS,
    label: 'Class booked (tutor)',
  },
  {
    event: CommunicationEvent.CLASS_STARTING_SOON,
    audience: CommunicationAudience.STUDENT,
    mandatory: false,
    defaultChannels: { ...NONE, push: true },
    allowedVariables: REMINDER_VARS,
    offsetMinutes: 15,
    label: 'Class starting soon (student)',
  },
  {
    event: CommunicationEvent.CLASS_STARTING_SOON,
    audience: CommunicationAudience.TUTOR,
    mandatory: false,
    defaultChannels: { ...NONE, push: true },
    allowedVariables: REMINDER_VARS,
    offsetMinutes: 15,
    label: 'Class starting soon (tutor)',
  },
  {
    event: CommunicationEvent.DOCUMENTS_ALL_UPLOADED,
    audience: CommunicationAudience.ACTOR,
    mandatory: false,
    defaultChannels: { ...NONE, onScreen: true },
    allowedVariables: DOCS_UPLOADED_VARS,
    label: 'Documents all uploaded',
  },
  {
    event: CommunicationEvent.DOCUMENTS_VERIFICATION_PASSED,
    audience: CommunicationAudience.ACTOR,
    mandatory: false,
    defaultChannels: { ...NONE, email: true },
    allowedVariables: DOCS_PASSED_VARS,
    label: 'Documents verification passed',
  },
  {
    event: CommunicationEvent.DOCUMENTS_VERIFICATION_FAILED,
    audience: CommunicationAudience.ACTOR,
    mandatory: false,
    defaultChannels: { ...NONE, email: true, push: true },
    allowedVariables: DOCS_FAILED_VARS,
    label: 'Documents verification failed',
  },
  {
    event: CommunicationEvent.TUTOR_ONBOARDING_APPROVED,
    audience: CommunicationAudience.ACTOR,
    mandatory: false,
    defaultChannels: { ...NONE, email: true, onScreen: true },
    allowedVariables: TUTOR_APPROVED_VARS,
    label: 'Tutor onboarding approved',
  },
  {
    event: CommunicationEvent.TUTOR_APPLICATION_REVIEW,
    audience: CommunicationAudience.ACTOR,
    mandatory: false,
    defaultChannels: { ...NONE, onScreen: true },
    allowedVariables: TUTOR_APPLICATION_REVIEW_VARS,
    label: 'Tutor application review',
  },
];

export const ALL_CHANNELS: CommunicationChannel[] = [
  CommunicationChannel.EMAIL,
  CommunicationChannel.SMS,
  CommunicationChannel.PUSH,
  CommunicationChannel.WHATSAPP,
  CommunicationChannel.ON_SCREEN,
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
    case CommunicationChannel.ON_SCREEN:
      return 'on-screen';
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
    case CommunicationEvent.DOCUMENTS_ALL_UPLOADED:
    case CommunicationEvent.DOCUMENTS_VERIFICATION_PASSED:
    case CommunicationEvent.TUTOR_ONBOARDING_APPROVED:
    case CommunicationEvent.TUTOR_APPLICATION_REVIEW:
      return { firstName: 'Ada' };
    case CommunicationEvent.DOCUMENTS_VERIFICATION_FAILED:
      return {
        firstName: 'Ada',
        failedCount: '2',
        failedDocumentsText:
          'PAN Card: Photo is blurry\nAadhaar Card: Name does not match',
        failedDocumentsHtml:
          '<ul><li><strong>PAN Card</strong>: Photo is blurry</li><li><strong>Aadhaar Card</strong>: Name does not match</li></ul>',
      };
  }
}

export function enabledChannelsFromFlags(
  flags: ChannelFlags,
): CommunicationChannel[] {
  return enabledChannelsFromRule({
    emailEnabled: flags.email,
    smsEnabled: flags.sms,
    pushEnabled: flags.push,
    whatsappEnabled: flags.whatsapp,
    onScreenEnabled: flags.onScreen,
  });
}

export function enabledChannelsFromRule(rule: {
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  whatsappEnabled: boolean;
  onScreenEnabled: boolean;
}): CommunicationChannel[] {
  const channels: CommunicationChannel[] = [];
  if (rule.emailEnabled) channels.push(CommunicationChannel.EMAIL);
  if (rule.smsEnabled) channels.push(CommunicationChannel.SMS);
  if (rule.pushEnabled) channels.push(CommunicationChannel.PUSH);
  if (rule.whatsappEnabled) channels.push(CommunicationChannel.WHATSAPP);
  if (rule.onScreenEnabled) channels.push(CommunicationChannel.ON_SCREEN);
  return channels;
}
