import { registerEnumType } from '@nestjs/graphql';

export enum DocumentScreeningStatusEnum {
  PASSED_AUTOMATED = 'PASSED_AUTOMATED',
  PENDING_HUMAN = 'PENDING_HUMAN',
  APPROVED_HUMAN = 'APPROVED_HUMAN',
  REJECTED_HUMAN = 'REJECTED_HUMAN',
}

registerEnumType(DocumentScreeningStatusEnum, {
  name: 'DocumentScreeningStatusEnum',
  description: 'Automated or human review status for tutor document screening',
});
