import { Entity, Column, ManyToOne, Index } from 'typeorm';
import { ObjectType, Field } from '@nestjs/graphql';
import { QBaseEntity } from '../../../common/base-entities/base.entity';
import { User } from './user.entity';
import { SessionPlatform } from '../enums/session-platform.enum';

/**
 * RefreshToken Entity
 *
 * Stores refresh tokens for users to enable token rotation and revocation.
 */
@ObjectType()
@Entity('refresh_token')
export class RefreshToken extends QBaseEntity {
  @Field()
  @Column({ unique: true })
  @Index()
  token: string; // The refresh token (hashed)

  @Field(() => Date)
  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Field({ defaultValue: false })
  @Column({ default: false })
  isRevoked: boolean;

  @Field(() => String, { nullable: true })
  @Column({ nullable: true })
  revokedAt?: Date;

  @Field(() => String, { nullable: true })
  @Column({ nullable: true })
  deviceInfo?: string; // Optional: store device/browser info

  @Field(() => String, { nullable: true })
  @Column({ nullable: true })
  ipAddress?: string; // Optional: store IP address

  /** Platform: web | ios | android */
  @Column({ type: 'varchar', length: 20, nullable: true })
  platform?: SessionPlatform;

  /** Last time user made an API call or heartbeat; used for inactive-session count */
  @Column({ type: 'timestamp', nullable: true })
  lastActivityAt?: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.refreshTokens, {
    onDelete: 'CASCADE',
  })
  @Field(() => User)
  user: User;

  @Field()
  @Column()
  userId: number;
}

