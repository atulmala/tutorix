import { InputType, Field, Int } from '@nestjs/graphql';
import { IsArray, IsInt, IsOptional, Min } from 'class-validator';

@InputType()
export class SaveTutorOfferingsInput {
  @Field(() => [Int], {
    description: 'Leaf offering IDs selected by the tutor (one for initial onboarding)',
  })
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  offeringIds: number[];

  @Field(() => Boolean, {
    nullable: true,
    description:
      'When true, advances certification stage to pt. Set false when adding offerings without advancing.',
  })
  @IsOptional()
  advanceToNextStep?: boolean;
}
