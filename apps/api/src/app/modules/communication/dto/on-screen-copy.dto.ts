import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class OnScreenCopy {
  @Field()
  enabled: boolean;

  @Field(() => String, { nullable: true })
  title?: string | null;

  @Field(() => String, { nullable: true })
  body?: string | null;
}
