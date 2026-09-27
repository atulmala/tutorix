import { Field, InputType, Int } from '@nestjs/graphql';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ClassCreditStatusEnum } from '../../enums/class-credit-status.enum';

@InputType()
export class AdminClassBookingListInput {
  @Field({ nullable: true, description: 'Match student name, email, or mobile' })
  @IsOptional()
  @IsString()
  studentSearch?: string;

  @Field({ nullable: true, description: 'Match tutor name, email, or mobile' })
  @IsOptional()
  @IsString()
  tutorSearch?: string;

  @Field(() => ClassCreditStatusEnum, { nullable: true })
  @IsOptional()
  @IsEnum(ClassCreditStatusEnum)
  status?: ClassCreditStatusEnum;

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
