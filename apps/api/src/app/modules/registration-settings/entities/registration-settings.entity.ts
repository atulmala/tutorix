import { Column, Entity } from 'typeorm';
import { Field, ObjectType } from '@nestjs/graphql';
import { QBaseEntity } from '../../../common/base-entities/base.entity';

export const DEFAULT_REGISTRATION_DISABLED_MESSAGE =
  'Registration for this role is temporarily unavailable. Please try again later.';

@ObjectType()
@Entity('registration_settings')
export class RegistrationSettingsEntity extends QBaseEntity {
  @Field()
  @Column({ name: 'tutor_registration_enabled', type: 'boolean', default: true })
  tutorRegistrationEnabled!: boolean;

  @Field()
  @Column({
    name: 'student_registration_enabled',
    type: 'boolean',
    default: true,
  })
  studentRegistrationEnabled!: boolean;

  @Field()
  @Column({
    name: 'disabled_message',
    type: 'varchar',
    length: 500,
    default: DEFAULT_REGISTRATION_DISABLED_MESSAGE,
  })
  disabledMessage!: string;
}
