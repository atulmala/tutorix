import { Column, Entity, Index } from 'typeorm';
import { QBaseEntity } from '../../../common/base-entities/base.entity';

export type TutorClassEmailKind = 'booking' | 'scheduling';

/** A tutor email line waiting for the hourly booking or scheduling batch. */
@Entity('tutor_class_email_queue')
@Index(['tutorUserId', 'kind', 'sentAt'])
export class TutorClassEmailQueueEntity extends QBaseEntity {
  @Column({ name: 'tutor_user_id', type: 'integer' })
  @Index()
  tutorUserId!: number;

  @Column({ name: 'tutor_name', type: 'varchar', length: 200 })
  tutorName!: string;

  @Column({ type: 'varchar', length: 20 })
  kind!: TutorClassEmailKind;

  @Column({ name: 'student_name', type: 'varchar', length: 200 })
  studentName!: string;

  @Column({ name: 'offering_label', type: 'varchar', length: 300 })
  offeringLabel!: string;

  @Column({ name: 'delivery_mode', type: 'varchar', length: 20 })
  deliveryMode!: string;

  @Column({ name: 'class_count', type: 'integer', nullable: true })
  classCount?: number | null;

  @Column({ name: 'amount_inr', type: 'integer', nullable: true })
  amountInr?: number | null;

  @Column({ name: 'is_demo', type: 'boolean', default: false })
  isDemo!: boolean;

  @Column({ name: 'starts_at', type: 'timestamptz', nullable: true })
  startsAt?: Date | null;

  @Column({ name: 'duration_minutes', type: 'integer', nullable: true })
  durationMinutes?: number | null;

  @Column({ name: 'enrollment_id', type: 'integer', nullable: true })
  enrollmentId?: number | null;

  /** Stable key so the same booking is not queued twice. */
  @Column({ name: 'source_key', type: 'varchar', length: 200 })
  @Index()
  sourceKey!: string;

  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true })
  sentAt?: Date | null;
}
