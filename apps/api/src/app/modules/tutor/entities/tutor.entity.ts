import { Entity, Column } from 'typeorm';
import { ObjectType, Field } from '@nestjs/graphql';
import { QBaseEntity } from '../../../common/base-entities/base.entity';

/**
 * Tutor Entity
 * 
 * Represents a tutor in the system.
 * Extends QBaseEntity to inherit common fields:
 * - id, version, deleted, active, createdDate, updatedDate, m_id
 */
@ObjectType()
@Entity('tutor')
export class Tutor extends QBaseEntity {
  @Field()
  @Column({ unique: true })
  email: string;

  @Field()
  @Column()
  firstName: string;

  @Field()
  @Column()
  lastName: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  bio: string;

  @Field()
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  hourlyRate: number;

  @Field()
  @Column({ default: false })
  isVerified: boolean;
}

