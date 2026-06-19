import { Field, InputType } from '@nestjs/graphql';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PlatformFeeCodeEnum } from '../../platform-fee/enums/platform-fee-code.enum';
import { PaymentGatewayProviderEnum } from '../enums/payment.enums';

@InputType()
export class ConfirmPlatformFeePaymentInput {
  @Field(() => PlatformFeeCodeEnum)
  @IsEnum(PlatformFeeCodeEnum)
  feeCode: PlatformFeeCodeEnum;

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
