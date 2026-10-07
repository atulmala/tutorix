import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql';
import { UserRole } from '../../auth/enums/user-role.enum';

@ObjectType()
export class OnlineClassParticipantUsage {
  @Field(() => Int)
  userId!: number;

  @Field()
  name!: string;

  @Field(() => UserRole)
  role!: UserRole;

  /** Sum of Agora leave durations for this participant. Gaps are excluded. */
  @Field(() => Int)
  closedSeconds!: number;

  /** Seconds since joinedAt for a stretch whose leave has not arrived yet. */
  @Field(() => Int)
  provisionalSeconds!: number;

  /** closedSeconds / 60, not rounded up. */
  @Field(() => Float)
  closedMinutes!: number;

  /** provisionalSeconds / 60, not rounded up. */
  @Field(() => Float)
  provisionalMinutes!: number;

  @Field(() => Int)
  joinCount!: number;
}

@ObjectType()
export class OnlineClassUsage {
  @Field(() => ID)
  sessionId!: number;

  @Field(() => Int)
  closedSeconds!: number;

  /** closedSeconds / 60, not rounded up. */
  @Field(() => Float)
  closedMinutes!: number;

  @Field(() => [OnlineClassParticipantUsage])
  participants!: OnlineClassParticipantUsage[];
}
