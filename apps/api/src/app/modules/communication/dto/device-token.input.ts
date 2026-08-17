import { Field, InputType } from '@nestjs/graphql';
import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';
import { DevicePlatform } from '../enums/device-platform.enum';

@InputType()
export class RegisterDeviceTokenInput {
  @Field()
  @IsString()
  @MinLength(8)
  @MaxLength(512)
  token: string;

  @Field(() => DevicePlatform)
  @IsEnum(DevicePlatform)
  platform: DevicePlatform;
}

@InputType()
export class UnregisterDeviceTokenInput {
  @Field()
  @IsString()
  @MinLength(8)
  @MaxLength(512)
  token: string;
}
