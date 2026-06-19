import { Field, ObjectType } from '@nestjs/graphql';
import { PaymentGatewayProviderEnum } from '../enums/payment.enums';

@ObjectType()
export class PaymentOrderSessionDto {
  @Field()
  skipped: boolean;

  @Field(() => PaymentGatewayProviderEnum, { nullable: true })
  provider?: PaymentGatewayProviderEnum;

  @Field({ nullable: true })
  orderId?: string;

  @Field({ nullable: true })
  amountInr?: number;

  @Field({ nullable: true })
  currency?: string;

  @Field({ nullable: true, description: 'JSON string for client checkout SDK' })
  checkoutPayloadJson?: string;
}
