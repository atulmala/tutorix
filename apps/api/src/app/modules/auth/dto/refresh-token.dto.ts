import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsString, IsOptional, IsIn } from 'class-validator';

@InputType()
export class RefreshTokenInput {
  @Field()
  @IsNotEmpty()
  @IsString()
  refreshToken: string;

  /** Platform when refreshing (inherits from old token if omitted). */
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @IsIn(['web', 'ios', 'android'])
  platform?: string;
}

