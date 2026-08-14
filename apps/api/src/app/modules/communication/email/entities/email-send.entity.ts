import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { QBaseEntity } from '../../../../common/base-entities/base.entity';
import { User } from '../../../auth/entities/user.entity';
import { UserRole } from '../../../auth/enums/user-role.enum';
import { EmailPurpose } from '../enums/email-purpose.enum';
import { EmailSendStatus } from '../enums/email-send-status.enum';

@Entity('email_send')
@Index(['userId', 'createdDate'])
@Index(['purpose', 'createdDate'])
@Index('UQ_email_send_ses_message_id', ['sesMessageId'], {
  unique: true,
  where: '"ses_message_id" IS NOT NULL',
})
export class EmailSendEntity extends QBaseEntity {
  @Column({ name: 'user_id', type: 'integer', nullable: true })
  userId: number | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @Column({ name: 'to_email' })
  toEmail: string;

  @Column({ name: 'recipient_name', type: 'varchar', nullable: true })
  recipientName: string | null;

  @Column({
    name: 'recipient_role',
    type: 'enum',
    enum: UserRole,
    enumName: 'user_role_enum',
    nullable: true,
  })
  recipientRole: UserRole | null;

  @Column({
    type: 'enum',
    enum: EmailPurpose,
    enumName: 'email_purpose_enum',
  })
  purpose: EmailPurpose;

  @Column({ length: 200 })
  subject: string;

  @Column({ length: 16 })
  provider: string;

  @Column({ name: 'ses_message_id', type: 'varchar', nullable: true })
  sesMessageId: string | null;

  @Column({
    type: 'enum',
    enum: EmailSendStatus,
    enumName: 'email_send_status_enum',
  })
  status: EmailSendStatus;

  @Column({ name: 'error_message', type: 'varchar', length: 500, nullable: true })
  errorMessage: string | null;

  @Column({ name: 'sent_at', type: 'timestamp' })
  sentAt: Date;

  @Column({ name: 'status_updated_at', type: 'timestamp' })
  statusUpdatedAt: Date;
}
