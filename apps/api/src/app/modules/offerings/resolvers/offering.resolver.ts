import { Resolver, Query } from '@nestjs/graphql';
import { OfferingEntity } from '../entities/offering.entity';
import { OfferingService } from '../services/offering.service';

@Resolver(() => OfferingEntity)
export class OfferingResolver {
  constructor(private readonly offeringService: OfferingService) {}

  @Query(() => [OfferingEntity], {
    name: 'offerings',
    description: 'Get full offering tree for tutor offering selection (catalog)',
  })
  async offerings(): Promise<OfferingEntity[]> {
    return this.offeringService.findAll();
  }
}
