import { Field, InputType } from '@nestjs/graphql';
import { IsBoolean, IsEnum, IsOptional, IsString, ValidateIf } from 'class-validator';
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

  @Field({ nullable: true })
  @ValidateIf((input: ConfirmPlatformFeePaymentInput) => !input.fetchFromGateway)
  @IsString()
  paymentId?: string;

  @Field({ nullable: true })
  @ValidateIf((input: ConfirmPlatformFeePaymentInput) => !input.fetchFromGateway)
  @IsString()
  signature?: string;

  @Field({ nullable: true, defaultValue: false })
  @IsOptional()
  @IsBoolean()
  fetchFromGateway?: boolean;
}
