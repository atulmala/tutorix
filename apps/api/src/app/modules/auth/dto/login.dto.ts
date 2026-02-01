import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsString, MinLength, IsOptional, IsIn } from 'class-validator';

@InputType()
export class LoginInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  loginId: string; // Mobile number for tutors/students, email for admins

  @Field()
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string;

  /** Platform: web | ios | android. Defaults to web if not provided. */
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @IsIn(['web', 'ios', 'android'])
  platform?: string;
}

