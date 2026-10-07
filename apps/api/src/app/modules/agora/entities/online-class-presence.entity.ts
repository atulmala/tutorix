import { Column, Entity, Index } from 'typeorm';
import { QBaseEntity } from '../../../common/base-entities/base.entity';

/**
 * One connected stretch in an Agora RTC class channel.
 * A drop and a later rejoin are two rows. The gap between them is not stored.
 */
@Entity('online_class_presence')
export class OnlineClassPresenceEntity extends QBaseEntity {
  /** Agora notice id for the join (107). Unique so a retried webhook is ignored. */
  @Column({ name: 'join_notice_id', type: 'varchar', nullable: true, unique: true })
  joinNoticeId?: string | null;

  /** Agora notice id for the leave (108). Unique so a retried leave is ignored. */
  @Column({ name: 'leave_notice_id', type: 'varchar', nullable: true, unique: true })
  leaveNoticeId?: string | null;

  @Column({ name: 'session_id', type: 'integer' })
  @Index()
  sessionId!: number;

  /** RTC uid, which is the Tutorix user id. */
  @Column({ name: 'user_id', type: 'integer' })
  @Index()
  userId!: number;

  @Column({ name: 'joined_at', type: 'timestamp', nullable: true })
  joinedAt?: Date | null;

  @Column({ name: 'left_at', type: 'timestamp', nullable: true })
  leftAt?: Date | null;

  /** Seconds Agora counted for this stretch. Null while the participant is still connected. */
  @Column({ name: 'duration_seconds', type: 'integer', nullable: true })
  durationSeconds?: number | null;

  /** Agora leave reason (quit, dropped, banned, and so on). */
  @Column({ name: 'leave_reason', type: 'smallint', nullable: true })
  leaveReason?: number | null;
}
