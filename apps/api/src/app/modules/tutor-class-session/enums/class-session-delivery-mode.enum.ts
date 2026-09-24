import { registerEnumType } from '@nestjs/graphql';

export enum ClassSessionDeliveryModeEnum {
  offline = 'offline',
  online = 'online',
}

registerEnumType(ClassSessionDeliveryModeEnum, {
  name: 'ClassSessionDeliveryMode',
  description: 'How a booked class is delivered',
});
