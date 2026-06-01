import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { User } from '../../auth/entities/user.entity';
import { SaveTutorOfferingRateCardInput } from '../dto/save-tutor-offering-rate-card.input';
import { TutorOfferingRateCard } from '../dto/tutor-offering-rate-card.dto';
import { TutorRateCardService } from '../services/tutor-rate-card.service';

@Resolver()
export class TutorRateCardMutationResolver {
  constructor(private readonly tutorRateCardService: TutorRateCardService) {}

  @Mutation(() => TutorOfferingRateCard, {
    description: 'Save or update rate card for one of the authenticated tutor offerings',
  })
  @UseGuards(JwtAuthGuard)
  async saveMyTutorOfferingRateCard(
    @CurrentUser() user: User,
    @Args('input') input: SaveTutorOfferingRateCardInput,
  ): Promise<TutorOfferingRateCard> {
    return this.tutorRateCardService.saveForTutorUser(user.id, input);
  }
}
