import { Field, Int, ObjectType } from '@nestjs/graphql';
import { ClassSessionDeliveryModeEnum } from '../../tutor-class-session/enums/class-session-delivery-mode.enum';
import { ClassCreditStatusEnum } from '../enums/class-credit-status.enum';

@ObjectType()
export class StudentCartItemDto {
  @Field(() => Int)
  id!: number;

  @Field(() => Int)
  tutorId!: number;

  @Field(() => Int)
  tutorOfferingId!: number;

  @Field(() => Int)
  offeringId!: number;

  @Field()
  tutorName!: string;

  @Field()
  offeringLabel!: string;

  @Field(() => ClassSessionDeliveryModeEnum)
  deliveryMode!: ClassSessionDeliveryModeEnum;

  @Field(() => Int)
  quantity!: number;

  @Field(() => Int)
  unitRateInr!: number;

  @Field(() => Int)
  lineTotalInr!: number;
}

@ObjectType()
export class StudentCartDto {
  @Field(() => Int)
  id!: number;

  @Field(() => [StudentCartItemDto])
  items!: StudentCartItemDto[];

  @Field(() => Int)
  itemCount!: number;

  @Field(() => Int)
  totalInr!: number;
}

@ObjectType()
export class CartCheckoutPreviewDto {
  @Field(() => Int)
  cartId!: number;

  @Field(() => Int)
  purchaseAmountInr!: number;

  @Field(() => Int)
  walletBalanceInr!: number;

  @Field(() => Int)
  shortfallInr!: number;

  @Field()
  canPayFromWallet!: boolean;

  @Field(() => [StudentCartItemDto])
  items!: StudentCartItemDto[];
}

@ObjectType()
export class StudentClassCreditDto {
  @Field(() => Int)
  id!: number;

  @Field(() => Int)
  tutorId!: number;

  @Field(() => Int)
  tutorOfferingId!: number;

  @Field(() => Int)
  offeringId!: number;

  @Field()
  tutorName!: string;

  @Field()
  offeringLabel!: string;

  @Field(() => ClassSessionDeliveryModeEnum)
  deliveryMode!: ClassSessionDeliveryModeEnum;

  @Field(() => ClassCreditStatusEnum)
  status!: ClassCreditStatusEnum;

  @Field(() => Int, { nullable: true })
  enrollmentId?: number | null;

  @Field(() => Date, { nullable: true })
  startsAt?: Date | null;
}

@ObjectType()
export class ScheduleClassCreditResult {
  @Field(() => Int)
  creditId!: number;

  @Field(() => Int)
  enrollmentId!: number;

  @Field(() => Int)
  sessionId!: number;
}
