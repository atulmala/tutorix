import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { User } from '../../auth/entities/user.entity';
import { UserRole } from '../../auth/enums/user-role.enum';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import {
  BookTutorClassResult,
  StudentBookedClassSession,
  TutorBookableSlot,
} from '../dto/tutor-class-session.dto';
import { ClassSessionDeliveryModeEnum } from '../enums/class-session-delivery-mode.enum';
import { TutorClassSessionService } from '../services/tutor-class-session.service';

@Resolver()
export class TutorClassSessionResolver {
  constructor(private readonly classSessionService: TutorClassSessionService) {}

  @Query(() => [TutorBookableSlot], {
    name: 'tutorBookableSlots',
    description: 'Future 1-hour slots a student can book for a tutor offering',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  async tutorBookableSlots(
    @CurrentUser() user: User,
    @Args('tutorId', { type: () => ID }) tutorId: number,
    @Args('offeringId', { type: () => ID }) offeringId: number,
    @Args('deliveryMode', { type: () => ClassSessionDeliveryModeEnum })
    deliveryMode: ClassSessionDeliveryModeEnum,
    @Args('from') from: Date,
    @Args('to') to: Date,
  ): Promise<TutorBookableSlot[]> {
    return this.classSessionService.listBookableSlots(
      user,
      tutorId,
      offeringId,
      deliveryMode,
      from,
      to,
    );
  }

  @Query(() => [StudentBookedClassSession], {
    name: 'studentBookedClassSessions',
    description: 'Confirmed 1-hour classes for the signed-in student',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  async studentBookedClassSessions(
    @CurrentUser() user: User,
    @Args('from') from: Date,
    @Args('to') to: Date,
  ): Promise<StudentBookedClassSession[]> {
    return this.classSessionService.listBookedSessions(user, from, to);
  }

  @Mutation(() => BookTutorClassResult, {
    name: 'bookTutorClass',
    description: 'Book one 1-hour class and pay from the student wallet',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  async bookTutorClass(
    @CurrentUser() user: User,
    @Args('tutorCalendarId', { type: () => ID }) tutorCalendarId: number,
    @Args('offeringId', { type: () => ID }) offeringId: number,
    @Args('deliveryMode', { type: () => ClassSessionDeliveryModeEnum })
    deliveryMode: ClassSessionDeliveryModeEnum,
  ): Promise<BookTutorClassResult> {
    return this.classSessionService.bookTutorClass(
      user,
      tutorCalendarId,
      offeringId,
      deliveryMode,
    );
  }
}
