import { registerEnumType } from '@nestjs/graphql';

export enum ClassCreditRefundMethodEnum {
  wallet = 'wallet',
  gateway = 'gateway',
}

registerEnumType(ClassCreditRefundMethodEnum, {
  name: 'ClassCreditRefundMethod',
  description: 'Where a cancelled class amount is returned',
});
