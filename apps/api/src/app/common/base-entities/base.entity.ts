import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { Field, HideField, ObjectType } from '@nestjs/graphql';

@ObjectType({ isAbstract: true })
export abstract class QBaseEntity extends BaseEntity {
  @Field()
  @PrimaryGeneratedColumn()
  id: number;

  @Field()
  @VersionColumn()
  version: number;

  @Field()
  @Column({ default: false })
  @HideField()
  @Index()
  deleted: boolean;

  @Field()
  @Column({ default: true })
  @Index()
  active: boolean;

  @Field()
  @CreateDateColumn()
  @Index()
  createdDate: Date;

  @Field()
  @UpdateDateColumn()
  @Index()
  updatedDate: Date;

  @Field({ nullable: true })
  @Column({ nullable: true })
  @Index()
  m_id: string;
}


