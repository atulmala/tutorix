import { InputType, Field } from '@nestjs/graphql';

/**
 * Input type for creating a new tutor
 */
@InputType()
export class CreateTutorInput {
  @Field()
  email: string;

  @Field()
  firstName: string;

  @Field()
  lastName: string;

  @Field({ nullable: true })
  bio?: string;

  @Field({ defaultValue: 0 })
  hourlyRate: number;

  @Field({ defaultValue: false })
  isVerified: boolean;
}

