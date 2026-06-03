import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { User } from '../../auth/entities/user.entity';
import { SaveMyTutorCalendarInput } from '../dto/save-my-tutor-calendar.input';
import { TutorCalendar } from '../entities/tutor-calendar.entity';
import { TutorCalendarService } from '../services/tutor-calendar.service';

@Resolver(() => TutorCalendar)
export class TutorCalendarResolver {
  constructor(private readonly tutorCalendarService: TutorCalendarService) {}

  @Query(() => [TutorCalendar], {
    description:
      'Available teaching slots for the authenticated tutor within a date range',
  })
  @UseGuards(JwtAuthGuard)
  async myTutorCalendar(
    @CurrentUser() user: User,
    @Args('from') from: Date,
    @Args('to') to: Date,
  ): Promise<TutorCalendar[]> {
    return this.tutorCalendarService.getMyCalendar(user.id, from, to);
  }

  @Query(() => Date, {
    nullable: true,
    description:
      'Latest available slot start (IST) for the authenticated tutor, or null if none',
  })
  @UseGuards(JwtAuthGuard)
  async myTutorCalendarUpdatedTill(
    @CurrentUser() user: User,
  ): Promise<Date | null> {
    return this.tutorCalendarService.getLatestAvailabilityStartForTutor(user.id);
  }

  @Mutation(() => [TutorCalendar], {
    description:
      'Replace available slots within range for the authenticated tutor',
  })
  @UseGuards(JwtAuthGuard)
  async saveMyTutorCalendar(
    @CurrentUser() user: User,
    @Args('input') input: SaveMyTutorCalendarInput,
  ): Promise<TutorCalendar[]> {
    return this.tutorCalendarService.saveMyCalendar(user.id, input);
  }
}
