import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AdminEmailStatus {
  @Field({ description: 'Active delivery backend: ses or console' })
  provider: string;

  @Field(() => String, { nullable: true, description: 'Verified SES from address' })
  fromEmail: string | null;

  @Field({ description: 'Display name used in From header' })
  fromName: string;

  @Field({ description: 'AWS region used for SES' })
  region: string;

  @Field({ description: 'True when SES_FROM_EMAIL is set' })
  configured: boolean;
}
