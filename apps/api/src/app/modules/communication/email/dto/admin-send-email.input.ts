import { Field, InputType } from '@nestjs/graphql';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

@InputType()
export class AdminSendEmailInput {
  @Field()
  @IsEmail()
  to: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  subject: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  body: string;
}
