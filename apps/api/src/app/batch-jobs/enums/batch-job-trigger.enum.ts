import { registerEnumType } from '@nestjs/graphql';

export enum BatchJobTriggerEnum {
  CRON = 'cron',
  MANUAL = 'manual',
}

registerEnumType(BatchJobTriggerEnum, {
  name: 'BatchJobTriggerEnum',
  description: 'How a batch job run was initiated',
});
