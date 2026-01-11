import {
  Entity,
  Column,
  ManyToOne,
  Index,
  JoinColumn,
} from 'typeorm';
import { ObjectType, Field, Int, HideField } from '@nestjs/graphql';
import { QBaseEntity } from '../../../common/base-entities/base.entity';
import { User } from './user.entity';

/**
 * Password Reset Token Entity
 *
 * Stores password reset tokens for users. Tokens are hashed before storage.
 * Tokens expire after a set time and become invalid once used.
 */
@ObjectType()
@Entity('password_reset_token')
@Index(['tokenHash'], { unique: true })
@Index(['userId'])
export class PasswordResetToken extends QBaseEntity {
  @Field(() => Int)
  @Column({ name: 'user_id', type: 'integer' })
  userId: number;

  @Field(() => User)
  @ManyToOne(() => User, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @HideField()
  @Column({ name: 'token_hash', length: 64, unique: true })
  tokenHash: string;

  @Field(() => Date)
  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date;

  @Field(() => Date, { nullable: true })
  @Column({ name: 'used_at', type: 'timestamp', nullable: true })
  usedAt?: Date;

  @Field({ defaultValue: false })
  @Column({ name: 'is_used', default: false })
  isUsed: boolean;
}
