import { Field, Float, InputType } from '@nestjs/graphql';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

@InputType()
export class AdminUpdatePaymentGatewayFeeInput {
  @Field({ description: 'Provider key of the row to update' })
  @IsString()
  @MaxLength(32)
  @Matches(/^[a-z0-9_]+$/, {
    message: 'Provider key must be lowercase letters, numbers, or underscores',
  })
  provider!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  displayName?: string;

  @Field(() => Float)
  @IsNumber()
  @Min(0)
  @Max(100)
  chargePercent!: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
