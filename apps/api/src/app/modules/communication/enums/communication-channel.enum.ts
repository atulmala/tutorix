import { registerEnumType } from '@nestjs/graphql';

export enum CommunicationChannel {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PUSH = 'PUSH',
  WHATSAPP = 'WHATSAPP',
  ON_SCREEN = 'ON_SCREEN',
}

registerEnumType(CommunicationChannel, {
  name: 'CommunicationChannel',
  description: 'Delivery channels for communication events',
});
