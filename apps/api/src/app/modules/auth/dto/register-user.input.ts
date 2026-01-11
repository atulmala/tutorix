import { InputType, Field } from '@nestjs/graphql';
import { IsEmail, IsEnum, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { UserRole } from '../enums/user-role.enum';
import { Gender } from '../enums/gender.enum';

@InputType()
export class RegisterUserInput {
  @Field(() => UserRole)
  @IsEnum(UserRole)
  role: UserRole;

  @Field(() => String, { defaultValue: '+91' })
  @IsString()
  @Matches(/^\+\d{1,3}$/, { message: 'Country code must be in +<code> format' })
  mobileCountryCode: string;

  @Field()
  @IsString()
  @Matches(/^\d{6,15}$/, { message: 'Mobile number must be between 6 and 15 digits' })
  mobileNumber: string;

  @Field()
  @IsEmail()
  email: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  firstName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  lastName?: string;

  @Field(() => Gender, { defaultValue: Gender.OTHER })
  @IsEnum(Gender)
  gender: Gender = Gender.OTHER;
}

