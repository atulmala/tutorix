import { Field, InputType, Int } from '@nestjs/graphql';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { DocumentTypeEnum } from '../enums/document-type.enum';

const ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/png'] as const;

@InputType()
export class RequestTutorDocumentUploadUrlInput {
  @Field(() => DocumentTypeEnum, {
    description: 'Onboarding document type (Aadhaar, PAN, XII marksheet, highest degree)',
  })
  @IsEnum(DocumentTypeEnum)
  documentType: DocumentTypeEnum;

  @Field({ description: 'MIME type of the file to upload' })
  @IsIn([...ALLOWED_MIME])
  mimeType: string;

  @Field(() => Int, { description: 'Exact file size in bytes' })
  @IsInt()
  @Min(1)
  @Max(10 * 1024 * 1024)
  byteSize: number;

  @Field({ nullable: true, description: 'Original filename for display only' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  originalFilename?: string;
}
