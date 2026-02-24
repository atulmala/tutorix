import {
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  OneToMany,
} from 'typeorm';
import { Field, ObjectType } from '@nestjs/graphql';
import { QBaseEntity } from '../../../common/base-entities/base.entity';
import { OfferingEntity } from '../../offerings/entities/offering.entity';
import { PTQuestionEntity } from './pt-question.entity.js';

@ObjectType()
@Entity('tutor_proficiency_test')
export class ProficiencyTestEntity extends QBaseEntity {
  @Field()
  @Column()
  name: string;

  @Field(() => [OfferingEntity], { nullable: true })
  @ManyToMany(() => OfferingEntity)
  @JoinTable()
  offerings: OfferingEntity[];

  @Field()
  @Column({ default: 0 })
  time: number;

  @Field()
  @Column({ default: 0 })
  score: number;

  @Field()
  @Column({ default: 65 })
  passPercentage: number;

  @Field(() => [PTQuestionEntity], { nullable: true })
  @OneToMany(
    () => PTQuestionEntity,
    (question: PTQuestionEntity) => question.proficiencyTest,
    {
      cascade: ['insert', 'update', 'remove'],
    },
  )
  questions: PTQuestionEntity[];
}

