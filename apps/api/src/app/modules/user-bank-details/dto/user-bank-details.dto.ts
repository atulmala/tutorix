import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class UserBankDetails {
  @Field()
  bankName: string;

  @Field()
  ifscCode: string;

  @Field(() => String, { nullable: true })
  gstNumber?: string | null;

  @Field(() => String, { nullable: true })
  panNumber?: string | null;

  @Field()
  accountNumberMasked: string;

  @Field()
  isComplete: boolean;

  @Field(() => String, { nullable: true, description: 'Full account number; admins only.' })
  accountNumber?: string | null;

  /** Internal: used by accountNumber field resolver. */
  fullAccountNumber?: string;
}
