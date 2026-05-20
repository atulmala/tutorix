import { registerEnumType } from '@nestjs/graphql';

/** Batch verification lifecycle on `document` (separate from `verified` / screening outcome). */
export enum DocumentVerificationWorkflowStatusEnum {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
}

registerEnumType(DocumentVerificationWorkflowStatusEnum, {
  name: 'DocumentVerificationWorkflowStatusEnum',
  description:
    'Whether automated/human verification workflow has finished for this document row',
});
