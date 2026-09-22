import { Field, InputType, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class WeeklyUnavailabilitySlot {
  @Field(() => Int)
  dayOfWeek!: number;

  @Field(() => Int)
  hour!: number;

  @Field(() => Int)
  minute!: number;
}

@InputType()
export class WeeklyUnavailabilitySlotInput {
  @Field(() => Int)
  dayOfWeek!: number;

  @Field(() => Int)
  hour!: number;

  @Field(() => Int)
  minute!: number;
}

@InputType()
export class SaveMyWeeklyUnavailabilityInput {
  @Field(() => [WeeklyUnavailabilitySlotInput], {
    description: 'IST weekly slots marked unavailable; all other grid slots are available',
  })
  unavailableSlots!: WeeklyUnavailabilitySlotInput[];
}

@ObjectType()
export class SaveMyWeeklyUnavailabilityResult {
  @Field(() => [WeeklyUnavailabilitySlot])
  unavailableSlots!: WeeklyUnavailabilitySlot[];

  @Field({ nullable: true })
  materializedThrough?: Date;

  @Field()
  availabilityConfiguredAt!: Date;
}
