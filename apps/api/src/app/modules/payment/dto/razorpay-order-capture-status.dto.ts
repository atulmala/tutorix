import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class RazorpayOrderCaptureStatusDto {
  @Field()
  captured: boolean;

  @Field({ nullable: true })
  paymentId?: string;
}
