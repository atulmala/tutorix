import { Query, Resolver } from '@nestjs/graphql';
import { RegistrationSettingsEntity } from '../entities/registration-settings.entity';
import { RegistrationSettingsService } from '../services/registration-settings.service';

@Resolver()
export class RegistrationSettingsResolver {
  constructor(
    private readonly registrationSettingsService: RegistrationSettingsService,
  ) {}

  @Query(() => RegistrationSettingsEntity, {
    description:
      'Public registration enable/disable flags for signup UIs (no auth)',
  })
  async registrationSettings(): Promise<RegistrationSettingsEntity> {
    return this.registrationSettingsService.getSettings();
  }
}
