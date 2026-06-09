import { Field, InputType } from '@nestjs/graphql';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { ParentRelationEnum } from '../enums/student.enums';

@InputType()
export class SaveStudentParentInput {
  @Field(() => ParentRelationEnum)
  @IsEnum(ParentRelationEnum)
  parentRelation: ParentRelationEnum;

  @Field()
  @IsString()
  @IsNotEmpty()
  parentName: string;
}
