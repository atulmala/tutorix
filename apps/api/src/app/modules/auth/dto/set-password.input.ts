import { InputType, Field, Int } from '@nestjs/graphql';
import { IsInt, IsNotEmpty, IsPositive, IsString, MinLength } from 'class-validator';

@InputType()
export class SetPasswordInput {
  @Field(() => Int)
  @IsInt()
  @IsPositive()
  userId: number;

  @Field()
  @IsNotEmpty()
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;
}

