import { Column, Entity, Unique } from 'typeorm';
import { Field, ObjectType } from '@nestjs/graphql';
import { QBaseEntity } from '../../../common/base-entities/base.entity';
import { CommunicationAudience } from '../enums/communication-audience.enum';
import { CommunicationChannel } from '../enums/communication-channel.enum';
import { CommunicationEvent } from '../enums/communication-event.enum';

@ObjectType()
@Entity('communication_template')
@Unique('UQ_communication_template_event_audience_channel', [
  'event',
  'audience',
  'channel',
])
export class CommunicationTemplateEntity extends QBaseEntity {
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

  @Field(() => CommunicationChannel)
  @Column({
    type: 'enum',
    enum: CommunicationChannel,
    enumName: 'communication_channel_enum',
  })
  channel: CommunicationChannel;

  @Field()
  @Column({ name: 'template_path' })
  templatePath: string;
}
