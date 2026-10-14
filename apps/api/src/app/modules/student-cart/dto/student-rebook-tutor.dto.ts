import { Field, Int, ObjectType } from '@nestjs/graphql';
import { ClassSessionDeliveryModeEnum } from '../../tutor-class-session/enums/class-session-delivery-mode.enum';

@ObjectType()
export class StudentRebookTutor {
  @Field(() => Int)
  tutorId!: number;

  @Field(() => Int)
  catalogOfferingId!: number;

  @Field()
  displayName!: string;

  @Field(() => String, { nullable: true })
  photoUrl?: string | null;

  @Field()
  offeringLabel!: string;

  @Field(() => Int)
  totalClassCount!: number;

  @Field(() => Date)
  lastBookedAt!: Date;

  @Field(() => ClassSessionDeliveryModeEnum)
  lastDeliveryMode!: ClassSessionDeliveryModeEnum;

  @Field(() => Int, { nullable: true })
  totalExperienceMonths?: number | null;
}
