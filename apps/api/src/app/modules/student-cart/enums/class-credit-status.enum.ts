import { registerEnumType } from '@nestjs/graphql';

export enum ClassCreditStatusEnum {
  unscheduled = 'unscheduled',
  scheduled = 'scheduled',
  cancelled = 'cancelled',
}

registerEnumType(ClassCreditStatusEnum, {
  name: 'ClassCreditStatus',
  description: 'Paid class hour that may still need a calendar slot',
});
