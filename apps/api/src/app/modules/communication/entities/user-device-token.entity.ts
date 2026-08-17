import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  Unique,
} from 'typeorm';
import { Field, ObjectType } from '@nestjs/graphql';
import { QBaseEntity } from '../../../common/base-entities/base.entity';
import { User } from '../../auth/entities/user.entity';
import { DevicePlatform } from '../enums/device-platform.enum';

@ObjectType()
@Entity('user_device_token')
@Unique('UQ_user_device_token_token', ['token'])
@Index(['userId'])
export class UserDeviceTokenEntity extends QBaseEntity {
  @Field()
  @Column({ name: 'user_id', type: 'integer' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Field()
  @Column({ type: 'varchar', length: 512 })
  token: string;

  @Field(() => DevicePlatform)
  @Column({
    type: 'enum',
    enum: DevicePlatform,
    enumName: 'device_platform_enum',
  })
  platform: DevicePlatform;
}
