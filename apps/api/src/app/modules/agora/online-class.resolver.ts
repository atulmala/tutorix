import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { User } from '../auth/entities/user.entity';
import { UserRole } from '../auth/enums/user-role.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JoinOnlineClassResult } from './dto/join-online-class.dto';
import { OnlineClassService } from './online-class.service';

@Resolver()
export class OnlineClassResolver {
  constructor(private readonly onlineClassService: OnlineClassService) {}

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
