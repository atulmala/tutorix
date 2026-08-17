import { Column, Entity, Index, Unique } from 'typeorm';
import { Field, Int, ObjectType } from '@nestjs/graphql';
import { QBaseEntity } from '../../../common/base-entities/base.entity';
import { CommunicationAudience } from '../enums/communication-audience.enum';
import { CommunicationEvent } from '../enums/communication-event.enum';

@ObjectType()
@Entity('communication_rule')
@Unique('UQ_communication_rule_event_audience', ['event', 'audience'])
@Index(['event'])
export class CommunicationRuleEntity extends QBaseEntity {
  @Field(() => CommunicationEvent)
  @Column({
    type: 'enum',
    enum: CommunicationEvent,
    enumName: 'communication_event_enum',
  })
  event: CommunicationEvent;

  @Field(() => CommunicationAudience)
  @Column({
    type: 'enum',
    enum: CommunicationAudience,
    enumName: 'communication_audience_enum',
  })
  audience: CommunicationAudience;

  @Field()
  @Column({ default: true })
  enabled: boolean;

  @Field()
  @Column({ default: false })
  mandatory: boolean;

  @Field()
  @Column({ name: 'email_enabled', default: false })
  emailEnabled: boolean;

  @Field()
  @Column({ name: 'sms_enabled', default: false })
  smsEnabled: boolean;

  @Field()
  @Column({ name: 'push_enabled', default: false })
  pushEnabled: boolean;

  @Field()
  @Column({ name: 'whatsapp_enabled', default: false })
  whatsappEnabled: boolean;

  @Field(() => Int, { nullable: true })
  @Column({ name: 'offset_minutes', type: 'smallint', nullable: true })
  offsetMinutes: number | null;
}
