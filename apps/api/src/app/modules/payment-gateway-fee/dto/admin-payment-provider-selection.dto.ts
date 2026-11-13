import { Field, InputType, ObjectType } from '@nestjs/graphql';
import { IsEnum, IsOptional } from 'class-validator';
import { PaymentGatewayProviderEnum } from '../../payment/enums/payment.enums';
import { TutorPayoutProviderEnum } from '../enums/tutor-payout-provider.enum';

@ObjectType()
export class AdminPaymentProviderOption {
  @Field()
  provider!: string;

  @Field()
  label!: string;

  @Field({ description: 'Whether credentials for this provider are set on the server' })
  configured!: boolean;
}

@ObjectType()
export class AdminPaymentProviderSelectionResult {
  @Field(() => PaymentGatewayProviderEnum)
  activePaymentGateway!: PaymentGatewayProviderEnum;

  @Field(() => TutorPayoutProviderEnum)
  tutorPayoutProvider!: TutorPayoutProviderEnum;

  @Field(() => [AdminPaymentProviderOption])
  paymentGatewayOptions!: AdminPaymentProviderOption[];

  @Field(() => [AdminPaymentProviderOption])
  tutorPayoutOptions!: AdminPaymentProviderOption[];
}

@InputType()
export class AdminUpdatePaymentProviderSelectionInput {
  @Field(() => PaymentGatewayProviderEnum, { nullable: true })
  @IsOptional()
  @IsEnum(PaymentGatewayProviderEnum)
  activePaymentGateway?: PaymentGatewayProviderEnum;

  @Field(() => TutorPayoutProviderEnum, { nullable: true })
  @IsOptional()
  @IsEnum(TutorPayoutProviderEnum)
  tutorPayoutProvider?: TutorPayoutProviderEnum;
}
