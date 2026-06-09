import { Field, InputType, Int } from '@nestjs/graphql';
import { IsInt, IsString, Max, Min } from 'class-validator';

@InputType()
export class RequestProfilePictureUploadUrlInput {
  @Field()
  @IsString()
  mimeType: string;

  @Field(() => Int)
  @IsInt()
  @Min(1)
  @Max(5 * 1024 * 1024)
  byteSize: number;
}
