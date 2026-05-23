import { Field, Int, ObjectType } from '@nestjs/graphql';
import { TutorOfferingStatusEnum } from '../../tutor/enums/tutor.enums';

@ObjectType()
export class AdminTutorOfferingDetail {
  @Field(() => Int)
  id: number;

  @Field({ nullable: true })
  offeringName?: string;

  @Field({ nullable: true })
  offeringDisplayName?: string;

  @Field(() => TutorOfferingStatusEnum)
  status: TutorOfferingStatusEnum;

  @Field(() => Int)
  attemptsUsed: number;

  @Field(() => Int, { description: 'Remaining PT attempts (max 2 minus used)' })
  attemptsRemaining: number;

  @Field(() => Int, { nullable: true })
  lastScore?: number;

  @Field(() => Int, { nullable: true })
  lastMaxScore?: number;

  @Field({ nullable: true })
  lastAttemptAt?: Date;

  @Field({ nullable: true })
  passedAt?: Date;

  @Field(() => Int, { nullable: true })
  lastTimeTakenSeconds?: number;
}
