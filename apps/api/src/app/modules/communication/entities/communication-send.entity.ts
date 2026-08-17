import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { QBaseEntity } from '../../../common/base-entities/base.entity';
import { User } from '../../auth/entities/user.entity';
import { CommunicationAudience } from '../enums/communication-audience.enum';
import { CommunicationChannel } from '../enums/communication-channel.enum';
import { CommunicationEvent } from '../enums/communication-event.enum';
import { CommunicationSendStatus } from '../enums/communication-send-status.enum';

@Entity('communication_send')
@Index(['event', 'createdDate'])
@Index(['userId', 'createdDate'])
@Index('UQ_communication_send_idempotency_key', ['idempotencyKey'], {
  unique: true,
  where: '"idempotency_key" IS NOT NULL',
})
export class CommunicationSendEntity extends QBaseEntity {
  @Column({
    type: 'enum',
    enum: CommunicationEvent,
    enumName: 'communication_event_enum',
  })
  event: CommunicationEvent;

  @Column({
    type: 'enum',
    enum: CommunicationAudience,
    enumName: 'communication_audience_enum',
  })
  audience: CommunicationAudience;

  @Column({
    type: 'enum',
    enum: CommunicationChannel,
    enumName: 'communication_channel_enum',
  })
  channel: CommunicationChannel;

  @Column({ name: 'user_id', type: 'integer', nullable: true })
  userId: number | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @Column({ type: 'varchar', nullable: true })
  to: string | null;

  @Column({ length: 32 })
  provider: string;

  @Column({ name: 'provider_message_id', type: 'varchar', nullable: true })
  providerMessageId: string | null;

  @Column({
    type: 'enum',
    enum: CommunicationSendStatus,
    enumName: 'communication_send_status_enum',
  })
  status: CommunicationSendStatus;

  @Column({ name: 'error_message', type: 'varchar', length: 500, nullable: true })
  errorMessage: string | null;

  @Column({ name: 'idempotency_key', type: 'varchar', nullable: true })
  idempotencyKey: string | null;
}
