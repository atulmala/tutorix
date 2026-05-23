import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AdminDashboardStats {
  @Field({ description: 'Users signed up with tutor role (non-deleted)' })
  tutorSignupCount: number;

  @Field({ description: 'Users signed up with student role (non-deleted)' })
  studentSignupCount: number;

  @Field(() => Int, {
    description:
      'Distinct tutors online (activity in last 30 minutes, admin console excluded)',
  })
  tutorOnlineUsers: number;

  @Field(() => Int, {
    description:
      'Distinct students online (activity in last 30 minutes, admin console excluded)',
  })
  studentOnlineUsers: number;

  @Field(() => Int, {
    description: 'Tutor sessions online in the last 30 minutes',
  })
  tutorActiveSessions: number;

  @Field(() => Int, {
    description: 'Student sessions online in the last 30 minutes',
  })
  studentActiveSessions: number;
}
