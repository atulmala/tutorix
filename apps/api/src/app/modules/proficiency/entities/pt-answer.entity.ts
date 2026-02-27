import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { Field, ObjectType } from '@nestjs/graphql';
import { QBaseEntity } from '../../../common/base-entities/base.entity';
import { PTQuestionEntity } from './pt-question.entity';

@ObjectType()
@Entity('pt_answer')
export class PtAnswerEntity extends QBaseEntity {
  @Field(() => PTQuestionEntity, { nullable: true })
  @ManyToOne(
    () => PTQuestionEntity,
    (question) => question.answers,
  )
  @JoinColumn()
  @Index()
  question: PTQuestionEntity;

  @Field()
  @Column('text')
  text: string;

  @Field()
  @Column({ default: false })
  answer: boolean;
}

