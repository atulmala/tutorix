import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class VerifyOtpResponse {
  @Field()
  success: boolean;

  @Field()
  message: string;
}

