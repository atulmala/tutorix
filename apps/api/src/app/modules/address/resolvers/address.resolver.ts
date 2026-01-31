import { Resolver, Query, Mutation, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AddressEntity } from '../entities/address.entity';
import { AddressService } from '../services/address.service';
import { CreateAddressInput } from '../dto/create-address.input';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../auth/entities/user.entity';
import { TutorService } from '../../tutor/services/tutor.service';

@Resolver(() => AddressEntity)
export class AddressResolver {
  constructor(
    private readonly addressService: AddressService,
    private readonly tutorService: TutorService,
  ) {}

  /**
   * Mutation: Create address for tutor
   * Requires authentication and user must be a tutor
   */
  @Mutation(() => AddressEntity, {
    description: 'Create an address for the authenticated tutor',
  })
  @UseGuards(JwtAuthGuard)
  async createTutorAddress(
    @CurrentUser() user: User,
    @Args('input') input: CreateAddressInput,
  ): Promise<AddressEntity> {
    // Find tutor by user ID
    const tutor = await this.tutorService.findByUserId(user.id);

    if (!tutor) {
      throw new Error('Tutor profile not found for this user');
    }

    return this.addressService.createAddressForTutor(tutor.id, input);
  }

  /**
   * Query: Get address by ID
   */
  @Query(() => AddressEntity, {
    name: 'address',
    nullable: true,
    description: 'Get address by ID',
  })
  async getAddress(@Args('id', { type: () => ID }) id: number): Promise<AddressEntity> {
    return this.addressService.findOne(id);
  }
}
