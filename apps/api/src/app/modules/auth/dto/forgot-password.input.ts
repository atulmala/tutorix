import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsString, IsEmail } from 'class-validator';

@InputType()
export class ForgotPasswordInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  @IsEmail()
  email: string;
}
