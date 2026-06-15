import { Field, InputType, Int } from '@nestjs/graphql';
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { PaymentGatewayProviderEnum } from '../enums/payment.enums';

@InputType()
export class ConfirmPtFeePaymentInput {
  @Field(() => Int)
  @IsInt()
  tutorOfferingId: number;

  @Field(() => PaymentGatewayProviderEnum, { nullable: true })
  @IsOptional()
  @IsEnum(PaymentGatewayProviderEnum)
  provider?: PaymentGatewayProviderEnum;

  @Field()
  @IsString()
  orderId: string;

  @Field()
  @IsString()
  paymentId: string;

  @Field()
  @IsString()
  signature: string;
}
