import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class TutorOfferingRateCard {
  @Field()
  freeDemoOffered: boolean;

  @Field()
  offlineEnabled: boolean;

  @Field(() => Int, { nullable: true })
  offlineBaseRate?: number | null;

  @Field(() => Int)
  offlineBaseDiscountPct: number;

  @Field(() => Int, { nullable: true })
  offlineSlab2DiscountPct?: number | null;

  @Field(() => Int, { nullable: true })
  offlineSlab3DiscountPct?: number | null;

  @Field()
  onlineEnabled: boolean;

  @Field(() => Int, { nullable: true })
  onlineBaseRate?: number | null;

  @Field(() => Int)
  onlineBaseDiscountPct: number;

  @Field(() => Int, { nullable: true })
  onlineSlab2DiscountPct?: number | null;

  @Field(() => Int, { nullable: true })
  onlineSlab3DiscountPct?: number | null;

  @Field()
  isComplete: boolean;
}
