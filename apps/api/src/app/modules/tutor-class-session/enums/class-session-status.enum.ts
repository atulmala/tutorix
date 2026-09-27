import { registerEnumType } from '@nestjs/graphql';

export enum ClassSessionStatusEnum {
  open = 'open',
  full = 'full',
  cancelled = 'cancelled',
}

registerEnumType(ClassSessionStatusEnum, {
  name: 'ClassSessionStatus',
  description: 'Capacity state of a tutor class session',
});
