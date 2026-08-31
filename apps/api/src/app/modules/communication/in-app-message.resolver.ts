import { Args, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../auth/entities/user.entity';
import { InAppMessageEntity } from './entities/in-app-message.entity';
import { InAppMessageService } from './in-app-message.service';
import { CommunicationEvent } from './enums/communication-event.enum';
import { OnScreenCopy } from './dto/on-screen-copy.dto';

@Resolver()
export class InAppMessageResolver {
  constructor(private readonly inAppMessageService: InAppMessageService) {}

  @Query(() => [InAppMessageEntity], {
    description: 'On-screen messages persisted for the signed-in user',
  })
  @UseGuards(JwtAuthGuard)
  async myInAppMessages(
    @CurrentUser() user: User,
    @Args('event', { type: () => CommunicationEvent, nullable: true })
    event?: CommunicationEvent,
  ): Promise<InAppMessageEntity[]> {
    return this.inAppMessageService.listForUser(user.id, event);
  }

  @Query(() => OnScreenCopy, {
    description:
      'Admin-configured on-screen copy for an event, if that channel is enabled',
  })
  @UseGuards(JwtAuthGuard)
  async onScreenCopy(
    @CurrentUser() user: User,
    @Args('event', { type: () => CommunicationEvent })
    event: CommunicationEvent,
  ): Promise<OnScreenCopy> {
    return this.inAppMessageService.onScreenCopy(user, event);
  }
}
