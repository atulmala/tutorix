import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class SaveMyTutorCalendarInput {
  @Field()
  rangeStart: Date;

  @Field()
  rangeEnd: Date;

  @Field(() => [Date], {
    description: 'Available slot start times (UTC) within the range to persist',
  })
  slotStarts: Date[];
}
