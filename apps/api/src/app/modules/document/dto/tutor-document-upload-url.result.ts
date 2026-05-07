import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType({ description: 'Presigned S3 PUT URL and metadata for tutor document upload' })
export class TutorDocumentUploadUrlResult {
  @Field({ description: 'Full URL for HTTP PUT (include Content-Type header when uploading)' })
  uploadUrl: string;

  @Field({ description: 'S3 object key; send back in confirmTutorDocumentUpload' })
  storageKey: string;

  @Field(() => Int, { description: 'URL expiry in seconds from issuance' })
  expiresInSeconds: number;

  @Field({
    description: 'MIME type the client must send as Content-Type on PUT (must match request)',
  })
  contentType: string;
}
