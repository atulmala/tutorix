import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AdminStudentDetailUser {
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

  @Field({ nullable: true })
  profilePicture?: string;

  @Field({ nullable: true })
  profilePictureThumbnailMedium?: string;

  @Field({ nullable: true })
  profilePictureThumbnailLarge?: string;

  @Field({ nullable: true })
  profilePictureOriginalUrl?: string;
}
