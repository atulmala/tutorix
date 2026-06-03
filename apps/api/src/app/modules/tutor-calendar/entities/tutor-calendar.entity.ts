import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { Field, Int, ObjectType } from '@nestjs/graphql';
import { QBaseEntity } from '../../../common/base-entities/base.entity';
import { Tutor } from '../../tutor/entities/tutor.entity';

@ObjectType()
@Entity('tutor_calendar')
@Unique('UQ_tutor_calendar_tutor_starts_at', ['tutorId', 'startsAt'])
export class TutorCalendar extends QBaseEntity {
  @Field(() => Int)
  @Column({ name: 'tutor_id', type: 'integer' })
  @Index()
  tutorId: number;

  @Field(() => Tutor, { nullable: true })
  @ManyToOne(() => Tutor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tutor_id' })
  tutor?: Tutor;

  @Field()
  @Column({ name: 'starts_at', type: 'timestamptz' })
  startsAt: Date;

  @Field(() => Int)
  @Column({ name: 'duration_minutes', type: 'smallint', default: 60 })
  durationMinutes: number;
}
