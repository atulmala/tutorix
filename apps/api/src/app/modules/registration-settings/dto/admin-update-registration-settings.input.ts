import { Field, InputType } from '@nestjs/graphql';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

@InputType()
export class AdminUpdateRegistrationSettingsInput {
  @Field()
  @IsBoolean()
  tutorRegistrationEnabled!: boolean;

  @Field()
  @IsBoolean()
  studentRegistrationEnabled!: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  disabledMessage?: string;
}
