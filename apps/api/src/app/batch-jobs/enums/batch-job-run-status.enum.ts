import { registerEnumType } from '@nestjs/graphql';

export enum BatchJobRunStatusEnum {
  RUNNING = 'RUNNING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  PARTIAL = 'PARTIAL',
}

registerEnumType(BatchJobRunStatusEnum, {
  name: 'BatchJobRunStatusEnum',
  description: 'Lifecycle status of a batch job run',
});
