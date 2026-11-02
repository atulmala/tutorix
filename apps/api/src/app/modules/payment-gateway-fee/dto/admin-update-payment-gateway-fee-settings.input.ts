import { Field, Float, InputType } from '@nestjs/graphql';
import { IsNumber, Max, Min } from 'class-validator';

@InputType()
export class AdminUpdatePaymentGatewayFeeSettingsInput {
  @Field(() => Float)
  @IsNumber()
  @Min(0)
  @Max(100)
  gstRatePercent!: number;
}
