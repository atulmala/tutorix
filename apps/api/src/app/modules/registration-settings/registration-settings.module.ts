import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegistrationSettingsEntity } from './entities/registration-settings.entity';
import { RegistrationSettingsResolver } from './resolvers/registration-settings.resolver';
import { RegistrationSettingsService } from './services/registration-settings.service';

@Module({
  imports: [TypeOrmModule.forFeature([RegistrationSettingsEntity])],
  providers: [RegistrationSettingsService, RegistrationSettingsResolver],
  exports: [RegistrationSettingsService],
})
export class RegistrationSettingsModule {}
