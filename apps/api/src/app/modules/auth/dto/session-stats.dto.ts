import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class SessionStatsByPlatform {
  @Field()
  web: number;

  @Field()
  ios: number;

  @Field()
  android: number;
}

@ObjectType()
export class SessionStats {
  @Field({ description: 'Total active sessions (logged in, token not expired)' })
  total: number;

  @Field({
    description:
      'Sessions with activity in last 5 minutes (API call or heartbeat)',
  })
  active: number;

  @Field({
    description:
      'Sessions with no activity in last 5 minutes (logged in but idle)',
  })
  inactive: number;

  @Field(() => SessionStatsByPlatform, {
    description: 'Session count by platform (web, ios, android)',
  })
  byPlatform: SessionStatsByPlatform;
}
