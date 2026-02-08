import { Entity, Column, OneToOne, JoinColumn, OneToMany } from 'typeorm';
import { ObjectType, Field, Int } from '@nestjs/graphql';
import { QBaseEntity } from '../../../common/base-entities/base.entity';
import { TutorCertificationStageEnum } from '../enums/tutor.enums';
import { User } from '../../auth/entities/user.entity';
import { AddressEntity } from '../../address/entities/address.entity';
import { TutorQualificationEntity } from './tutor-qualification.entity';
import { DocumentEntity } from '../../document/entities/document.entity';

/**
 * Tutor Entity
 * 
 * Represents a tutor in the system.
 * Extends QBaseEntity to inherit common fields:
 * - id, version, deleted, active, createdDate, updatedDate, m_id
 */
@ObjectType()
@Entity('tutor')
export class Tutor extends QBaseEntity {
  @Field(() => Int)
  @Column({ name: 'user_id', unique: true, type: 'integer' })
  userId: number;

  @Field(() => User, { nullable: true })
  @OneToOne(() => User, (user) => user.tutor, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Field(() => TutorCertificationStageEnum, { nullable: true })
  @Column({
    type: 'enum',
    enum: TutorCertificationStageEnum,
    nullable: true,
    default: TutorCertificationStageEnum.address,
  })
  certificationStage?: TutorCertificationStageEnum;

  @Field()
  @Column({ default: false })
  regFeePaid: boolean;

  @Field()
  @Column({ name: 'on_boarding_complete', default: false })
  onBoardingComplete: boolean;

  @Field({ nullable: true })
  @Column({ type: 'decimal', precision: 8, scale: 2, default: 0 })
  regFeeAmount: number;

  @Field({ nullable: true })
  @Column({ type: 'decimal', precision: 8, scale: 2, default: 999 })
  regFeeAmountToBePaid: number;

  @Field({ nullable: true })
  @Column('timestamp', { nullable: true })
  regFeeDate: Date;

  @Field({ nullable: true, defaultValue: '+91' })
  @Column({ name: 'whatsapp_country_code', nullable: true, default: '+91' })
  whatsappCountryCode?: string;

  @Field({ nullable: true })
  @Column({ name: 'whatsapp_number', nullable: true, length: 10 })
  whatsappNumber?: string;

  @Field(() => [AddressEntity], { nullable: true })
  @OneToMany(() => AddressEntity, (address) => address.tutor, {
    cascade: ['insert', 'update', 'remove'],
  })
  addresses: AddressEntity[];

  @Field(() => [TutorQualificationEntity], { nullable: true })
  @OneToMany(() => TutorQualificationEntity, (qual) => qual.tutor, {
    cascade: ['insert', 'update', 'remove'],
  })
  qualifications: TutorQualificationEntity[];

  @Field(() => [DocumentEntity], { nullable: true })
  @OneToMany(() => DocumentEntity, (doc) => doc.tutor, {
    cascade: ['insert', 'update', 'remove'],
  })
  documents: DocumentEntity[];
}

