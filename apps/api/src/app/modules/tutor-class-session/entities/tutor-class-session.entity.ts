import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, Unique } from 'typeorm';
import { QBaseEntity } from '../../../common/base-entities/base.entity';
import { TutorCalendar } from '../../tutor-calendar/entities/tutor-calendar.entity';
import { TutorOfferingEntity } from '../../tutor/entities/tutor-offering.entity';
import { ClassSessionDeliveryModeEnum } from '../enums/class-session-delivery-mode.enum';
import { ClassSessionStatusEnum } from '../enums/class-session-status.enum';
import { TutorClassSessionEnrollmentEntity } from './tutor-class-session-enrollment.entity';

/**
 * One batch class session per calendar slot (v1).
 * batch_size is snapshotted from the offering rate card at session creation.
 */
@Entity('tutor_class_session')
@Unique('UQ_tutor_class_session_tutor_calendar_id', ['tutorCalendarId'])
export class TutorClassSessionEntity extends QBaseEntity {
  @Column({ name: 'tutor_calendar_id', type: 'integer' })
  @Index()
  tutorCalendarId: number;

  @ManyToOne(() => TutorCalendar, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tutor_calendar_id' })
  tutorCalendar?: TutorCalendar;

  @Column({ name: 'tutor_offering_id', type: 'integer' })
  @Index()
  tutorOfferingId: number;

  @ManyToOne(() => TutorOfferingEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tutor_offering_id' })
  tutorOffering?: TutorOfferingEntity;

  @Column({
    type: 'enum',
    enum: ClassSessionDeliveryModeEnum,
    name: 'delivery_mode',
  })
  deliveryMode: ClassSessionDeliveryModeEnum;

  @Column({ name: 'batch_size', type: 'smallint' })
  batchSize: number;

  @Column({
    type: 'enum',
    enum: ClassSessionStatusEnum,
    default: ClassSessionStatusEnum.open,
  })
  @Index()
  status: ClassSessionStatusEnum;

  @OneToMany(() => TutorClassSessionEnrollmentEntity, (e) => e.session)
  enrollments?: TutorClassSessionEnrollmentEntity[];
}
