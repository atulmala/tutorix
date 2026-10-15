import { Query, Resolver } from '@nestjs/graphql';
import { ClassPricingSettingsEntity } from '../entities/class-pricing-settings.entity';
import { ClassPricingSettingsService } from '../services/class-pricing-settings.service';

@Resolver()
export class ClassPricingSettingsResolver {
  constructor(
    private readonly classPricingSettingsService: ClassPricingSettingsService,
  ) {}

  @Query(() => ClassPricingSettingsEntity, {
    description:
      'Platform class pricing rules (minimum rates, commission slabs, per-participant fee)',
  })
  async classPricingSettings(): Promise<ClassPricingSettingsEntity> {
    return this.classPricingSettingsService.getSettings();
  }
}
