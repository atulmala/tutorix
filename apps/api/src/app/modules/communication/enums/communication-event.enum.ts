import { registerEnumType } from '@nestjs/graphql';

export enum CommunicationEvent {
  EMAIL_VERIFICATION = 'EMAIL_VERIFICATION',
  MOBILE_VERIFICATION = 'MOBILE_VERIFICATION',
  WALLET_TOP_UP = 'WALLET_TOP_UP',
  CLASS_BOOKED = 'CLASS_BOOKED',
  CLASS_STARTING_SOON = 'CLASS_STARTING_SOON',
}

registerEnumType(CommunicationEvent, {
  name: 'CommunicationEvent',
  description: 'Domain events that can trigger user messaging',
});
