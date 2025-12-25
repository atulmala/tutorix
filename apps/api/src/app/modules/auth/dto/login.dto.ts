import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

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
}

