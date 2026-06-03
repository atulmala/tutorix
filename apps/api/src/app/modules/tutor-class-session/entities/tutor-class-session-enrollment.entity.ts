import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { QBaseEntity } from '../../../common/base-entities/base.entity';
import { ClassSessionEnrollmentStatusEnum } from '../enums/class-session-enrollment-status.enum';
import { TutorClassSessionEntity } from './tutor-class-session.entity';

@Entity('tutor_class_session_enrollment')
@Unique('UQ_tutor_class_session_enrollment_session_student', ['sessionId', 'studentId'])
export class TutorClassSessionEnrollmentEntity extends QBaseEntity {
  @Column({ name: 'session_id', type: 'integer' })
  @Index()
  sessionId: number;

  @ManyToOne(() => TutorClassSessionEntity, (session) => session.enrollments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'session_id' })
  session?: TutorClassSessionEntity;

  /** FK to student table when the student module exists. */
  @Column({ name: 'student_id', type: 'integer' })
  @Index()
  studentId: number;

  @Column({
    type: 'enum',
    enum: ClassSessionEnrollmentStatusEnum,
    default: ClassSessionEnrollmentStatusEnum.confirmed,
  })
  @Index()
  status: ClassSessionEnrollmentStatusEnum;
}
