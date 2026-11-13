import { registerEnumType } from '@nestjs/graphql';

export enum TutorPayoutProviderEnum {
  razorpayx = 'razorpayx',
  cashfree = 'cashfree',
}

registerEnumType(TutorPayoutProviderEnum, {
  name: 'TutorPayoutProvider',
});
