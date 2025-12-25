import { Entity, Column, OneToMany, Index } from 'typeorm';
import { ObjectType, Field } from '@nestjs/graphql';
import { QBaseEntity } from '../../../common/base-entities/base.entity';
import { UserRole } from '../enums/user-role.enum';
import { RefreshToken } from './refresh-token.entity';

/**
 * User Entity
 *
 * Represents a user in the system (Tutor, Student, or Admin).
 * - Tutors and Students login with mobile number
 * - Admins login with email (e.g., admin@tutorix.com)
 * Extends QBaseEntity to inherit common fields.
 */
@ObjectType()
@Entity('user')
export class User extends QBaseEntity {
  @Field({ nullable: true })
  @Column({ nullable: true, unique: true })
  @Index()
  mobile?: string; // For Tutors and Students

  @Field({ nullable: true })
  @Column({ nullable: true, unique: true })
  @Index()
  email?: string; // For Admins (e.g., admin@tutorix.com)

  @Field()
  @Column({ select: false }) // Don't select password by default
  password: string; // Hashed password

  @Field(() => UserRole)
  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.STUDENT,
  })
  role: UserRole;

  @Field({ nullable: true })
  @Column({ nullable: true })
  firstName?: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  lastName?: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  profilePicture?: string;

  @Field({ defaultValue: false })
  @Column({ default: false })
  isEmailVerified: boolean;

  @Field({ defaultValue: false })
  @Column({ default: false })
  isMobileVerified: boolean;

  @Field(() => Date, { nullable: true })
  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt?: Date;

  // Relations
  @OneToMany(() => RefreshToken, (refreshToken) => refreshToken.user, {
    cascade: true,
  })
  refreshTokens: RefreshToken[];
}

