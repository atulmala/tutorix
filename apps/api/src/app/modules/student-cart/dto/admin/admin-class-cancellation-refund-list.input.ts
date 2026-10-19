import { Field, InputType, Int } from '@nestjs/graphql';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ClassCancellationRefundAiStatusEnum } from '../../enums/class-cancellation-refund-ai-status.enum';
import { ClassCancellationRefundInitiatedByEnum } from '../../enums/class-cancellation-refund-initiated-by.enum';
import { ClassCancellationRefundPayoutStatusEnum } from '../../enums/class-cancellation-refund-payout-status.enum';

@InputType()
export class AdminClassCancellationRefundListInput {
  @Field(() => ClassCancellationRefundInitiatedByEnum)
  @IsEnum(ClassCancellationRefundInitiatedByEnum)
  initiatedBy!: ClassCancellationRefundInitiatedByEnum;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  studentSearch?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  tutorSearch?: string;

  @Field(() => ClassCancellationRefundPayoutStatusEnum, { nullable: true })
  @IsOptional()
  @IsEnum(ClassCancellationRefundPayoutStatusEnum)
  payoutStatus?: ClassCancellationRefundPayoutStatusEnum;

  @Field(() => ClassCancellationRefundAiStatusEnum, { nullable: true })
  @IsOptional()
  @IsEnum(ClassCancellationRefundAiStatusEnum)
  aiStatus?: ClassCancellationRefundAiStatusEnum;

  @Field(() => Int, { defaultValue: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @Field(() => Int, { defaultValue: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number;
}
