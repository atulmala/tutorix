import { Field, InputType, Int } from '@nestjs/graphql';

@InputType()
export class SaveTutorOfferingRateCardInput {
  @Field(() => Int)
  tutorOfferingId: number;

  @Field()
  freeDemoOffered: boolean;

  @Field()
  offlineEnabled: boolean;

  @Field(() => Int, { nullable: true })
  offlineBaseRate?: number | null;

  @Field(() => Int, { nullable: true })
  offlineSlab2DiscountPct?: number | null;

  @Field(() => Int, { nullable: true })
  offlineSlab3DiscountPct?: number | null;

  @Field()
  onlineEnabled: boolean;

  @Field(() => Int, { nullable: true })
  onlineBaseRate?: number | null;

  @Field(() => Int, { nullable: true })
  onlineSlab2DiscountPct?: number | null;

  @Field(() => Int, { nullable: true })
  onlineSlab3DiscountPct?: number | null;
}
