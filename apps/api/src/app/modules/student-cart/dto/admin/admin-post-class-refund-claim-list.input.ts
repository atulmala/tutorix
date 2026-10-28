import { Field, InputType, Int } from '@nestjs/graphql';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { PostClassRefundAdminStatusEnum } from '../../enums/post-class-refund-admin-status.enum';

@InputType()
export class AdminPostClassRefundClaimListInput {
  @Field(() => Int, { nullable: true, defaultValue: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @Field(() => Int, { nullable: true, defaultValue: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @Field(() => PostClassRefundAdminStatusEnum, { nullable: true })
  @IsOptional()
  @IsEnum(PostClassRefundAdminStatusEnum)
  adminStatus?: PostClassRefundAdminStatusEnum;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  studentSearch?: string;
}
