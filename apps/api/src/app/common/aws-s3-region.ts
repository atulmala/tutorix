import { ConfigService } from '@nestjs/config';

/**
 * Region for the documents S3 bucket. Prefer S3_DOCUMENTS_BUCKET_REGION so
 * AWS_REGION can match EC2 / Secrets Manager (us-east-1) while the bucket
 * stays in us-east-2.
 */
export function resolveS3DocumentsRegion(config: ConfigService): string {
  return (
    config.get<string>('S3_DOCUMENTS_BUCKET_REGION')?.trim() ||
    process.env.S3_DOCUMENTS_BUCKET_REGION?.trim() ||
    config.get<string>('AWS_REGION')?.trim() ||
    config.get<string>('AWS_DEFAULT_REGION')?.trim() ||
    'us-east-1'
  );
}
