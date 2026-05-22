import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AdminDashboardStats {
  @Field({ description: 'Users signed up with tutor role (non-deleted)' })
  tutorSignupCount: number;

  @Field({ description: 'Users signed up with student role (non-deleted)' })
  studentSignupCount: number;
}
