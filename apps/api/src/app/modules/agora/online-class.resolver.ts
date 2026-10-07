import { BadRequestException, UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { User } from '../auth/entities/user.entity';
import { UserRole } from '../auth/enums/user-role.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JoinOnlineClassResult } from './dto/join-online-class.dto';
import { OnlineClassUsage } from './dto/online-class-usage.dto';
import { OnlineClassPresenceService } from './online-class-presence.service';
import { OnlineClassService } from './online-class.service';

@Resolver()
export class OnlineClassResolver {
  constructor(
    private readonly onlineClassService: OnlineClassService,
    private readonly presenceService: OnlineClassPresenceService,
  ) {}

  @Query(() => OnlineClassUsage, {
    name: 'onlineClassUsage',
    description:
      'Agora RTC time for one class. Closed seconds are leave durations; a drop and rejoin are separate stretches and the gap is excluded. Minutes are seconds / 60, not rounded up.',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  onlineClassUsage(@Args('sessionId', { type: () => ID }) sessionId: string): Promise<OnlineClassUsage> {
    const id = Number(sessionId);
    if (!Number.isInteger(id) || id <= 0) {
      throw new BadRequestException('Invalid session id');
    }
    return this.presenceService.usage(id);
  }

  @Mutation(() => JoinOnlineClassResult, {
    name: 'joinOnlineClass',
    description: 'Issue Agora tokens so a tutor or enrolled student can join an online class',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT, UserRole.TUTOR)
  joinOnlineClass(
    @CurrentUser() user: User,
    @Args('sessionId', { type: () => ID }) sessionId: string,
  ): Promise<JoinOnlineClassResult> {
    return this.onlineClassService.join(user, sessionId);
  }

  @Mutation(() => Boolean, {
    name: 'endOnlineClass',
    description: 'End a running online class for everyone. Only the session tutor can do this.',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TUTOR)
  endOnlineClass(
    @CurrentUser() user: User,
    @Args('sessionId', { type: () => ID }) sessionId: string,
  ): Promise<boolean> {
    return this.onlineClassService.end(user, sessionId);
  }
}
