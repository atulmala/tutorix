import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tutor } from '../tutor/entities/tutor.entity';
import { DocumentEntity } from './entities/document.entity';
import {
  DocumentUploadResolver,
  TutorDocumentsFieldResolver,
} from './resolvers/document.resolver';
import { DocumentService } from './services/document.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([DocumentEntity, Tutor]),
  ],
  providers: [
    DocumentService,
    DocumentUploadResolver,
    TutorDocumentsFieldResolver,
  ],
  exports: [DocumentService, TypeOrmModule],
})
export class DocumentModule {}
