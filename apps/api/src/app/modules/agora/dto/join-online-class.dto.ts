import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class OnlineClassRosterMember {
  @Field(() => Int)
  userId!: number;

  @Field()
  name!: string;
}

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

  /**
   * True only for the session tutor. Students still receive a writer token so
   * Fastboard can sync the room, then the client locks drawing.
   */
  @Field()
  whiteboardWritable!: boolean;

  @Field()
  tutorName!: string;

  @Field()
  subjectName!: string;

  @Field(() => [OnlineClassRosterMember])
  participants!: OnlineClassRosterMember[];
}
