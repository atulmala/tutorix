import { Field, InputType, Int, ObjectType } from '@nestjs/graphql';
import { IsInt, IsString, Min } from 'class-validator';

@ObjectType()
export class ProfilePictureUploadUrlResult {
  @Field()
  uploadUrl: string;

  @Field()
  storageKey: string;

  @Field(() => Int)
  expiresInSeconds: number;

  @Field()
  contentType: string;
}

@InputType()
export class ConfirmProfilePictureUploadInput {
  @Field()
  @IsString()
  storageKey: string;

  @Field()
  @IsString()
  mimeType: string;

  @Field(() => Int)
  @IsInt()
  @Min(1)
  sizeBytes: number;
}
