import {
  Entity,
  Column,
  ManyToOne,
  Index,
  JoinColumn,
} from 'typeorm';
import { ObjectType, Field, Int, HideField } from '@nestjs/graphql';
import { QBaseEntity } from '../../../common/base-entities/base.entity';
import { OtpPurpose } from '../enums/otp-purpose.enum';
import { User } from './user.entity';

@ObjectType()
@Entity('otp')
@Index(['userId', 'purpose'], { unique: true })
export class Otp extends QBaseEntity {
  @Field(() => Int)
  @Column({ name: 'user_id', type: 'integer' })
  userId: number;

  @Field(() => User)
  @ManyToOne(() => User, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Field(() => OtpPurpose)
  @Column({
    type: 'enum',
    enum: OtpPurpose,
  })
  purpose: OtpPurpose;

  @HideField()
  @Column({ name: 'otp_hash', length: 64 })
  otpHash: string;

  @Field(() => Date)
  @Column({ type: 'timestamp' })
  expiresAt: Date;
}

