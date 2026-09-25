import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql';
import { YearsOfExperienceEnum } from '../enums/years-of-experience.enum';
import { TutorSearchDeliveryMode } from '../enums/tutor-search.enum';

@ObjectType()
export class TutorSearchHit {
  @Field(() => ID)
  tutorId!: number;

  @Field()
  displayName!: string;

  @Field(() => String, { nullable: true })
  photoUrl?: string | null;

  @Field(() => YearsOfExperienceEnum)
  yearsOfExperience!: YearsOfExperienceEnum;

  @Field()
  offeringLabel!: string;

  @Field(() => ID)
  matchingOfferingId!: number;

  @Field()
  onlineEnabled!: boolean;

  @Field()
  offlineEnabled!: boolean;

  @Field()
  individualAvailable!: boolean;

  @Field()
  groupAvailable!: boolean;

  @Field(() => Int)
  groupSize!: number;

  @Field(() => Int)
  rateInr!: number;

  @Field(() => TutorSearchDeliveryMode)
  deliveryModeShown!: TutorSearchDeliveryMode;

  @Field(() => Float, { nullable: true })
  distanceKm?: number | null;

  @Field(() => String, { nullable: true })
  city?: string | null;

  @Field()
  freeDemoOffered!: boolean;

  @Field()
  hasAvailabilityThisWeek!: boolean;

  @Field(() => Int)
  slotsThisWeek!: number;

  @Field(() => Int)
  totalExperienceMonths!: number;
}

@ObjectType()
export class TutorSearchConnection {
  @Field(() => [TutorSearchHit])
  items!: TutorSearchHit[];

  @Field(() => String, { nullable: true })
  nextCursor?: string | null;

  @Field()
  hasMore!: boolean;

  @Field()
  originHasCoordinates!: boolean;

  @Field()
  forcedOnlineOnly!: boolean;
}

@ObjectType()
export class TutorSearchClassPackSlab {
  @Field()
  label!: string;

  @Field(() => Int)
  minClasses!: number;

  @Field(() => Int, { nullable: true })
  maxClasses?: number | null;

  @Field(() => Int)
  unitRateInr!: number;

  @Field(() => Int, { nullable: true })
  discountPct?: number | null;
}

@ObjectType()
export class TutorSearchOfferingSummary {
  @Field(() => ID)
  offeringId!: number;

  @Field()
  offeringLabel!: string;

  @Field()
  onlineEnabled!: boolean;

  @Field()
  offlineEnabled!: boolean;

  @Field(() => Int, { nullable: true })
  onlineRateInr?: number | null;

  @Field(() => Int, { nullable: true })
  offlineRateInr?: number | null;

  @Field()
  freeDemoOffered!: boolean;

  @Field(() => [TutorSearchClassPackSlab])
  onlinePackSlabs!: TutorSearchClassPackSlab[];

  @Field(() => [TutorSearchClassPackSlab])
  offlinePackSlabs!: TutorSearchClassPackSlab[];
}

@ObjectType()
export class TutorSearchExperience {
  @Field()
  jobTitle!: string;

  @Field(() => String, { nullable: true })
  employerName?: string | null;

  @Field(() => String, { nullable: true })
  employerAddress?: string | null;

  @Field()
  startDate!: string;

  @Field(() => String, { nullable: true })
  endDate?: string | null;

  @Field()
  isCurrent!: boolean;
}

@ObjectType()
export class TutorSearchQualification {
  @Field()
  qualificationType!: string;

  @Field(() => String, { nullable: true })
  degreeName?: string | null;

  @Field()
  gradeType!: string;

  @Field()
  gradeValue!: string;

  @Field()
  boardOrUniversity!: string;

  @Field(() => Int)
  yearObtained!: number;
}

@ObjectType()
export class TutorSearchDetail {
  @Field(() => ID)
  tutorId!: number;

  @Field()
  displayName!: string;

  @Field(() => String, { nullable: true })
  photoUrl?: string | null;

  @Field(() => YearsOfExperienceEnum)
  yearsOfExperience!: YearsOfExperienceEnum;

  @Field(() => String, { nullable: true })
  city?: string | null;

  @Field(() => Float, { nullable: true })
  distanceKm?: number | null;

  @Field()
  hasAvailabilityThisWeek!: boolean;

  @Field(() => Int)
  slotsThisWeek!: number;

  @Field(() => Int)
  totalExperienceMonths!: number;

  @Field(() => [TutorSearchExperience])
  recentExperiences!: TutorSearchExperience[];

  @Field(() => [TutorSearchQualification])
  topQualifications!: TutorSearchQualification[];

  @Field(() => TutorSearchOfferingSummary)
  matchingOffering!: TutorSearchOfferingSummary;

  @Field(() => [TutorSearchOfferingSummary])
  otherOfferings!: TutorSearchOfferingSummary[];
}
