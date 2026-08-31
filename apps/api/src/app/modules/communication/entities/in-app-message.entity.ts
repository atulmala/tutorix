import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { Field, Int, ObjectType } from '@nestjs/graphql';
import { QBaseEntity } from '../../../common/base-entities/base.entity';
import { User } from '../../auth/entities/user.entity';
import { CommunicationEvent } from '../enums/communication-event.enum';

@ObjectType()
@Entity('in_app_message')
@Index(['userId', 'createdDate'])
@Index(['userId', 'event'])
export class InAppMessageEntity extends QBaseEntity {
  @Field(() => Int)
  @Column({ name: 'user_id', type: 'integer' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Field(() => CommunicationEvent)
  @Column({
    type: 'enum',
    enum: CommunicationEvent,
    enumName: 'communication_event_enum',
  })
  event: CommunicationEvent;

  @Field(() => String, { nullable: true })
  @Column({ type: 'varchar', length: 200, nullable: true })
  title: string | null;

  @Field(() => String)
  @Column({ type: 'text' })
  body: string;

  @Field(() => Date, { nullable: true })
  @Column({ name: 'read_at', type: 'timestamp', nullable: true })
  readAt: Date | null;
}
