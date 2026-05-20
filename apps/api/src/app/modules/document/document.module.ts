import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tutor } from '../tutor/entities/tutor.entity';
import { DocumentEntity } from './entities/document.entity';
import { DocumentScreeningEntity } from './entities/document-screening.entity';
import {
  DocumentUploadResolver,
  TutorDocumentsFieldResolver,
} from './resolvers/document.resolver';
import { DocumentEntityResolver } from './resolvers/document-entity.resolver';
import { DocumentService } from './services/document.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([DocumentEntity, DocumentScreeningEntity, Tutor]),
  ],
  providers: [
    DocumentService,
    DocumentUploadResolver,
    TutorDocumentsFieldResolver,
    DocumentEntityResolver,
  ],
  exports: [DocumentService, TypeOrmModule],
})
export class DocumentModule {}
