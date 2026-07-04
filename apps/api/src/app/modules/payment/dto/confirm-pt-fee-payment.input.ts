import { Field, InputType, Int } from '@nestjs/graphql';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';
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

  @Field({ nullable: true })
  @ValidateIf((input: ConfirmPtFeePaymentInput) => !input.fetchFromGateway)
  @IsString()
  paymentId?: string;

  @Field({ nullable: true })
  @ValidateIf((input: ConfirmPtFeePaymentInput) => !input.fetchFromGateway)
  @IsString()
  signature?: string;

  @Field({ nullable: true, defaultValue: false })
  @IsOptional()
  @IsBoolean()
  fetchFromGateway?: boolean;
}
