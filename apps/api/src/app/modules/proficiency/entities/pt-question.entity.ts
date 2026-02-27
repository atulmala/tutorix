import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { Field, ObjectType } from '@nestjs/graphql';
import { QBaseEntity } from '../../../common/base-entities/base.entity';
import { ProficiencyTestEntity } from './proficiency-test.entity';
import { QuestionTypeEnum } from '../enums/question-type.enum';
import { QuestionDifficultyEnum } from '../enums/question-difficulty.enum';
import { PtAnswerEntity } from './pt-answer.entity';

@ObjectType()
@Entity('pt_question')
export class PTQuestionEntity extends QBaseEntity {
  @Field(() => ProficiencyTestEntity, { nullable: true })
  @ManyToOne(
    () => ProficiencyTestEntity,
    (proficiencyTest) => proficiencyTest.questions,
  )
  @JoinColumn()
  @Index()
  proficiencyTest: ProficiencyTestEntity;

  @Field(() => QuestionTypeEnum)
  @Column('enum', {
    enum: QuestionTypeEnum,
    default: QuestionTypeEnum.SINGLE_CHOICE,
  })
  questionType: QuestionTypeEnum;

  @Field(() => [PtAnswerEntity], { nullable: true })
  @OneToMany(
    () => PtAnswerEntity,
    (answer: PtAnswerEntity) => answer.question,
    {
      cascade: ['insert', 'update', 'remove'],
    },
  )
  answers: PtAnswerEntity[];

  @Field(() => QuestionDifficultyEnum)
  @Column('enum', {
    enum: QuestionDifficultyEnum,
    default: QuestionDifficultyEnum.MEDIUM,
  })
  difficulty: QuestionDifficultyEnum;

  @Field()
  @Column('text')
  question: string;

  @Field({ nullable: true })
  @Column('text', { default: '' })
  notes?: string | null;
}

