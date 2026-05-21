import { registerEnumType } from '@nestjs/graphql';

export enum BatchJobNameEnum {
  DOCUMENT_ANALYSIS = 'document-analysis',
  CLASS_REMINDER = 'class-reminder',
  FEEDBACK_REMINDER = 'feedback-reminder',
  CALENDAR_UPDATE_REMINDER = 'calendar-update-reminder',
}

registerEnumType(BatchJobNameEnum, {
  name: 'BatchJobNameEnum',
  description: 'Registered batch job identifiers',
});
