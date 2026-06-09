import { Field, Int, ObjectType } from '@nestjs/graphql';
import { AdminStudentListItem } from './admin-student-list-item.dto';

@ObjectType()
export class AdminStudentListResult {
  @Field(() => [AdminStudentListItem])
  items: AdminStudentListItem[];

  @Field(() => Int)
  totalCount: number;

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  pageSize: number;

  @Field(() => Int)
  totalPages: number;
}
