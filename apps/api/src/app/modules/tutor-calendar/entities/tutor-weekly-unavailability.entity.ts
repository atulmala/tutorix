import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { Field, Int, ObjectType } from '@nestjs/graphql';
import { QBaseEntity } from '../../../common/base-entities/base.entity';
import { Tutor } from '../../tutor/entities/tutor.entity';

@ObjectType()
@Entity('tutor_weekly_unavailability')
@Unique('UQ_tutor_weekly_unavailability_slot', [
  'tutorId',
  'istDayOfWeek',
  'startHour',
  'startMinute',
])
export class TutorWeeklyUnavailability extends QBaseEntity {
  @Field(() => Int)
  @Column({ name: 'tutor_id', type: 'integer' })
  @Index()
  tutorId!: number;

  @ManyToOne(() => Tutor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tutor_id' })
  tutor?: Tutor;

  /** IST weekday: 0 = Sunday … 6 = Saturday. */
  @Field(() => Int)
  @Column({ name: 'ist_day_of_week', type: 'smallint' })
  istDayOfWeek!: number;

  @Field(() => Int)
  @Column({ name: 'start_hour', type: 'smallint' })
  startHour!: number;

  @Field(() => Int)
  @Column({ name: 'start_minute', type: 'smallint' })
  startMinute!: number;
}
