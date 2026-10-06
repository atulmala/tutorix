import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class JoinOnlineClassResult {
  @Field()
  appId!: string;

  @Field()
  channelName!: string;

  @Field()
  token!: string;

  @Field()
  rtmToken!: string;

  @Field(() => Int)
  uid!: number;

  @Field()
  expiresAt!: Date;

  @Field()
  warnAt!: Date;

  @Field()
  scheduledEnd!: Date;

  @Field(() => String, { nullable: true })
  whiteboardAppIdentifier?: string | null;

  @Field(() => String, { nullable: true })
  whiteboardRegion?: string | null;

  @Field(() => String, { nullable: true })
  whiteboardRoomUuid?: string | null;

  @Field(() => String, { nullable: true })
  whiteboardRoomToken?: string | null;

  @Field(() => String, { nullable: true })
  whiteboardError?: string | null;
}
