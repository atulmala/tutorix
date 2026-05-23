import { Field, Int, ObjectType } from '@nestjs/graphql';
import { AdminTutorListItem } from './admin-tutor-list-item.dto';

@ObjectType()
export class AdminTutorListResult {
  @Field(() => [AdminTutorListItem])
  items: AdminTutorListItem[];

  @Field(() => Int)
  totalCount: number;

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  pageSize: number;

  @Field(() => Int)
  totalPages: number;
}
