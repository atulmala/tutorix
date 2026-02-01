import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsString, MinLength, IsEmail, IsEnum, Matches, IsOptional, IsIn } from 'class-validator';
import { UserRole } from '../enums/user-role.enum';
import { Gender } from '../enums/gender.enum';

@InputType()
export class RegisterInput {
  @Field(() => UserRole)
  @IsNotEmpty()
  @IsEnum(UserRole)
  role: UserRole;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'Mobile number must be a valid international phone number',
  })
  mobile?: string; // Required for TUTOR and STUDENT

  @Field({ nullable: true })
  @IsEmail()
  email: string; // Now required for all

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

  /** Platform: web | ios | android. Defaults to web. */
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @IsIn(['web', 'ios', 'android'])
  platform?: string;
}

