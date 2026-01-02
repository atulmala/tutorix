import { Field, Int, ObjectType } from '@nestjs/graphql';
import { OtpPurpose } from '../enums/otp-purpose.enum';

@ObjectType()
export class GenerateOtpResponse {
  @Field(() => Int)
  userId: number;

  @Field(() => OtpPurpose)
  purpose: OtpPurpose;

  @Field(() => Date)
  expiresAt: Date;

  @Field()
  otp: string;
}

