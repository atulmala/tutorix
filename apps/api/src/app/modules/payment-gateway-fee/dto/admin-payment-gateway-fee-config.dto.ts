import { Field, Float, ObjectType } from '@nestjs/graphql';
import { PaymentGatewayFeeConfigEntity } from '../entities/payment-gateway-fee-config.entity';

@ObjectType()
export class AdminPaymentGatewayFeeConfigResult {
  @Field(() => Float)
  gstRatePercent!: number;

  @Field(() => [PaymentGatewayFeeConfigEntity])
  gateways!: PaymentGatewayFeeConfigEntity[];
}
