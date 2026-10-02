import { registerEnumType } from '@nestjs/graphql';

export enum TutorBookingSchedulingStatus {
  unscheduled = 'unscheduled',
  scheduled = 'scheduled',
  partial = 'partial',
  cancelled = 'cancelled',
}

export enum TutorBookingConclusionStatus {
  not_concluded = 'not_concluded',
  partial = 'partial',
  concluded = 'concluded',
}

registerEnumType(TutorBookingSchedulingStatus, {
  name: 'TutorBookingSchedulingStatus',
  description: 'Whether the classes in a tutor booking are scheduled',
});

registerEnumType(TutorBookingConclusionStatus, {
  name: 'TutorBookingConclusionStatus',
  description: 'Whether the classes in a tutor booking have ended',
});
