import { Field, InputType, Int } from '@nestjs/graphql';
import { IsEnum, IsInt, IsString, Max, Min, ValidateIf } from 'class-validator';
import { SchoolBoardEnum, StudentTypeEnum } from '../enums/student.enums';

@InputType()
export class SaveStudentEducationInput {
  @Field(() => StudentTypeEnum)
  @IsEnum(StudentTypeEnum)
  studentType: StudentTypeEnum;

  @Field(() => Int, { nullable: true })
  @ValidateIf((o: SaveStudentEducationInput) => o.studentType === StudentTypeEnum.SCHOOL)
  @IsInt()
  @Min(1)
  @Max(12)
  schoolClass?: number;

  @Field(() => SchoolBoardEnum, { nullable: true })
  @ValidateIf((o: SaveStudentEducationInput) => o.studentType === StudentTypeEnum.SCHOOL)
  @IsEnum(SchoolBoardEnum)
  board?: SchoolBoardEnum;

  @Field({ nullable: true })
  @ValidateIf(
    (o: SaveStudentEducationInput) =>
      o.studentType === StudentTypeEnum.SCHOOL && o.board === SchoolBoardEnum.OTHER,
  )
  @IsString()
  boardOther?: string;
}
