import { Field, InputType, Int } from '@nestjs/graphql';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { DocumentTypeEnum } from '../enums/document-type.enum';

const ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/png'] as const;

@InputType()
export class ConfirmTutorDocumentUploadInput {
  @Field(() => DocumentTypeEnum, {
    description: 'Same document type as used when requesting the upload URL',
  })
  @IsEnum(DocumentTypeEnum)
  documentType: DocumentTypeEnum;

  @Field({ description: 'storageKey returned from requestTutorDocumentUploadUrl' })
  @IsString()
  @MaxLength(1024)
  storageKey: string;

  @Field({ description: 'MIME type of the uploaded object' })
  @IsIn([...ALLOWED_MIME])
  mimeType: string;

  @Field(() => Int, { description: 'Uploaded file size in bytes' })
  @IsInt()
  @Min(1)
  @Max(10 * 1024 * 1024)
  sizeBytes: number;

  @Field({ nullable: true, description: 'Original filename for display' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  originalFilename?: string;
}
