import { Entity, Column } from 'typeorm';
import { ObjectType, Field } from '@nestjs/graphql';
import { QBaseEntity } from '../../../common/base-entities/base.entity';
import { TutorCertificationStageEnum } from '../enums/tutor.enums';

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
  @Field(() => TutorCertificationStageEnum, { nullable: true })
  @Column({
    type: 'enum',
    enum: TutorCertificationStageEnum,
    nullable: true,
    default: TutorCertificationStageEnum.REGISTERED,
  })
  certificationStage?: TutorCertificationStageEnum;

  @Field()
  @Column({ default: false })
  regFeePaid: boolean;

  @Field({ nullable: true })
  @Column({ type: 'decimal', precision: 8, scale: 2, default: 0 })
  regFeeAmount: number;

  @Field({ nullable: true })
  @Column({ type: 'decimal', precision: 8, scale: 2, default: 999 })
  regFeeAmountToBePaid: number;

  @Field({ nullable: true })
  @Column('timestamp', { nullable: true })
  regFeeDate: Date;

}

