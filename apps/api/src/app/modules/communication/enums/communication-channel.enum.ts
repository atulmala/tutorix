import { registerEnumType } from '@nestjs/graphql';

export enum CommunicationChannel {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PUSH = 'PUSH',
  WHATSAPP = 'WHATSAPP',
}

registerEnumType(CommunicationChannel, {
  name: 'CommunicationChannel',
  description: 'Delivery channels for communication events',
});
