import { Field, ObjectType } from '@nestjs/graphql';
import { UserBankDetails } from '../../user-bank-details/dto/user-bank-details.dto';

@ObjectType()
export class AdminTutorDetailUser {
  @Field({ nullable: true })
  firstName?: string;

  @Field({ nullable: true })
  lastName?: string;

  @Field({ nullable: true })
  email?: string;

  @Field({ nullable: true })
  mobile?: string;

  @Field({ nullable: true })
  mobileCountryCode?: string;

  @Field({ nullable: true })
  mobileNumber?: string;

  @Field({ nullable: true, description: 'Account signup / registration date' })
  createdDate?: Date;

  @Field(() => UserBankDetails, { nullable: true })
  bankDetails?: UserBankDetails | null;
}
