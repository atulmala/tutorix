import { Field, InputType, Int } from '@nestjs/graphql';
import { IsDateString, IsEnum, IsInt, IsNotEmpty, IsPositive, Length } from 'class-validator';
import { OtpPurpose } from '../enums/otp-purpose.enum';

@InputType()
export class VerifyOtpInput {
  @Field(() => Int)
  @IsInt()
  @IsPositive()
  userId: number;

  @Field(() => OtpPurpose)
  @IsEnum(OtpPurpose)
  purpose: OtpPurpose;

  @Field(() => Date)
  @IsNotEmpty()
  @IsDateString()
  timestamp: Date;

  @Field()
  @IsNotEmpty()
  @Length(6, 6)
  otp: string;
}

