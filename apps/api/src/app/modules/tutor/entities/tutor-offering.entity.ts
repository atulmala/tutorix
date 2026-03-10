import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  Unique,
} from 'typeorm';
import { Field, Int, ObjectType } from '@nestjs/graphql';
import { QBaseEntity } from '../../../common/base-entities/base.entity';
import { Tutor } from './tutor.entity';
import { OfferingEntity } from '../../offerings/entities/offering.entity';
import { ProficiencyTestEntity } from '../../proficiency/entities/proficiency-test.entity';
import { TutorOfferingStatusEnum } from '../enums/tutor.enums';

/**
 * Links a tutor to an offering (leaf) and stores proficiency test attempt state.
 * One row per (tutor, offering) - each new offering gets fresh 2 attempts.
 */
@ObjectType()
@Entity('tutor_offering')
@Unique('UQ_tutor_offering_tutor_offering', ['tutorId', 'offeringId'])
export class TutorOfferingEntity extends QBaseEntity {
  @Field(() => Int)
  @Column({ name: 'tutor_id', type: 'integer' })
  tutorId: number;

  @Field(() => Tutor, { nullable: true })
  @ManyToOne(() => Tutor, (tutor) => tutor.tutorOfferings, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tutor_id' })
  tutor?: Tutor;

  @Field(() => Int)
  @Column({ name: 'offering_id', type: 'integer' })
  offeringId: number;

  @Field(() => OfferingEntity, { nullable: true })
  @ManyToOne(() => OfferingEntity, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'offering_id' })
  offering?: OfferingEntity;

  @Field(() => Int)
  @Column({ name: 'proficiency_test_id', type: 'integer' })
  proficiencyTestId: number;

  @Field(() => ProficiencyTestEntity, { nullable: true })
  @ManyToOne(() => ProficiencyTestEntity, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'proficiency_test_id' })
  proficiencyTest?: ProficiencyTestEntity;

  @Field(() => TutorOfferingStatusEnum)
  @Column({
    type: 'enum',
    enum: TutorOfferingStatusEnum,
    default: TutorOfferingStatusEnum.pending_pt,
  })
  @Index()
  status: TutorOfferingStatusEnum;

  @Field(() => Int, {
    description: 'Number of PT attempts used (0, 1, or 2). Resets when retrying after 30-day pause.',
  })
  @Column({ name: 'attempts_used', type: 'smallint', default: 0 })
  attemptsUsed: number;

  @Field(() => Int, { nullable: true })
  @Column({ name: 'last_score', type: 'integer', nullable: true })
  lastScore?: number;

  @Field(() => Int, { nullable: true })
  @Column({ name: 'last_max_score', type: 'integer', nullable: true })
  lastMaxScore?: number;

  @Field({ nullable: true })
  @Column({ name: 'passed_at', type: 'timestamp', nullable: true })
  passedAt?: Date;

  @Field({ nullable: true })
  @Column({ name: 'last_attempt_at', type: 'timestamp', nullable: true })
  lastAttemptAt?: Date;

  @Field({
    description: 'True if added during initial onboarding; false for post-onboarding additions.',
  })
  @Column({ name: 'is_initial_onboarding', default: true })
  isInitialOnboarding: boolean;
}
