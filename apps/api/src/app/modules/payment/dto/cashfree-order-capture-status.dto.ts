import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class CashfreeOrderCaptureStatusDto {
  @Field()
  captured: boolean;

  @Field({ nullable: true })
  paymentId?: string;
}
