import { DataSourceOptions } from 'typeorm';
import { join } from 'path';
import { DatabaseCredentials } from './database-credentials.loader';

// Explicitly import all entities to ensure they're registered
import { User } from '../modules/auth/entities/user.entity';
import { RefreshToken } from '../modules/auth/entities/refresh-token.entity';
import { Otp } from '../modules/auth/entities/otp.entity';
import { PasswordResetToken } from '../modules/auth/entities/password-reset-token.entity';
import { Tutor } from '../modules/tutor/entities/tutor.entity';
import { AddressEntity } from '../modules/address/entities/address.entity';
import { TutorQualificationEntity } from '../modules/tutor/entities/tutor-qualification.entity';
import { TutorOfferingEntity } from '../modules/tutor/entities/tutor-offering.entity';
import { DocumentEntity } from '../modules/document/entities/document.entity';
import { DocumentScreeningEntity } from '../modules/document/entities/document-screening.entity';
import { BatchJobRunEntity } from '../batch-jobs/entities/batch-job-run.entity';
import { ExperienceEntity } from '../modules/experience/entities/experience.entity';
import { OfferingEntity } from '../modules/offerings/entities/offering.entity';
import { ProficiencyTestEntity } from '../modules/proficiency/entities/proficiency-test.entity';
import { PTQuestionEntity } from '../modules/proficiency/entities/pt-question.entity';
import { PtAnswerEntity } from '../modules/proficiency/entities/pt-answer.entity';
import { Example } from '../entities/example.entity';
// Add other entities as they are created

/**
 * Creates database options with credentials
 * Credentials are loaded from .env (dev/staging) or  AWS Secrets Manager (production)
 */
export function createDatabaseOptions(
  credentials: DatabaseCredentials,
): DataSourceOptions {
  return {
    type: 'postgres',
    host: credentials.host || process.env.DB_HOST || 'localhost',
    port: credentials.port || parseInt(process.env.DB_PORT || '5432', 10),
    username: credentials.username,
    password: credentials.password,
    database: credentials.database || process.env.DB_NAME || 'tutorix',

    // Explicitly register all entities
    // This is more reliable than glob patterns, especially in compiled environments
    entities: [
      User,
      RefreshToken,
      Otp,
      PasswordResetToken,
      Tutor,
      AddressEntity,
      TutorQualificationEntity,
      TutorOfferingEntity,
      DocumentEntity,
      DocumentScreeningEntity,
      BatchJobRunEntity,
      ExperienceEntity,
      OfferingEntity,
      ProficiencyTestEntity,
      PTQuestionEntity,
      PtAnswerEntity,
      Example, // Remove this when you no longer need the example entity
      // Add other entities here as they are created
      // Student,
      // Class,
    ],

    // Migrations configuration
    // Note: .ts migration files are not available in the Docker webpack bundle.
    // Use DB_SYNCHRONIZE=true in Docker to auto-create schema from entities.
    migrations: [join(__dirname, '..', '..', 'migrations', '*.ts')],
    migrationsTableName: 'migrations',

    // synchronize: auto-create/update schema from entities.
    // Enable via DB_SYNCHRONIZE=true env (Docker/fresh DB).
    // Never enable against a production DB with existing data you want to keep.
    synchronize: process.env.DB_SYNCHRONIZE === 'true',

    // Logging configuration: disable SQL query logs (too verbose)
    // Set to ['error', 'warn'] to keep important logs but exclude SQL queries
    logging: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : false,
  };
}


