import { Entity, Column, OneToOne, JoinColumn, OneToMany } from 'typeorm';
import { ObjectType, Field, Int } from '@nestjs/graphql';
import { QBaseEntity } from '../../../common/base-entities/base.entity';
import { User } from '../../auth/entities/user.entity';
import { AddressEntity } from '../../address/entities/address.entity';
import {
  ParentRelationEnum,
  SchoolBoardEnum,
  StudentOnboardingStageEnum,
  StudentTypeEnum,
} from '../enums/student.enums';

@ObjectType()
@Entity('student')
export class Student extends QBaseEntity {
  @Field(() => Int)
  @Column({ name: 'user_id', unique: true, type: 'integer' })
  userId: number;

  @Field(() => User, { nullable: true })
  @OneToOne(() => User, (user) => user.student, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Field(() => StudentOnboardingStageEnum, { nullable: true })
  @Column({
    type: 'enum',
    enum: StudentOnboardingStageEnum,
    name: 'onboarding_stage',
    nullable: true,
    default: StudentOnboardingStageEnum.parent,
  })
  onboardingStage?: StudentOnboardingStageEnum;

  @Field(() => Date, { nullable: true })
  @Column('timestamp', { name: 'onboarding_stage_entered_at', nullable: true })
  onboardingStageEnteredAt?: Date;

  @Field()
  @Column({ name: 'on_boarding_complete', default: false })
  onBoardingComplete: boolean;

  @Field({ nullable: true })
  @Column({ name: 'reg_fee_paid', default: false })
  regFeePaid?: boolean;

  @Field({ nullable: true })
  @Column({ type: 'decimal', precision: 8, scale: 2, default: 0 })
  regFeeAmount?: number;

  @Field({ nullable: true })
  @Column({ type: 'decimal', precision: 8, scale: 2, default: 499 })
  regFeeAmountToBePaid?: number;

  @Field(() => Date, { nullable: true })
  @Column('timestamp', { name: 'reg_fee_date', nullable: true })
  regFeeDate?: Date;

  @Field(() => ParentRelationEnum, { nullable: true })
  @Column({
    type: 'enum',
    enum: ParentRelationEnum,
    name: 'parent_relation',
    nullable: true,
  })
  parentRelation?: ParentRelationEnum;

  @Field({ nullable: true })
  @Column({ name: 'parent_name', nullable: true })
  parentName?: string;

  @Field(() => StudentTypeEnum, { nullable: true })
  @Column({
    type: 'enum',
    enum: StudentTypeEnum,
    name: 'student_type',
    nullable: true,
  })
  studentType?: StudentTypeEnum;

  @Field(() => Int, { nullable: true })
  @Column({ name: 'school_class', type: 'smallint', nullable: true })
  schoolClass?: number;

  @Field(() => SchoolBoardEnum, { nullable: true })
  @Column({
    type: 'enum',
    enum: SchoolBoardEnum,
    nullable: true,
  })
  board?: SchoolBoardEnum;

  @Field({ nullable: true })
  @Column({ name: 'board_other', nullable: true })
  boardOther?: string;

  @Field(() => [AddressEntity], { nullable: true })
  @OneToMany(() => AddressEntity, (address) => address.student, {
    cascade: ['insert', 'update', 'remove'],
  })
  addresses: AddressEntity[];
}
