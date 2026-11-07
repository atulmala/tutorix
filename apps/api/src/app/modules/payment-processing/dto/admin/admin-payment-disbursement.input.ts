import { Field, InputType, Int } from '@nestjs/graphql';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { PaymentDisbursementKindEnum } from '../../enums/payment-disbursement-kind.enum';
import { PaymentDisbursementStatusEnum } from '../../enums/payment-disbursement-status.enum';

@InputType()
export class AdminPaymentDisbursementListInput {
  @Field(() => PaymentDisbursementKindEnum, { nullable: true })
  @IsOptional()
  @IsEnum(PaymentDisbursementKindEnum)
  kind?: PaymentDisbursementKindEnum;

  @Field(() => PaymentDisbursementStatusEnum, { nullable: true })
  @IsOptional()
  @IsEnum(PaymentDisbursementStatusEnum)
  status?: PaymentDisbursementStatusEnum;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  payeeSearch?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  refundRequestId?: number;

  @Field(() => Int, { defaultValue: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @Field(() => Int, { defaultValue: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

@InputType()
export class AdminSubmitTutorPayoutDisbursementsInput {
  @Field()
  @IsString()
  startDate!: string;

  @Field()
  @IsString()
  endDate!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  tutorSearch?: string;
}
