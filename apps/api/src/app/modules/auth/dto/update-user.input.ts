import { InputType, Field, Int } from '@nestjs/graphql';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  IsDateString,
} from 'class-validator';
import { UserRole } from '../enums/user-role.enum';
import { Gender } from '../enums/gender.enum';

@InputType()
export class UpdateUserInput {
  @Field(() => Int)
  @IsInt()
  @IsPositive()
  userId: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsEmail()
  email?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @Matches(/^\+\d{1,3}$/, { message: 'Country code must be in +<code> format' })
  mobileCountryCode?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @Matches(/^\d{6,15}$/, { message: 'Mobile number must be between 6 and 15 digits' })
  mobileNumber?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  firstName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  lastName?: string;

  @Field(() => UserRole, { nullable: true })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @Field(() => Gender, { nullable: true })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @Field(() => Date, { nullable: true })
  @IsOptional()
  @IsDateString()
  dob?: Date;

  @Field({ nullable: true })
  @IsOptional()
  isSignupComplete?: boolean;
}

