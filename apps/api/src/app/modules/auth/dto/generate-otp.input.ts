import { InputType, Field, Int } from '@nestjs/graphql';
import { IsEnum, IsInt, IsPositive } from 'class-validator';
import { OtpPurpose } from '../enums/otp-purpose.enum';

@InputType()
export class GenerateOtpInput {
  @Field(() => Int)
  @IsInt()
  @IsPositive()
  userId: number;

  @Field(() => OtpPurpose)
  @IsEnum(OtpPurpose)
  purpose: OtpPurpose;
}

