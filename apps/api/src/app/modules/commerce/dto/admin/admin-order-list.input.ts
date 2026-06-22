import { Field, InputType, Int } from '@nestjs/graphql';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import {
  OrderPayerRoleEnum,
  OrderPaymentMethodEnum,
  OrderSourceEnum,
  OrderStatusEnum,
} from '../../enums/commerce.enums';

@InputType()
export class AdminOrderListInput {
  @Field(() => OrderStatusEnum, { nullable: true })
  @IsOptional()
  @IsEnum(OrderStatusEnum)
  status?: OrderStatusEnum;

  @Field(() => OrderPaymentMethodEnum, { nullable: true })
  @IsOptional()
  @IsEnum(OrderPaymentMethodEnum)
  paymentMethod?: OrderPaymentMethodEnum;

  @Field(() => OrderPayerRoleEnum, { nullable: true })
  @IsOptional()
  @IsEnum(OrderPayerRoleEnum)
  payerRole?: OrderPayerRoleEnum;

  @Field(() => OrderSourceEnum, { nullable: true })
  @IsOptional()
  @IsEnum(OrderSourceEnum)
  source?: OrderSourceEnum;

  @Field({ nullable: true, description: 'When true, only orders with amount_due_inr = 0' })
  @IsOptional()
  @IsBoolean()
  zeroAmountOnly?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  search?: string;

  @Field(() => Int, { defaultValue: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @Field(() => Int, { defaultValue: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  pageSize?: number;
}
