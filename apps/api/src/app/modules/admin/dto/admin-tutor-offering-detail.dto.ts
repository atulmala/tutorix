import { Field, Int, ObjectType } from '@nestjs/graphql';
import { TutorOfferingStatusEnum } from '../../tutor/enums/tutor.enums';
import { TutorOfferingRateCard } from '../../tutor-rate-card/dto/tutor-offering-rate-card.dto';

@ObjectType()
export class AdminTutorOfferingDetail {
  @Field(() => Int)
  id: number;

  @Field({ nullable: true })
  offeringName?: string;

  @Field({ nullable: true })
  offeringDisplayName?: string;

  @Field({
    nullable: true,
    description:
      'Full offering label for display (e.g. English CBSE classes 4, or full path for other study areas)',
  })
  offeringFullLabel?: string;

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

  @Field({ nullable: true })
  createdDate?: Date;

  @Field(() => TutorOfferingRateCard, { nullable: true })
  rateCard?: TutorOfferingRateCard | null;
}
