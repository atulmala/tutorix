import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsString, MinLength, Matches, IsOptional, IsEmail, IsEnum, IsIn } from 'class-validator';
import { Gender } from '../enums/gender.enum';
import { UserRole } from '../enums/user-role.enum';

@InputType()
export class UserSignupInput {
  @Field()
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @Field({ defaultValue: '+91' })
  @IsOptional()
  @IsString()
  @Matches(/^\+\d{1,3}$/, { message: 'Country code must be in +<code> format' })
  mobileCountryCode?: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{10}$/, { message: 'Mobile number must be 10 digits' })
  mobileNumber: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;

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

  @Field(() => UserRole, { defaultValue: UserRole.UNKNOWN })
  @IsEnum(UserRole)
  role: UserRole = UserRole.UNKNOWN;

  /** Platform: web | ios | android. Defaults to web. */
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @IsIn(['web', 'ios', 'android'])
  platform?: string;
}

