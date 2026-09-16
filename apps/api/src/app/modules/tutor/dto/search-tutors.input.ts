import { Field, ID, InputType, Int } from '@nestjs/graphql';
import { IsEnum, IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';
import {
  TutorSearchClassFormat,
  TutorSearchDeliveryMode,
  TutorSearchSort,
} from '../enums/tutor-search.enum';

@InputType()
export class SearchTutorsInput {
  @Field(() => ID)
  offeringId!: number;

  @Field(() => TutorSearchDeliveryMode, {
    defaultValue: TutorSearchDeliveryMode.ANY,
  })
  @IsOptional()
  @IsEnum(TutorSearchDeliveryMode)
  deliveryMode?: TutorSearchDeliveryMode;

  @Field(() => TutorSearchClassFormat, {
    defaultValue: TutorSearchClassFormat.ANY,
  })
  @IsOptional()
  @IsEnum(TutorSearchClassFormat)
  classFormat?: TutorSearchClassFormat;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxRateInr?: number;

  @Field({ nullable: true, defaultValue: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  radiusKm?: number;

  @Field(() => TutorSearchSort, {
    defaultValue: TutorSearchSort.BEST_MATCH,
  })
  @IsOptional()
  @IsEnum(TutorSearchSort)
  sortBy?: TutorSearchSort;

  @Field({ nullable: true })
  @IsOptional()
  cursor?: string;

  @Field(() => Int, { defaultValue: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
