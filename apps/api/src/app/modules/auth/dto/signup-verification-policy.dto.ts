import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class SignupVerificationPolicy {
  @Field({
    description:
      'When true, signup requires phone OTP before email. When false, email OTP also marks mobile verified.',
  })
  mobileVerificationRequired!: boolean;
}
