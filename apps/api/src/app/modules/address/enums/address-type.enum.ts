import { registerEnumType } from '@nestjs/graphql';

export enum AddressType {
  HOME = 1,
  PRIMARY,
  WORK,
  TEACHING,
  SERVICE,
  BILLING,
  OTHER,
}

registerEnumType(AddressType, {
  name: 'AddressType',
  description: 'Supported address types for tutor onboarding',
});
