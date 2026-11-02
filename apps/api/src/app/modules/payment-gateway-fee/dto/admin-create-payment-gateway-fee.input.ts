import { Field, Float, InputType } from '@nestjs/graphql';
import { IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

@InputType()
export class AdminCreatePaymentGatewayFeeInput {
  @Field({ description: 'Display name shown in admin (e.g. PayU)' })
  @IsString()
  @MaxLength(128)
  displayName!: string;

  @Field(() => Float)
  @IsNumber()
  @Min(0)
  @Max(100)
  chargePercent!: number;

  @Field({
    nullable: true,
    description:
      'Optional stable key (lowercase, a-z 0-9 _). Auto-generated from name when omitted.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  providerKey?: string;
}
