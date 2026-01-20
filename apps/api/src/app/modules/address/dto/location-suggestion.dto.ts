import { ObjectType, Field, Float } from '@nestjs/graphql';

@ObjectType()
export class LocationSuggestion {
  @Field()
  displayName: string;

  @Field(() => Float)
  latitude: number;

  @Field(() => Float)
  longitude: number;

  @Field({ nullable: true })
  city?: string;

  @Field({ nullable: true })
  state?: string;

  @Field({ nullable: true })
  country?: string;

  @Field({ nullable: true })
  postalCode?: string;
}
