import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AdminOrderPayer {
  @Field(() => Int)
  userId: number;

  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  email?: string;

  @Field({ nullable: true })
  mobile?: string;
}
