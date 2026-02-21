import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { Field, ObjectType } from '@nestjs/graphql';
import { QBaseEntity } from '../../../common/base-entities/base.entity';
import { TeachingLanguageEnum } from '../enums/teaching-language.enum';

@ObjectType()
@Entity('offering')
export class OfferingEntity extends QBaseEntity {
  @Field()
  @Column()
  name: string;

  @Field()
  @Column({ name: 'display_name' })
  displayName: string;

  @Field()
  @Column({ default: 0 })
  @Index()
  level: number;

  @Field()
  @Column({ name: 'display_order', default: 99 })
  order: number;

  @Field(() => OfferingEntity, { nullable: true })
  @ManyToOne(() => OfferingEntity, { nullable: true })
  @JoinColumn({ name: 'parent_offering_id' })
  @Index()
  parentOffering?: OfferingEntity;

  @Field(() => OfferingEntity, { nullable: true })
  @ManyToOne(() => OfferingEntity, { nullable: true })
  @JoinColumn({ name: 'root_offering_id' })
  @Index()
  rootOffering?: OfferingEntity;

  @Field(() => TeachingLanguageEnum, { nullable: true })
  @Column({
    type: 'smallint',
    name: 'medium_of_instruction',
    nullable: true,
    default: TeachingLanguageEnum.ENGLISH,
  })
  @Index()
  mediumOfInstruction?: TeachingLanguageEnum;
}
