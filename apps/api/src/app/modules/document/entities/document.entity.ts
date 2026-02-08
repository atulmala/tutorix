import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { Field, Int, ObjectType } from '@nestjs/graphql';
import { QBaseEntity } from '../../../common/base-entities/base.entity';
import { DocumentTypeEnum } from '../enums/document-type.enum';
import { DocumentForTypeEnum } from '../enums/document-for-type.enum';
import { Tutor } from '../../tutor/entities/tutor.entity';
import { User } from '../../auth/entities/user.entity';

/**
 * Single entity for a document and its file metadata.
 * No separate "attachment" entity: file details (storage key, size, thumbnails) live here.
 */
@ObjectType()
@Entity('document')
export class DocumentEntity extends QBaseEntity {
  @Field()
  @Column()
  name: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  description: string;

  @Field(() => DocumentTypeEnum, { nullable: true })
  @Column({
    type: 'smallint',
    name: 'document_type',
    default: DocumentTypeEnum.OTHER,
  })
  documentType: DocumentTypeEnum;

  @Field(() => DocumentForTypeEnum, { nullable: true })
  @Column({
    type: 'smallint',
    name: 'document_for_type',
    default: DocumentForTypeEnum.OTHER,
  })
  documentForType: DocumentForTypeEnum;

  @Field({ nullable: true })
  @Column({ name: 'verified', default: false })
  verified: boolean;

  @Field(() => User, { nullable: true })
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'verified_by_id' })
  verifiedBy?: User;

  @Field({ nullable: true })
  @Column({ name: 'verified_date', type: 'timestamp', nullable: true })
  verifiedDate?: Date;

  @Field(() => Int, { nullable: true })
  @Column({ name: 'tutor_id', type: 'integer', nullable: true })
  tutorId?: number;

  @Field(() => Tutor, { nullable: true })
  @ManyToOne(() => Tutor, (tutor) => tutor.documents, { nullable: true })
  @JoinColumn({ name: 'tutor_id' })
  tutor?: Tutor;

  @Field(() => Int, { nullable: true })
  @Column({ name: 'user_id', type: 'integer', nullable: true })
  userId?: number;

  @Field(() => User, { nullable: true })
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  // --- File / storage metadata (no separate attachment entity) ---

  @Field({ nullable: true, description: 'Original file name as uploaded' })
  @Column({ name: 'filename', nullable: true })
  filename: string;

  @Field({ nullable: true, description: 'MIME type e.g. application/pdf, image/jpeg' })
  @Column({ name: 'mime_type', length: 100, nullable: true })
  mimeType: string;

  @Field(() => Int, { nullable: true })
  @Column({ type: 'int', default: 0 })
  size: number;

  @Field({ nullable: true, description: 'Storage key (e.g. S3 object key) for the main file' })
  @Column({ name: 'storage_key', nullable: true })
  storageKey: string;

  @Field({ nullable: true, description: 'URL or key for small thumbnail (e.g. 300x300)' })
  @Column({ name: 'thumbnail_small', nullable: true })
  thumbnailSmall: string;

  @Field({ nullable: true, description: 'URL or key for medium thumbnail (e.g. 600x600)' })
  @Column({ name: 'thumbnail_medium', nullable: true })
  thumbnailMedium: string;

  @Field({ nullable: true, description: 'URL or key for large thumbnail (e.g. 1024x1024)' })
  @Column({ name: 'thumbnail_large', nullable: true })
  thumbnailLarge: string;

  @Field({ nullable: true, description: 'URL or key for original/original-size image' })
  @Column({ name: 'original_url', nullable: true })
  originalUrl: string;

  @Field({ nullable: true })
  @Column({ name: 'average_color', nullable: true })
  averageColor: string;

  @Field(() => Int, { nullable: true })
  @Column({ name: 'width', type: 'int', default: 0 })
  width: number;

  @Field(() => Int, { nullable: true })
  @Column({ name: 'height', type: 'int', default: 0 })
  height: number;
}
