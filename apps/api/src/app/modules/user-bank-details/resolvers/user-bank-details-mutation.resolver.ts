import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { User } from '../../auth/entities/user.entity';
import { SaveUserBankDetailsInput } from '../dto/save-user-bank-details.input';
import { UserBankDetails } from '../dto/user-bank-details.dto';
import { UserBankDetailsService } from '../services/user-bank-details.service';

@Resolver()
export class UserBankDetailsMutationResolver {
  constructor(private readonly userBankDetailsService: UserBankDetailsService) {}

  @Mutation(() => UserBankDetails, {
    description: 'Save or update bank details for the authenticated user',
  })
  @UseGuards(JwtAuthGuard)
  async saveMyBankDetails(
    @CurrentUser() user: User,
    @Args('input') input: SaveUserBankDetailsInput,
  ): Promise<UserBankDetails> {
    return this.userBankDetailsService.saveForUser(user.id, input);
  }
}
