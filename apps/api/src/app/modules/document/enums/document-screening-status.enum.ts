import { registerEnumType } from '@nestjs/graphql';

export enum DocumentScreeningStatusEnum {
  PASSED_AUTOMATED = 'PASSED_AUTOMATED',
  PENDING_HUMAN = 'PENDING_HUMAN',
  APPROVED_HUMAN = 'APPROVED_HUMAN',
  REJECTED_HUMAN = 'REJECTED_HUMAN',
}

registerEnumType(DocumentScreeningStatusEnum, {
  name: 'DocumentScreeningStatusEnum',
  description:
    'PASSED_AUTOMATED: AI passed. PENDING_HUMAN: AI did not pass or inconclusive — awaiting human review. APPROVED_HUMAN / REJECTED_HUMAN: human admin outcome after review.',
});
